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

interface Socket {
    id: string;
    handshake: { address: string };
}

class ClientSpace {
    name: string;
    nsp: any;
    clients: [Socket];

    constructor(name: string, nsp: any) {
        this.name = name;
        this.nsp = nsp;
        this.clients = [] as [Socket];
    }

    public registerClient(client: Socket) {
        this.unregisterClient(client.id);
        this.clients.push(client);
        logger.info('Registered ' + client.handshake.address);
    }

    public unregisterClient(id: string) {
        let idToRemove: number = -1;
        for (let i = 0; i < this.clients.length; i++) {
            if (this.clients[i].id === id) {
                idToRemove = i;
                break;
            }
        }

        if (idToRemove >= 0) {
            logger.info('Unregistered ' + this.clients[idToRemove].handshake.address);
            this.clients.splice(idToRemove, 1);
        }
    }
}

export class EventBroker {
    private clientSpaces: [ClientSpace] = [] as [ClientSpace];

    private pushEvent(consumerName: string, evtType: string, event: any) {
        let emitted = false;
        for (let client of this.clientSpaces) {
            if (client.name === consumerName) {
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
        app.use(bodyParser.json());

        app.use('/admin', express.static('../ui'));

        app.use('/logs', express.static('logs'));

        app.get('/', (req: any, res: any) => {
            let result: string = '<html><head></head><body>';
            for (let space of this.clientSpaces) {
                result += ('<h1>' + space.name + '</h1>');
                result += '<ul>';
                for (let client of space.clients) {
                    result += ('<li>' + client.handshake.address + '</li>');
                }
                result += '</ul>';
            }
            result += '</body></html>';
            res.send(result);
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
            let clientSpace = new ClientSpace(consumerName, nsp);
            logger.info(consumerName);
            this.clientSpaces.push(clientSpace);
            nsp.on('connection', (socket: any) => {
                clientSpace.registerClient(socket);
                socket.on('disconnect', () => {
                    clientSpace.unregisterClient(socket.id);
                });
            });
        }

        logger.info('Listening ' + port + '...');
        server.listen(port);

        return 0;
    }
}
