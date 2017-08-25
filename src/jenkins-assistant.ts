import { JenkinsCLI } from './jenkins-cli';

const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const rest = require('restler');

const RULES_DIR = 'rules';
const BREAK_PERIOD = 1000;

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

    private eventIds: string[] = [];

    private jenkins: JenkinsCLI;

    constructor() {
        this.initRules();
        console.info(process.env.JENKINS_URL);
        let urlSegs = process.env.JENKINS_URL.split('://');
        let protocol = urlSegs[0];
        let urlWithToken = urlSegs[1].split('@');
        let token = urlWithToken[0];
        let url = protocol + '://' + urlWithToken[1];

        this.jenkins = new JenkinsCLI(url, token);
    }

    private listenToAdmin(port: number) {
        let app = express();
        app.use(bodyParser.json());
        app.get('/rules', this.handleGetRules)
            .post('/rules', this.handlePostRule)
            .get('/rules/:name', this.handleGetRule)
            .delete('/rules/:name', this.handleDeleteRule);
        app.listen(port);
    }

    public test = () => {
        console.info('Run test...');
        this.listenToAdmin(82);
        //let jobName = 'testnestor';

        //this.jenkins.buildJob(jobName, ['configuration=Debug', 'notifyList=leon andrew jeff']);
    }

    public serve = (port: number) => {
        this.listenToAdmin(port);
        this.getExternalTasks();
        this.handleNextTask();
        console.info('I am working');
    }

    private getUrlEvents = () => {
        return process.env.GITHUB_BROKER_URL + '/events/';
    }

    private getUrlEvent = (id: string) => {
        return this.getUrlEvents() + id;
    }

    /**
     * If I am busy with existing tasks, wait 2*n seconds before getting new tasks
     */
    private getExternalTasks = () => {
        if (this.eventIds.length > 0) {
            console.info(`I am busy with the ${this.eventIds.length} tasks in my queue.`);
            setTimeout(this.getExternalTasks, this.eventIds.length * 2000);
        } else {
            rest.get(this.getUrlEvents()).on('success', this.handleReceivedEvents);
        }
    }

    /**
     * If I have no tasks in the queue to do, wait 1 second then handling a new task
     */
    private handleNextTask = () => {
        if (this.eventIds.length > 0) {
            let evtUrl = this.getUrlEvent(this.eventIds[0]);
            console.info(`Retrieving ${evtUrl}`);
            rest.get(evtUrl).on('success', this.handleReceivedOneEvent);
        } else {
            setTimeout(this.handleNextTask, BREAK_PERIOD);
        }
    }

    /**
     * Add the received events to the queue and schedule another poll
     */
    private handleReceivedEvents = (data: string[], response: any) => {
        let ids: string[] = data;
        for (let i = 0; i < ids.length; i++) {
            let found = false;
            for (let j = 0; j < this.eventIds.length; j++) {
                if (this.eventIds[j] === ids[i]) {
                    found = true;
                    break;
                }
            }

            if (!found) {
                this.eventIds.push(ids[i]);
            }
        }
        setTimeout(this.getExternalTasks, 5000);
    }

    /**
     * Finds matched rules and trigger the subsequent actions per rule.
     */
    private handleReceivedOneEvent = (evt: any) => {
        let push: PushEvent = evt as PushEvent;
        if (push) {
            this.handlePushEvent(push);
        }

        rest.del(this.getUrlEvent(this.eventIds[0])).on('success', this.handleEventDeleted)
    }

    /**
     * Handles the push event.
     */
    private handlePushEvent = (push: PushEvent) => {
        // Check if the branch mentioned in the push event is covered in the defined rule.
        let matchedRules: Rule[] = [];
        for (let i = 0; i < this.rules.length; i++) {
            let rule = this.rules[i];
            if (this.isBranchWatchedByRule(push.ref, rule)) {
                console.info(`Found rule ${rule.name}`);
                matchedRules.push(rule);
            }
        }

        // Trigger the configured jobs.
        for (let i = 0; i < matchedRules.length; i++) {
            if (matchedRules[i].ruleType === RuleType[RuleType.watchThenTrigger]) {
                let rule: WatchThenTriggerRule = matchedRules[i] as WatchThenTriggerRule;
                for (let j = 0; j < rule.triggerJobs.length; j++) {
                    let trigger: JobTrigger = rule.triggerJobs[j];
                    let parameters: string[] = this.composeTriggerParameters(trigger.parameters);
                    console.info(`Triggering job ${trigger.jobName} ${parameters}`);

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

    private handleEventDeleted = () => {
        console.info('Event deleted ' + this.eventIds[0]);
        this.eventIds.splice(0, 1);
        setTimeout(this.handleNextTask, BREAK_PERIOD);
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
