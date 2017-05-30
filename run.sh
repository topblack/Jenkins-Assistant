#!/bin/bash
export JENKINS_URL=http://qinll:d8f07b93412618d4bf87d905cceb3d8c@chemjenkins.perkinelmer.net:8080
export GITHUB_BROKER_URL=http://shdev.scienceaccelerated.com:8081/consumers/chemjenkins
git pull
npm install
tsc index.ts
node index.js
