const GitHub = require('github-api');

import { logger } from './Logger';

interface Event {
    repository: Repo;
}

export interface PushEvent extends Event {
    ref: string;
    created: boolean;
    deleted: boolean;
    commits: Commit[];
}

export interface PullRequestEvent extends Event {
    /**
     * Can be one of "assigned", "unassigned", "review_requested", "review_request_removed",
     * "labeled", "unlabeled", "opened", "edited", "closed", or "reopened".
     */
    action: string;
    pull_request: PullRequest;
}

export interface Repo {
    owner: User;
    name: string;
    full_name: string;
    default_branch: string;
}

export interface RepoBranch {
    ownerName: string;
    repoName: string;
    branchName: string;
}

interface User {
    login: string;
    url: string;
}

interface CommitUser {
    name: string;
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
    author: CommitUser;
    committer: CommitUser;
    message: string;
}

interface Error {
    message: string;
}

interface FulfilledHttpRequest {
    status: number;
    data: any;
}

interface GitReference {
    ref: string;
    sha: string;
    repo: Repo;
}

interface CreateReferenceRequest {
    ref: string;
    sha: string;
}

interface CommitsCompareResult {
    status: string;
    commits: BranchCommit[];
}

export interface PullRequest {
    head: GitReference;
    base: GitReference;
    user: User;
    title: string;
    html_url: string;
}

export interface PullRequestTriggerInfo {
    requestor: UserProfile;
    pullRequestHtmlUrl: string;
    relatedBranches: RepoBranch[];
    hash: string;
    repoBranch: RepoBranch;
}

export interface Branch {
    name: string;
    commit: BranchCommit;
}

/**
 * Refer to the API docs at http://github-tools.github.io/github/
 */
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
                let repoBranch: RepoBranch = {ownerName: ownerName, repoName: repoName, branchName: branch.name};
                return repoBranch;
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
                let repoBranch: RepoBranch = {ownerName: ownerName, repoName: repoName, branchName: r.default_branch};
                return repoBranch;
            }).catch((error: Error) => {
                console.error(`Unable to find the default branch, due to error ${error}`);
            });
    }

    public getUserProfile = (userLoginId: string) => {
        logger.info(`Getting user profile of ${userLoginId}`);
        return this.github.getUser(userLoginId).getProfile()
            .then((result: FulfilledHttpRequest) => {
                let profile: UserProfile = result.data as UserProfile;
                return profile;
            });
    }

    public getPullRequest = (ownerName: string, repoName: string, pullNumber: number) => {
        logger.info(`Getting pull request ${ownerName}/${repoName}/pulls/${pullNumber}...`);
        let repo = this.github.getRepo(ownerName, repoName);

        return repo.getPullRequest(pullNumber)
            .then((result: FulfilledHttpRequest) => {
                let pr: PullRequest = result.data as PullRequest;
                return pr;
            }).catch((error: Error) => {
                console.error(`Unable to find the default branch, due to error ${error}`);
            });
    }

    public createBranchFromCommitHash = (ownerName: string, repoName: string, commitHash: string, branchName: string) => {
        if (!branchName.startsWith('refs/heads/')) {
            branchName = 'refs/heads/' + branchName;
        }

        let ref: CreateReferenceRequest = {sha: commitHash, ref: branchName};
        return this.github.getRepo(ownerName, repoName).createRef(ref);
    }

    public deleteBranch = (ownerName: string, repoName: string, branchName: string) => {
        if (!branchName.startsWith('refs/heads/')) {
            branchName = 'refs/heads/' + branchName;
        }

        return this.github.getRepo(ownerName, repoName).deleteRef(branchName);
    }

    public compareBranches = (ownerName: string, repoName: string, base: string, head: string) => {
        if (!base.startsWith('refs/heads/')) {
            base = 'refs/heads/' + base;
        }

        return this.github.getRepo(ownerName, repoName).compareBranches(base, head);
    }

    public retrieveBuildTriggerInfo = (repoNames: [{ownerName: string, repoName: string}], pullRequest: PullRequest) => {
        // Get repo & branches
        // Get notifiers
        let ps: Promise<RepoBranch>[] = [];

        for (let repo of repoNames) {
            ps.push(this.findBranch(repo.ownerName, repo.repoName, pullRequest.head.ref));
        }

        return Promise.all(ps).then((results) => {
            let triggerInfo: PullRequestTriggerInfo = {
                requestor: null,
                relatedBranches: results,
                pullRequestHtmlUrl: pullRequest.html_url,
                hash: pullRequest.head.sha,
                repoBranch: {
                    repoName: pullRequest.head.repo.name,
                    ownerName: pullRequest.head.repo.owner.login,
                    branchName: pullRequest.head.ref}
            };
            return this.getUserProfile(pullRequest.user.login).then((profile: UserProfile) => {
                triggerInfo.requestor = profile;
                return triggerInfo;
            })
        })
    }
}

function test() {
    let github = new GitHubAPI('chemjenkins-pki', 'e737fa3495582416434bf84bb3c416e4a16b4eae');
    github.compareBranches('PerkinElmer', 'ChemDraw-Desktop', 'chemjenkins/DSK/develop/last-build',
    '7f8ffba68ff06ba5e7718ff2befce81945fca1c8').then((compareResult: any) => {
        console.info(compareResult.data.status);
    }).catch(err => {
        console.error(err);
    });
}

function test2() {
    let github = new GitHubAPI('chemjenkins-pki', 'e737fa3495582416434bf84bb3c416e4a16b4eae');
    return github.createBranchFromCommitHash('PerkinElmer', 'ChemDraw-Desktop',
        '2ce404defd08c650e055eee06d7f78fafa748015', 'chemjenkins/DSK/develop/last-build');
}
