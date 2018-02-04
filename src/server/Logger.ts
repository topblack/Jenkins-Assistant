const winston = require('winston');
const fs = require('fs');
require('winston-daily-rotate-file');

export const LOG_DIR = '/logs';

if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR);
}

export let logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)(),
        new (winston.transports.DailyRotateFile)({
            colorize: 'true',
            dirname: LOG_DIR,
            filename: 'app.log',
            datePattern: '.yyyy-MM-dd',
            maxsize: 20000
        })
    ]
});