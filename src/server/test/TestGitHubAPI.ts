import { logger } from '../Logger';
import * as github from '../GitHubAPI';


let user: string = 'topblack';
let token: string = '384eb91851c23af16b9f782a5bb4336d466866f2';

let gitHub: github.GitHubAPI = new github.GitHubAPI(user, token);

gitHub.getPullRequest('topblack', 'Jenkins-Assistant', 1).then((pr) => {
    return gitHub.retrieveBuildTriggerInfo([
        {ownerName: 'topblack', repoName: 'Jenkins-Assistant'},
        {ownerName: 'topblack', repoName: 'minishop'}], pr);
}).then((triggerInfo: github.PullRequestTriggerInfo) => {
    console.info('Result: ' + JSON.stringify(triggerInfo));
});
