const GitHub = require('github-api');

import { logger } from './Logger';

interface Repo {
    name: string;
    full_name: string;
    default_branch: string;
}

interface User {
    name: string;
    date: string;
    email: string;
}

export interface UserProfile {
    login: string;
    email: string;
    name: string;
}

interface BranchCommit {
    sha: string;
    commit: Commit;
}

interface Commit {
    author: User;
    committer: User;
    message: string;
}

interface Error {
    message: string;
}

interface FulfilledHttpRequest {
    status: number;
    data: any;
}

export interface Branch {
    name: string;
    commit: BranchCommit;
}

export class GitHubAPI {
    private github: any;

    constructor(user?: string, token?: string) {
        if (!user) {
            user = process.env.GITHUB_USER;
        }

        if (!token) {
            token = process.env.GITHUB_TOKEN;
        }

        if (user == null || token == null) {
            logger.error('GitHub auth token needs to be specified.');
        } else {
            this.github = new GitHub( {
                username: user,
                token: token
            });
        }
    }

    public findBranch = (ownerName: string, repoName: string, branchName: string) => {
        logger.info(`Finding branch ${ownerName}/${repoName}@${branchName}...`);
        let repo = this.github.getRepo(ownerName, repoName);

        return repo.getBranch(branchName)
            .then((result: FulfilledHttpRequest) => {
                let branch: Branch = result.data as Branch;
                return branch.name;
            }).catch((error: Error) => {
                return this.getDefaultBranch(ownerName, repoName);
            });
    }

    public getDefaultBranch = (ownerName: string, repoName: string) => {
        logger.info(`Finding default branch of ${ownerName}/${repoName}...`);

        let repo = this.github.getRepo(ownerName, repoName);

        return repo.getDetails()
            .then((result: FulfilledHttpRequest) => {
                let r: Repo = result.data as Repo;
                return r.default_branch;
            }).catch((error: Error) => {
                console.error(`Unable to find the default branch, due to error ${error}`);
            });
    }

    public getUserProfile = (userLoginId: string) => {
        return this.github.getUser(userLoginId).getProfile()
            .then((result: FulfilledHttpRequest) => {
                let profile: UserProfile = result.data as UserProfile;
                return profile;
            });
    }
}
