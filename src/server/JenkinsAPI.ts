const JENKINS_URL = 'http://chemjenkins:e76dca0d7cd1ff1967c475c54c225ad6@chemjenkins.perkinelmer.net:8080';
const jenkins = require('jenkins')({ baseUrl: JENKINS_URL, crumbIssuer: true });

function getSystemInfo() {
    jenkins.info((err: any, data: any) => {
        if (err) {
            throw err;
        }
        console.log('info', data);
    });
}

jenkins.job.get('/CDWEB/develop/BuildAndDeployDocker', (err: any, data: any) => {
    if (err) {
        throw err;
    }

    console.log('build', data);
});
