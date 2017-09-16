const io = require('socket.io-client');

import { JenkinsCLI } from './JenkinsCLI';
import { scheduler } from './Scheduler';
import { ServiceStatusReportJob } from './jd/ServiceStatusReportJob';
import { logger } from './Logger';

const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const rest = require('restler');

const app = express();

const RULES_DIR = 'rules';

enum RuleType {
    watchThenTrigger
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
}

interface JobTriggerParameter {
    name: string;
    value: string;
}

interface WatchThenTriggerRule extends Rule {
    triggerJobs: JobTrigger[];
}

interface Event {
    repository: Repository;
}

interface PushEvent extends Event {
    ref: string;
    created: boolean;
    deleted: boolean;
}

interface PullRequestEvent extends Event {
    action: string;
}

interface Repository {
    full_name: string;
}

export class JenkinsAssistant {
    private rules: Rule[] = [];

    private jenkins: JenkinsCLI;

    private adminEmail: string;

    private brokerUrl: string;

    constructor() {
        this.initRules();

        let token = 'qinll:d8f07b93412618d4bf87d905cceb3d8c';
        let url = 'http://chemjenkins.perkinelmer.net:8080';

        this.jenkins = new JenkinsCLI(url, token);
        this.adminEmail = 'leon.qin@perkinelmer.com';
        this.brokerUrl = 'http://shdev.scienceaccelerated.com:8080/chemjenkins';
    }

    private listenToAdmin(port: number) {
        app.use(bodyParser.json());
        app.get('/rules', this.handleGetRules)
            .post('/rules', this.handlePostRule)
            .get('/rules/:name', this.handleGetRule)
            .delete('/rules/:name', this.handleDeleteRule);
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

        app.listen(port);
        logger.info('Listening port ' + port);
    }

    public serve = (port: number) => {
        this.listenToAdmin(port);

        //scheduler.schedule(new ServiceStatusReportJob('leon.qin@perkinelmer.com', '* 7,19 * * *'));
    }

    /**
     * Handles the push event.
     */
    private handlePushEvent = (push: PushEvent) => {
        if (!push) {
            logger.warn('Not a push event');
            return;
        }

        // Check if the branch mentioned in the push event is covered in the defined rule.
        let matchedRules: Rule[] = [];
        for (let i = 0; i < this.rules.length; i++) {
            let rule = this.rules[i];
            if (this.isBranchWatchedByRule(push.ref, rule)) {
                console.info(`Found rule ${rule.name}`);
                matchedRules.push(rule);
            }
        }

        if (matchedRules.length === 0) {
            logger.info('No rules found for the received event.');
        }

        // Trigger the configured jobs.
        for (let i = 0; i < matchedRules.length; i++) {
            if (matchedRules[i].ruleType === RuleType[RuleType.watchThenTrigger]) {
                let rule: WatchThenTriggerRule = matchedRules[i] as WatchThenTriggerRule;
                for (let j = 0; j < rule.triggerJobs.length; j++) {
                    let trigger: JobTrigger = rule.triggerJobs[j];
                    let parameters: string[] = this.composeTriggerParameters(trigger.parameters);
                    logger.info(`Triggering job ${trigger.jobName} ${parameters}`);

                    this.jenkins.buildJob(trigger.jobName, parameters);
                }
            }
        }
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
    private isBranchWatchedByRule = (branchName: string, rule: Rule): boolean => {
        let found = false;
        for (let b = 0; b < rule.branchesToWatch.length; b++) {
            let rb = rule.branchesToWatch[b];
            for (let be = 0; be < rb.branches.excludes.length; be++) {
                if (branchName === rb.branches.excludes[be]) {
                    return false;
                }
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
        if (!fs.existsSync(RULES_DIR)) {
            fs.mkdirSync(RULES_DIR);
        }

        let ruleNames: string[] = fs.readdirSync(RULES_DIR);
        for (let i = 0; i < ruleNames.length; i++) {
            if (ruleNames[i].indexOf('.') === 0 || ruleNames[i].indexOf('.json') < 0) {
                continue;
            }
            let ruleFilePath: string = path.join(RULES_DIR, ruleNames[i]);
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
        fs.writeFileSync(path.join(RULES_DIR, newRule.name + '.json'), JSON.stringify(req.body));
        res.sendStatus(201);
    }

    private handleGetRule = (req: any, res: any) => {
        let targetRuleFile: string = path.join(RULES_DIR, req.params.name + '.json');
        if (!fs.existsSync(targetRuleFile)) {
            res.sendStatus(404);
        } else {
            let ruleContent: string = fs.readFileSync(targetRuleFile, 'utf-8');
            res.send(ruleContent);
        }
    }

    private handleDeleteRule = (req: any, res: any) => {
        let targetRuleFile: string = path.join(RULES_DIR, req.params.name + '.json');
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
}
