import { JobDescription } from './JobDescription';
import { logger } from '../Logger';
import { mailer } from '../Mailer';

export class ServiceStatusReportJob implements JobDescription {
    brief: string = 'Reporting Service Status';
    cron: string = '';
    email: string = '';

    constructor(reportToEmail: string, scheduleCron: string) {
        this.email = reportToEmail;
        this.cron = scheduleCron;
    }

    execute(): void {
        logger.info('Sending email to ' + this.email);
        mailer.sendMail(this.email, 'Jenkins Assistant is running.', 'Jenkins Assistant is running.');
    }
}