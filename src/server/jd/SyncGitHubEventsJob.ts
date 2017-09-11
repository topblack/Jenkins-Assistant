import { JobDescription } from './JobDescription';
import { logger } from '../Logger';

const rest = require('restler');

interface PushEvent extends Event {
    ref: string;
    created: boolean;
    deleted: boolean;
}

interface PullRequestEvent extends Event {
    action: string;
}

export class SyncGitHubEventsJob implements JobDescription {
    brief: string = 'Sync GitHub Events';
    cron: string = '';
    gitHubBrokerUrl: string = '';

    eventIds: string[] = [];
    events: Event[] = [];

    constructor(githubBrokerUrl: string) {
        this.gitHubBrokerUrl = githubBrokerUrl;
    }

    execute(): void {
        rest.get(this.getUrlEvents()).on('success', this.handleReceivedEvents);
    }

    private getUrlEvents = () => {
        return this.gitHubBrokerUrl + '/events/';
    }

    private getUrlEvent = (id: string) => {
        return this.getUrlEvents() + id;
    }

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
                let evtUrl = this.getUrlEvent(ids[i]);
                rest.get(evtUrl).on('success', this.handleReceivedOneEvent);
            }
        }
    }

    private handleReceivedOneEvent = (evt: any) => {
        let push: PushEvent = evt as PushEvent;
        if (push) {
            this.events.push(push);
        }
    }
}