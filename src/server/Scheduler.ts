const nodescheduler = require('node-schedule');

import { logger } from './Logger';
import { JobDescription } from './jd/JobDescription';

/*
*    *    *    *    *    *
┬    ┬    ┬    ┬    ┬    ┬
│    │    │    │    │    |
│    │    │    │    │    └ day of week (0 - 7) (0 or 7 is Sun)
│    │    │    │    └───── month (1 - 12)
│    │    │    └────────── day of month (1 - 31)
│    │    └─────────────── hour (0 - 23)
│    └──────────────────── minute (0 - 59)
└───────────────────────── second (0 - 59, OPTIONAL)
*/

class Scheduler {
    schedule(jd: JobDescription, executeImmediately?: boolean): void {
        logger.info('Scheduling job ' + jd.brief + ' with cron rule ' + jd.cron);
        nodescheduler.scheduleJob(jd.cron, () => {
            jd.execute();
        });

        if (executeImmediately) {
            this.execute(jd);
        }
    }

    execute(jd: JobDescription): void {
        logger.info('Executing job ' + jd.brief);
        setTimeout(() => {
            jd.execute();
        }, 100);
    }
}

export let scheduler: Scheduler = new Scheduler();