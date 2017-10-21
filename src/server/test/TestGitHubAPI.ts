import { logger } from '../Logger';
import { GitHubAPI, Branch, UserProfile } from '../GitHubAPI';


let user: string = 'topblack';
let token: string = 'c1264e78e5e3b21dc92b47102bd135367200edd5';

let gitHub: GitHubAPI = new GitHubAPI(user, token);

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