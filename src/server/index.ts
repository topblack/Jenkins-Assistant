import { GitHubWebhookBroker } from './GitHubWebhookBroker';
import { JenkinsAssistant } from './JenkinsAssistant';

enum Mode {
    Default, Test, JenkinsAssistant, GitHubWebHook
}

let port: number = 80;
let mode: Mode = Mode.Default;

if (process.argv[2] === 'test') {
    mode = Mode.Test;
} else if (process.argv[2] === 'jenkins') {
    mode = Mode.JenkinsAssistant;
} else if (process.argv[2] === 'github') {
    mode = Mode.GitHubWebHook;
}

if (mode === Mode.Test) {
    console.info('Test mode');
} else if (mode === Mode.JenkinsAssistant) {
    new JenkinsAssistant().serve(port);
} else if (mode === Mode.GitHubWebHook) {
    new GitHubWebhookBroker().serve(port);
} else {
    console.info(process.argv[0] + ' ' + process.argv[1] + ' [test | jenkins | github]');
}
