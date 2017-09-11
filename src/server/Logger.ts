const winston = require('winston');

class Logger {
    info(msg: string): void {
        winston.log(msg);
        console.info(msg);
    }
}

export let logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)(),
        new (winston.transports.File)({ filename: 'app.log' })
    ]
});