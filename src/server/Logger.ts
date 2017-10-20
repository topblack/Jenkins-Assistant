const winston = require('winston');
require('winston-daily-rotate-file');

export let logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)(),
        new (winston.transports.DailyRotateFile)({
            colorize: 'true',
            dirname: 'data',
            filename: 'app.log',
            datePattern: '.yyyy-MM-dd',
            maxsize: 20000
        })
    ]
});