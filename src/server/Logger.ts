const winston = require('winston');
const fs = require('fs');
require('winston-daily-rotate-file');

const logDirName: string = 'logs';

if (!fs.existsSync(logDirName)) {
    fs.mkdirSync(logDirName);
}

export let logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)(),
        new (winston.transports.DailyRotateFile)({
            colorize: 'true',
            dirname: logDirName,
            filename: 'app.log',
            datePattern: '.yyyy-MM-dd',
            maxsize: 20000
        })
    ]
});