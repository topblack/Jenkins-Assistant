enum RuleType {
    triggerOnNewCommit,
    triggerOnPullRequestUpdate
}

interface BranchFilter {
    includes: string[];
    excludes: string[];
}

interface RepoBranches {
    repository: string;
    branches: BranchFilter;
}

interface Rule {
    name: string;
    ruleType: string;
    branchesToWatch: RepoBranches[];
}

interface JobTrigger {
    jobName: string;
    parameters: JobTriggerParameter[];
    options: JobTriggerOption;
}

interface JobTriggerOption {
    setCommitAuthor: string;
    setCommitBranch: string;
}

interface JobTriggerParameter {
    name: string;
    value: string;
}

interface TriggerRule extends Rule {
    triggerJobs: JobTrigger[];
}

let testJSON = '{    "name": "dsk-multibranch",    "ruleType": "triggerOnPullRequestUpdate",    "branchesToWatch": [        {            "repository": "PerkinElmer/ChemDraw-CommonCS",            "branches": {                "includes": [],                "excludes": []            }        },        {            "repository": "PerkinElmer/ChemDraw-Desktop",            "branches": {                "includes": [],                "excludes": []            }        }    ],    "triggerJobs": [        {            "jobName": "DSK/MultiBranchesBuild-Win"},        {            "jobName": "DSK/MultiBranchesBuild-Mac"}    ]}';
let rule: TriggerRule = JSON.parse(testJSON);

console.info(rule.triggerJobs.length);
rule.triggerJobs.forEach((value) => {
    if (value.options) {
        console.info(value.options.setCommitAuthor);
        console.info(value.options.setCommitBranch);
    }
});