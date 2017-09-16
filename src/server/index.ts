import { EventBroker } from './EventBroker';
import { JenkinsAssistant } from './JenkinsAssistant';

enum Mode {
    Default, Test, JenkinsAssistant, EventBroker
}

let port: number = 80;
let mode: Mode = Mode.Default;

if (process.argv[2] === 'test') {
    mode = Mode.Test;
} else if (process.argv[2] === 'jenkins') {
    mode = Mode.JenkinsAssistant;
} else if (process.argv[2] === 'broker') {
    mode = Mode.EventBroker;
}

if (process.env.JENKINS_ASSISTANT_PORT) {
    port = process.env.JENKINS_ASSISTANT_PORT;
}

if (mode === Mode.Test) {
    console.info('Test mode');
} else if (mode === Mode.JenkinsAssistant) {
    new JenkinsAssistant().serve(port);
} else if (mode === Mode.EventBroker) {
    new EventBroker().serve(port);
} else {
    console.info(process.argv[0] + ' ' + process.argv[1] + ' [test | jenkins | broker]');
}
