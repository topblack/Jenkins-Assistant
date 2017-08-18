const exec = require('child_process').execSync;
const fs = require('fs');
const http = require('http');

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

    public deleteJob = (jobPath: string) => {
        this.execute('delete-job ' + jobPath);
    }

    public listJobs = (parentPath: string) => {
        let result = this.execute('list-jobs ' + parentPath);
        return result.split('\n');
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
