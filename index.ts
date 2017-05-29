const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const Client = require('node-rest-client').Client;
const client = new Client();

const RULES_DIR = 'rules';
const GITHUB_BROKER = 'http://shdev.scienceaccelerated.com:8081/consumers/chemjenkins';
const restClientArgs = {
    requestConfig: {timeout: 1000},
    responseConfig: {timeout: 2000}
}

const enum RuleType {
    watchThenTrigger
}

interface BranchFilter {
    include: string[],
    exclude: string[]
}

interface RepoBranches {
    repository: string,
    branches: BranchFilter
}

interface Rule {
    name: string,
    ruleType: RuleType,
    branchesToWatch: RepoBranches[]
}

interface JobTrigger {
    jobName: string
}

interface WatchThenTriggerRule extends Rule {
    triggerJobs: JobTrigger[]
}

class JenkinsAssistant {
    private rules: Rule[] = [];

    private eventIds: string[] = [];

    constructor() {
        this.initRules();
    }

    private listenToAdmin() {
        let app = express();
        app.use(bodyParser.json());
        app.get('/rules', this.handleGetRules)
            .post('/rules', this.handlePostRule)
            .get('/rules/:name', this.handleGetRule)
            .delete('/rules/:name', this.handleDeleteRule);
        app.listen(8081);
    }

    public work() {
        this.listenToAdmin();
        this.getExternalTasks();
        this.handleOneTask();
        console.info('I am working');
    }

    /**
     * If I am busy with existing tasks, wait 2*n seconds before getting new tasks
     */
    private getExternalTasks = () => {
        if (this.eventIds.length > 0) {
            setTimeout(this.getExternalTasks, this.eventIds.length * 2000);
        } else {
            client.get(GITHUB_BROKER + '/events/', restClientArgs, this.handleReceivedEvents);
        }
    }

    /**
     * If I have no tasks in the queue to do, wait 1 second then handling a new task
     */
    private handleOneTask = () => {
        if (this.eventIds.length > 0) {
            var evtUrl = GITHUB_BROKER + '/events/' + this.eventIds[0];
        } else {
            setTimeout(this.handleOneTask, 1000);
        }
    }

    /**
     * Add the received events to the queue and schedule another poll
     */
    private handleReceivedEvents = (data, response) => {
        console.info(data);
        console.info(response);
        /*
        for (let i = 0; i < ids.length; i++) {
            let found = false;
            for (let j = 0; j < this.eventIds.length; j++) {
                if (this.eventIds[j] == ids[i]) {
                    found = true;
                    break;
                }
            }

            if (!found) {
                this.eventIds.push(ids[i]);
            }
        }
*/
        setTimeout(this.getExternalTasks, 5000);
    }

    private handleGetEventResult = (res) => {
        const { statusCode } = res;
        if (statusCode != 200) {
            console.error(`http get error ${statusCode}`);
        } else {
            res.setEncoding('utf8');
            let rawData = '';
            res.on('data', (chunk) => { rawData += chunk; });
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(rawData);
                    this.handleReceivedEvent(parsedData);
                    console.log(parsedData);
                } catch (e) {
                    console.error(e.message);
                }
            });
        }
    }

    private handleReceivedEvent = (evt) => {
        const { ref, repository } = evt;
        let matchedRules: Rule[] = [];
        if (ref && repository) {
            for (let i = 0; i < this.rules.length; i++) {
                let rule = this.rules[i];
                let found = false;
                for (let b = 0; b < rule.branchesToWatch.length; b++) {
                    let rb = rule.branchesToWatch[b];
                    for (let bi = 0; bi < rb.branches.include.length; bi++) {
                        if (ref == rb.branches.include[bi]) {
                            found = true;
                        }
                        // TODO handle exclude case
                    }
                }
                if (found) {
                    matchedRules.push(rule);
                }
            }
        }

        for (let i = 0; i < matchedRules.length; i++) {
            if (matchedRules[i].ruleType == RuleType.watchThenTrigger) {
                let rule: WatchThenTriggerRule = <WatchThenTriggerRule>matchedRules[i];
                for (let j = 0; j < rule.triggerJobs.length; j++) {
                    let trigger: JobTrigger = rule.triggerJobs[j];
                    console.info(trigger.jobName);
                }
            }
        }
    }

    private initRules() {
        let ruleNames: string[] = fs.readdirSync(RULES_DIR);
        for (let i = 0; i < ruleNames.length; i++) {
            let ruleFilePath = path.join(RULES_DIR, ruleNames[i]);
            let ruleContent = fs.readFileSync(ruleFilePath, 'utf-8');
            this.rules.push(JSON.parse(ruleContent));
        }
    }

    private handleGetRules = (req, res) => {
        res.send(JSON.stringify(this.rules));
    }

    private handlePostRule = (req, res) => {
        let newRule: Rule = req.body;
        for (let i = 0; i < this.rules.length; i++) {
            let rule: Rule = this.rules[i];
            if (rule.name == newRule.name) {
                res.sendStatus(409);
                return;
            }
        }
        fs.writeFileSync(path.join(RULES_DIR, newRule.name + '.json'), JSON.stringify(req.body));
    }

    private handleGetRule = (req, res) => {
        let targetRuleFile: string = path.join(RULES_DIR, req.params.name + '.json');
        if (!fs.existsSync(targetRuleFile)) {
            res.sendStatus(404);
        } else {
            let ruleContent: string = fs.readFileSync(targetRuleFile, 'utf-8');
            res.send(ruleContent);
        }
    }

    private handleDeleteRule = (req, res) => {
        let targetRuleFile: string = path.join(RULES_DIR, req.params.name + '.json');
        if (fs.existsSync(targetRuleFile)) {
            fs.unlinkSync(targetRuleFile);
        }
        let idToSplice = -1;
        for (let i = 0; i < this.rules.length; i++) {
            let rule: Rule = this.rules[i];
            if (rule.name == req.params.name) {
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


if (!process.env.JENKINS_URL) {
    console.error('Please tell me where is my boss Jenkins via environment variable JENKINS_URL.');
    process.exit(-1);
}

new JenkinsAssistant().work();