import { JobDescription } from './JobDescription';
import { logger } from '../Logger';

export class CheckJenkinsStatusJob implements JobDescription {
    brief: string = 'Check Jenkins Status';
    cron: string = '';
    execute(): void {
    }
}