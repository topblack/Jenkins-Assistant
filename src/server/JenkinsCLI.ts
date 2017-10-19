const exec = require('child_process').execSync;
const fs = require('fs');
const http = require('http');
const path = require('path');

export interface JobParameter {
    name: string;
    value: string;
}

export class JenkinsCLI {
    private url: string;

    private auth: string;

    constructor (jenkinsUrl: string, authToken: string) {
        this.url = jenkinsUrl;
        this.auth = authToken;
    }

    public help = () => {
        this.execute('help');
    }

    public createPipeline(jobPath: string, repo: string, branch: string, pipelinePath: string) {
        let template = fs.readFileSync(path.join('jenkins_templates', 'pipeline.xml'), 'utf-8');

        template = template.replace(/%pipelineRepo%/g, repo);
        template = template.replace(/%pipelineBranch%/g, branch);
        template = template.replace(/%pipelinePath%/g, pipelinePath);
        try {
            this.execute('create-job ' + jobPath, template);
        } catch (exception) {
            this.execute('create-job ' + jobPath, template);
        }
    }

    public createFolder(jobPath: string, displayName: string, description: string) {
        let template = fs.readFileSync(path.join('jenkins_templates', 'folder.xml'), 'utf-8');
        if (!displayName) {
            let names = jobPath.split('/');
            displayName = names[names.length - 1];
        }
        if (!description) {
            description = jobPath;
        }

        template = template.replace(/%displayName%/g, displayName);
        template = template.replace(/%description%/g, description);
        try {
            this.execute('create-job ' + jobPath, template);
        } catch (exception) {
            this.execute('create-job ' + jobPath, template);
        }
    }

    public deleteFolder(jobPath: string) {
        this.deleteJob(jobPath);
    }

    public deleteJob = (jobPath: string) => {
        this.execute('delete-job ' + jobPath);
    }

    public listJobs = (parentPath: string) => {
        let result = this.execute('list-jobs ' + parentPath);
        return result.split('\n');
    }

    public getVersion = () => {
        return this.execute('version');
    }

    public buildJob = (jobName: string, parameters?: string[]) => {
        let command = 'build ' + jobName;
        if (parameters && parameters.length > 0) {
            for (let i = 0; i < parameters.length; i++) {
                command = command + ' -p "' + parameters[i] + '"';
            }
        }

        this.execute(command);
    }

    private execute = (jenkinsCmd: string, inputText?: string) => {
        let command = 'java -jar jenkins-cli.jar -s ' + this.url + ' -auth ' + this.auth + ' ' + jenkinsCmd;
        console.info(command);

        let output = exec(command, { input: inputText, encoding: 'utf-8' });

        return output;
    }
}
