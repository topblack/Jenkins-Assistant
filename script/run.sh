#!/bin/bash
JENKINS_URL=http://qinll:d8f07b93412618d4bf87d905cceb3d8c@chemjenkins.perkinelmer.net:8080
GITHUB_BROKER_URL=http://shdev.scienceaccelerated.com:8081/consumers/chemjenkins

IMAGE_TAG=qinling/jenkinsassistant:latest

rulesFolder=`pwd`
rulesFolder="$rulesFolder/rules"

if [ ! -d "$rulesFolder" ]; then
    mkdir $rulesFolder
fi

docker stop jenkins-assistant
docker rm jenkins-assistant
docker rmi $IMAGE_TAG
docker run -d -p 8081:80 -v $rulesFolder:/jenkins-assistant/rules/ -e JENKINS_URL=$JENKINS_URL -e GITHUB_BROKER_URL=$GITHUB_BROKER_URL --restart=always --name jenkins-assistant $IMAGE_TAG