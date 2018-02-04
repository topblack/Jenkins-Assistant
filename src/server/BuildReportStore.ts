const fs = require('fs');
const path = require('path');

export class BuildReport {
    buildUrl: string;
    upstreamBuildUrl: string;
    result: string;
    commits: Commit[];
}

class Commit {
    repo: string;
    commit: string;
}

class BuildUrl {
    buildUrl: string;
    jobUrl: string;
    buildId: number;

    constructor(url: string) {
        this.buildUrl = url.substring(0, url.length - 1);
        this.jobUrl = this.buildUrl.substring(0, this.buildUrl.lastIndexOf('/'));
        console.info(this.buildUrl.substring(this.jobUrl.length + 1));
        this.buildId = parseInt(this.buildUrl.substring(this.jobUrl.length + 1), 10);
    }
}

export class BuildReportStore {
    private name: string;

    constructor(name: string) {
        this.name = name;
    }

    public add = (report: BuildReport) => {
        let buildUrl = new BuildUrl(report.buildUrl);
        let jobPath = buildUrl.jobUrl.replace(/job\//g, '');
        if (!fs.existsSync(jobPath)) {
            this.mkDirByPathSync(jobPath);
        }

        let buildFile = path.join('builds', name, jobPath, `${buildUrl.buildId}`);
        fs.writeFileSync(buildFile, JSON.stringify(buildUrl));
    }

    private mkDirByPathSync(targetDir: string, isRelativeToScript: boolean?) {
        const sep = path.sep;
        const initDir = path.isAbsolute(targetDir) ? sep : '';
        const baseDir = isRelativeToScript ? __dirname : '.';

        targetDir.split(sep).reduce((parentDir, childDir) => {
            const curDir = path.resolve(baseDir, parentDir, childDir);
            try {
                fs.mkdirSync(curDir);
                console.log(`Directory ${curDir} created!`);
            } catch (err) {
                if (err.code !== 'EEXIST') {
                    throw err;
                }
                console.log(`Directory ${curDir} already exists!`);
            }
            return curDir;
        }, initDir);
    }
}

/*
{
    "buildUrl": "job/JenkinsSharedLibsTest/job/test-chemdrawcore/7/",
    "result": "SUCCESS",
    "commits": [
        {
            "repo": "https://github.com/PerkinElmer/CommonThirdParty",
            "commit": "5d22aa2"
        },
        {
            "repo": "https://github.com/PerkinElmer/ChemDraw-Desktop",
            "commit": "8546933"
        },
        {
            "repo": "https://github.com/PerkinElmer/ChemDraw-CommonCS",
            "commit": "613e35a"
        },
        {
            "repo": "https://github.com/PerkinElmer/ChemDraw-WebV2",
            "commit": "20ab76f"
        }
    ]
}
*/