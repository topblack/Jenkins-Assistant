const GitHub = require('github-api');

import { logger } from './Logger';

export class GitHubAPI {
    private github: any;

    constructor() {
        let user: string = process.env.GITHUB_USER;
        let token: string = process.env.GITHUB_TOKEN;
        if (user == null || token == null) {
            logger.error('GitHub auth token needs to be specified.');
        } else {
            this.github = new GitHub( {
                username: user,
                token: token
            });
        }
    }

    public existsBranchOnRepo = (ownerName: string, repoName: string, branchName: string): boolean => {
        let repo = this.github.getRepo(ownerName, repoName);
        
        return false;
    }
}
