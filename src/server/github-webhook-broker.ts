const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const CONSUMERS_DIR = 'consumers';
export class GitHubEventBroker {
    public serve(port: number): number {
        if (!fs.existsSync(CONSUMERS_DIR)) {
            fs.mkdirSync(CONSUMERS_DIR);
        }
        let app = express();
        app.use(bodyParser.json());

        app.get('/', function (req: any, res: any) {
            res.send('hello world');
            console.log('hello world');
        });

        app.get('/consumers', function (req: any, res: any) {
            let consumerFolders = fs.readdirSync(CONSUMERS_DIR);
            res.send(consumerFolders);
        });

        app.get('/consumers/:consumerId/events', function (req: any, res: any) {
            let consumerFolder = path.join(CONSUMERS_DIR, req.params.consumerId);
            let eventFileNames = fs.readdirSync(consumerFolder);
            let sortedEventFileNames = eventFileNames.sort(function (a: string, b: string) {
                let statA = fs.statSync(path.join(consumerFolder, a));
                let statB = fs.statSync(path.join(consumerFolder, b));
                return statA.mtime.getTime() > statB.mtime.getTime();
            });
            res.send(sortedEventFileNames);
        });

        app.post('/consumers/:consumerId/events', function (req: any, res: any) {
            let evtType = req.get('X-GitHub-Event');
            let evtId = req.get('X-GitHub-Delivery');
            let targetPath = path.join(CONSUMERS_DIR, req.params.consumerId);
            if (!fs.existsSync(targetPath)) {
                fs.mkdirSync(targetPath);
                console.info('Consumer ' + req.params.consumerId + ' added.');
            }

            fs.writeFileSync(path.join(targetPath, evtType + '_' + evtId), JSON.stringify(req.body));
            console.log(evtType + ' to ' + req.params.consumerId);
            res.sendStatus(200);
        });

        app.delete('/consumers/:consumerId/events/:eventId', function (req: any, res: any) {
            let targetPath = path.join(CONSUMERS_DIR, req.params.consumerId, req.params.eventId);
            if (fs.existsSync(targetPath)) {
                fs.unlinkSync(targetPath);
            }
            res.sendStatus(200);
        });

        app.get('/consumers/:consumerId/events/:eventId', function (req: any, res: any) {
            let targetPath = path.join(CONSUMERS_DIR, req.params.consumerId, req.params.eventId);
            if (fs.existsSync(targetPath)) {
                res.send(JSON.parse(fs.readFileSync(targetPath, 'utf-8')));
            } else {
                res.sendStatus(404);
            }
        });

        console.info('Listening...');
        app.listen(port);
        console.info('End');

        return 0;
    }
}
