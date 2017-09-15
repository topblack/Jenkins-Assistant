const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

import { logger } from './Logger';

let consumerNames: string[] = [
    'chemjenkins'
];

const CONSUMERS_DIR = 'consumers';

class ClientSpace {
    id: string;
    nsp: any;

    constructor(id: string, nsp: any) {
        this.id = id;
        this.nsp = nsp;
    }
}

export class GitHubWebhookBroker {
    private clientSpaces: [ClientSpace] = [] as [ClientSpace];

    private pushEvent(consumerName: string, evtType: string, event: any) {
        let emitted = false;
        for (let client of this.clientSpaces) {
            if (client.id === consumerName) {
                logger.info('Pusing events to ' + consumerName);
                client.nsp.emit(evtType, event);
                emitted = true;
                break;
            }
        }

        if (!emitted) {
            throw new Error('NoSuchClientFound')
        }
    }

    public serve(port: number): number {
        if (!fs.existsSync(CONSUMERS_DIR)) {
            fs.mkdirSync(CONSUMERS_DIR);
        }

        app.use(bodyParser.json());

        app.use('/admin', express.static('ui'));

        app.get('/', (req: any, res: any) => {
            res.send('GitHubWebhookBroker');
        });

        app.post('/consumers/:consumerId/events', (req: any, res: any) => {
            let evtType = req.get('X-GitHub-Event') as string;

            this.pushEvent(req.params.consumerId, evtType, req.body);

            try {
                res.sendStatus(200);
            } catch (error) {
                res.status(500).send(error);
            }
        });

        io.on('connection', (socket: any) => {
            logger.info('connection');
        });

        for (let consumerName of consumerNames) {
            let nsp = io.of('/' + consumerName);
            logger.info(consumerName);
            this.clientSpaces.push(new ClientSpace(consumerName, nsp));
            nsp.on('connection', (socket: any) => {
                nsp.emit('hi', 'everyone!');
                logger.info('someone connected');
            });
        }

        logger.info('Listening ' + port + '...');
        server.listen(port);

        return 0;
    }
}
