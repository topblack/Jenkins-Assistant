const io = require('socket.io-client');

import { JenkinsCLI } from './JenkinsCLI';
import { scheduler } from './Scheduler';
import { ServiceStatusReportJob } from './jd/ServiceStatusReportJob';
import { logger, LOG_DIR } from './Logger';
import * as github from './GitHubAPI';

const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const rest = require('restler');

const app = express();

const DATA_DIR = 'data';

enum RuleType {
    triggerOnNewCommit,
    triggerOnPullRequestUpdate
}

interface BranchFilter {
    includes: string[];
    excludes: string[];
}

interface RepoBranches {
    repository: string;
    branches: BranchFilter;
}

interface Rule {
    name: string;
    ruleType: string;
    branchesToWatch: RepoBranches[];
}

interface JobTrigger {
    jobName: string;
    parameters: JobTriggerParameter[];
    options: JobTriggerOption;
}

interface JobTriggerOption {
    setCommitAuthor: string;
    setCommitBranch: string;
}

interface JobTriggerParameter {
    name: string;
    value: string;
}

interface TriggerRule extends Rule {
    triggerJobs: JobTrigger[];
}

export class JenkinsAssistant {
    private rules: Rule[] = [];

    private jenkins: JenkinsCLI;

    private adminEmail: string;

    private brokerUrl: string;

    private maxRetryAttempts: number;

    constructor(testMode?: boolean) {
        this.initRules();

        let token = process.env.JENKINS_TOKEN;
        let url = process.env.JENKINS_URL;

        this.jenkins = new JenkinsCLI(url, token, testMode);
        this.adminEmail = process.env.ADMIN_EMAIL;
        this.brokerUrl = process.env.GITHUB_BROKER_URL;
        this.maxRetryAttempts = 3;
    }

    private listenToAdmin(port: number) {
        app.use(bodyParser.json());
        app.get('/rules', this.handleGetRules)
            .post('/rules', this.handlePostRule)
            .get('/rules/:name', this.handleGetRule)
            .delete('/rules/:name', this.handleDeleteRule)
            .get('/logs', this.handleGetTodayLogs)
            .get('/logs/:date', this.handleGetLogs);
        app.use('/admin', express.static('ui'));

        let socket = io(this.brokerUrl);
        socket.on('connect', (sock: any) => {
            console.info('Connected');
        });
        socket.on('reconnect', (sock: any) => {
            console.info('Reconnected');
        });
        socket.on('disconnect', (sock: any) => {
            console.info('Disconnected');
        });
        socket.on('push', (data: any) => {
            try {
                this.handlePushEvent(data);
            } catch (error) {
                logger.error(error);
            }
        });
        socket.on('pull_request', (data: any) => {
            try {
                this.handlePullRequestEvent(data);
            } catch (error) {
                logger.error(error);
            }
        });

        app.listen(port);
        logger.info('Listening port ' + port);
    }

    public serve = (port: number) => {
        this.listenToAdmin(port);

        //scheduler.schedule(new ServiceStatusReportJob('leon.qin@perkinelmer.com', '* 7,19 * * *'));
    }

    private handlePullRequestEvent = (prEvent: github.PullRequestEvent) => {
        logger.info('Received a pull request event.');
        if (!prEvent) {
            logger.warn('Not a pull request event');
            return;
        }

        if (prEvent.action !== 'opened' && prEvent.action !== 'reopened' && prEvent.action !== 'synchronize') {
            // Not a pull request we want to handle. We only trigger events if a pull request is opened or edited or reopened
            logger.info(`Ignored pull request, because of action ${prEvent.action}`);
            return;
        }

        let pr: github.PullRequest = prEvent.pull_request;

        // Check if the branch mentioned in the pull request (pr) event is covered in the defined rule.
        let matchedRules: Rule[] = this.listMatchedRules(prEvent.repository.full_name, pr.head.ref);
        if (matchedRules.length === 0) {
            logger.warn('No rules found for the received pull request event.');
            return;
        }

        for (let i = 0; i < matchedRules.length; i++) {
            this.handleTriggerOnPullRequestChangeRule(matchedRules[i] as TriggerRule, pr);
        }
    }

    /**
     * Handles the push event.
     */
    private handlePushEvent = (push: github.PushEvent) => {
        logger.info('Received a push event.');

        if (!push) {
            logger.warn('Not a push event');
            return;
        }

        // Check if the branch mentioned in the push event is covered in the defined rule.
        let matchedRules: Rule[] = this.listMatchedRules(push.repository.full_name, push.ref);
        if (matchedRules.length === 0) {
            logger.info('No rules found for the received event.');
            return;
        }

        // Trigger the configured jobs.
        for (let i = 0; i < matchedRules.length; i++) {
            if (!push.created && !push.deleted) {
                this.handleTriggerOnNewCommitRule(matchedRules[i] as TriggerRule, push);
            } else if (push.created) {
                // create new job
            } else if (push.deleted) {
                // delete a job
            } else {
                // empty
            }
        }
    }

    private listMatchedRules(repoFullName: string, branchName: string) {
        let matchedRules: Rule[] = [];
        for (let i = 0; i < this.rules.length; i++) {
            let rule = this.rules[i];
            if (this.isBranchWatchedByRule(repoFullName, branchName, rule)) {
                matchedRules.push(rule);
            }
        }

        return matchedRules;
    }

    /**
     * Handles a full name of a repository. ownerName/repoName
     */
    private extractRepoNamesFromRules = (rule: Rule): [{ownerName: string, repoName: string}] => {
        let result: [{ownerName: string, repoName: string}] = [] as [{ownerName: string, repoName: string}];

        for (let repoBranch of rule.branchesToWatch) {
            let repoNames: string[] = repoBranch.repository.split('/')
            result.push({ownerName: repoNames[0], repoName: repoNames[1]});
        }

        return result;
    }

    private handleTriggerOnPullRequestChangeRule = (rule: TriggerRule, pr: github.PullRequest) => {
        if (!rule || (rule.ruleType !== RuleType[RuleType.triggerOnPullRequestUpdate])) {
            logger.warn(`Cannot handle the rule, a trigger on pull request rule is expected.`);
            return;
        }

        let githubApi: github.GitHubAPI = new github.GitHubAPI();

        githubApi.retrieveBuildTriggerInfo(this.extractRepoNamesFromRules(rule), pr)
            .then((triggerInfo: github.PullRequestTriggerInfo) => {
                this.triggerBuildWithPullRequestInfo(rule.triggerJobs, triggerInfo);
            }).catch((error: Error) => {
                logger.error(`Error occurred when handling pull request change event. ${error}`);
            });
    }

    private triggerBuildWithPullRequestInfo = (triggers: JobTrigger[], triggerInfo: github.PullRequestTriggerInfo) => {
        for (let trigger of triggers) {
            let parameters: string[] = this.composeTriggerParameters(trigger.parameters);

            for (let branch of triggerInfo.relatedBranches) {
                parameters.push(`branch-${branch.repoName}=${branch.branchName}`);
            }

            let rb = triggerInfo.repoBranch;
            parameters.push(`buildNamePrefix=${triggerInfo.requestor.login}`);
            parameters.push(`pullRequestUrl=${triggerInfo.pullRequestHtmlUrl}`);
            parameters.push(`pullRequestRef=${triggerInfo.hash}@${rb.branchName}@${rb.repoName}@${rb.ownerName}`);


            if (trigger.options.setCommitAuthor && trigger.options.setCommitAuthor.length > 0) {
                let emails = triggerInfo.requestor.email;

                if (emails.length > 0) {
                    parameters.push(`${trigger.options.setCommitAuthor}=${emails}`);
                }
            }

            let attempt = 1;
            let needRetry = false;

            while (attempt === 1 || needRetry) {
                logger.info(`Triggering job (attempt: ${attempt}) ${trigger.jobName} ${parameters}`);
                try {
                    needRetry = false;
                    this.jenkins.buildJob(trigger.jobName, parameters);
                } catch (error) {
                    logger.error(error);
                    needRetry = true;
                } finally {
                    attempt++;
                    if (attempt > this.maxRetryAttempts) {
                        needRetry = false;
                    }
                }
            }
        }
    }

    private handleTriggerOnNewCommitRule = (rule: TriggerRule, push: github.PushEvent) => {
        if (!rule || (rule.ruleType !== RuleType[RuleType.triggerOnNewCommit])) {
            logger.warn(`Cannot handle the rule, a trigger rule is expected.`);
            return;
        }

        for (let i = 0; i < rule.triggerJobs.length; i++) {
            let trigger: JobTrigger = rule.triggerJobs[i];
            let parameters: string[] = this.composeTriggerParameters(trigger.parameters);

            if (trigger.options.setCommitAuthor && trigger.options.setCommitAuthor.length > 0) {
                let emails = this.getRelatedAuthorEmailsFromPush(push);

                if (emails.length > 0) {
                    parameters.push(`${trigger.options.setCommitAuthor}=${emails}`);
                }
            }

            if (trigger.options.setCommitBranch && trigger.options.setCommitBranch.length > 0) {
                parameters.push(`${trigger.options.setCommitBranch}=${push.ref}`);
            }

            let attempt = 1;
            let needRetry = false;

            while (attempt === 1 || needRetry) {
                logger.info(`Triggering job (attempt: ${attempt}) ${trigger.jobName} ${parameters}`);
                try {
                    needRetry = false;
                    this.jenkins.buildJob(trigger.jobName, parameters);
                } catch (error) {
                    logger.error(error);
                    needRetry = true;
                } finally {
                    attempt++;
                    if (attempt > this.maxRetryAttempts) {
                        needRetry = false;
                    }
                }
            }
        }
    }

    private getRelatedAuthorEmailsFromPush = (push: github.PushEvent): string => {
        if (!push.commits) {
            return '';
        }

        let emails: string = '';
        for (let commit of push.commits) {
            if (!commit.author.email || emails.indexOf(commit.author.email) >= 0) {
                continue;
            }
            emails = ' ' + commit.author.email;
        }

        return emails.trim();
    }

    /**
     * Returns the parameter list with the format name1=value1&name2=value2
     */
    private composeTriggerParameters = (parameters: JobTriggerParameter[]) => {
        let result: string[] = [];

        if (!parameters) {
            return result;
        }

        for (let i = 0; i < parameters.length; i++) {
            result.push(parameters[i].name + '=' + parameters[i].value);
        }

        return result;
    }

    /**
     * Returns false if the branch is excluded (higher priority), returns true if the branch is included.
     */
    private isBranchWatchedByRule = (repoName: string, branchName: string, rule: Rule): boolean => {
        let found = false;
        for (let b = 0; b < rule.branchesToWatch.length; b++) {
            let rb = rule.branchesToWatch[b];

            if (rb.repository !== repoName) {
                continue;
            }

            for (let be = 0; be < rb.branches.excludes.length; be++) {
                if (branchName === rb.branches.excludes[be]) {
                    return false;
                }
            }

            // If no includes are defined explicitly, then consider this rule as include all.
            if (!rb.branches.includes || rb.branches.includes.length === 0) {
                return true;
            }

            for (let bi = 0; bi < rb.branches.includes.length; bi++) {
                if (branchName === rb.branches.includes[bi]) {
                    return true;
                }
            }
        }

        return false;
    }

    private initRules() {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR);
        }

        let ruleNames: string[] = fs.readdirSync(DATA_DIR);
        for (let i = 0; i < ruleNames.length; i++) {
            if (ruleNames[i].indexOf('.') === 0 || ruleNames[i].indexOf('.json') < 0) {
                continue;
            }
            let ruleFilePath: string = path.join(DATA_DIR, ruleNames[i]);
            let ruleContent = fs.readFileSync(ruleFilePath, 'utf-8');
            this.rules.push(JSON.parse(ruleContent));
        }
    }

    private handleGetRules = (req: any, res: any) => {
        res.send(JSON.stringify(this.rules));
    }

    private handlePostRule = (req: any, res: any) => {
        let newRule: Rule = req.body;
        console.info(JSON.stringify(req.body));
        for (let i = 0; i < this.rules.length; i++) {
            let rule: Rule = this.rules[i];
            if (rule.name === newRule.name) {
                res.sendStatus(409);
                return;
            }
        }

        this.rules.push(newRule);
        fs.writeFileSync(path.join(DATA_DIR, newRule.name + '.json'), JSON.stringify(req.body));
        res.sendStatus(201);
    }

    private handleGetRule = (req: any, res: any) => {
        let targetRuleFile: string = path.join(DATA_DIR, req.params.name + '.json');
        if (!fs.existsSync(targetRuleFile)) {
            res.sendStatus(404);
        } else {
            let ruleContent: string = fs.readFileSync(targetRuleFile, 'utf-8');
            res.send(ruleContent);
        }
    }

    private handleDeleteRule = (req: any, res: any) => {
        let targetRuleFile: string = path.join(DATA_DIR, req.params.name + '.json');
        if (fs.existsSync(targetRuleFile)) {
            fs.unlinkSync(targetRuleFile);
        }
        let idToSplice = -1;
        for (let i = 0; i < this.rules.length; i++) {
            let rule: Rule = this.rules[i];
            if (rule.name === req.params.name) {
                idToSplice = i;
                break;
            }
        }
        if (idToSplice >= 0) {
            this.rules.splice(idToSplice);
        }
        res.sendStatus(200);
    }

    private handleGetTodayLogs = (req: any, res: any) => {
        let now: Date = new Date();
        let dateText: string = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
        let logs: string = this.loadLogsInHtml(dateText);

        res.send(logs);
    }

    private handleGetLogs = (req: any, res: any) => {
        let logs: string = this.loadLogsInHtml(req.params.date);

        res.send(logs);
    }

    private loadLogsInHtml = (date: string) => {
        let targetRuleFile: string = path.join(LOG_DIR, `app.log.${date}`);

        if (fs.existsSync(targetRuleFile)) {
            return fs.readFileSync(targetRuleFile, 'utf-8').replace(/\n/g, '<br/>');
        }

        return 'None';
    }
}
