import { logger } from '../Logger';
import * as github from '../GitHubAPI';


let user: string = 'topblack';
let token: string = '7cb8e85fe3fa90c235556632b902e190f0818a50 ';

let gitHub: github.GitHubAPI = new github.GitHubAPI(user, token);

let ps: Promise<github.UserProfile>[] = [];

ps.push(gitHub.getUserProfile('lqin-pki'));
ps.push(gitHub.getUserProfile('topblack'));
ps.push(gitHub.getUserProfile('chemjenkins-pki'));

Promise.all(ps).then((results) => {
    for (let profile of results) {
        console.info(profile.email);
    }
})
/*
gitHub.findBranch('topblack', 'Jenkins-Assistant', 'develop').then((result: string) => {
    logger.info(result);
}).catch((error: any) => {
    logger.error('Received error ' + error);
    logger.error(error.stack);
});

gitHub.getUserProfile('lqin-pki').then((profile: UserProfile) => {
    logger.info(profile.email);
});

gitHub.getUserProfile('topblack').then((profile: UserProfile) => {
    logger.info(profile.email);
});

gitHub.getUserProfile('chemjenkins-pki').then((profile: UserProfile) => {
    logger.info(profile.email);
});
*/