#!/bin/bash

port=80

docker stop jenkins-assistant
docker rm jenkins-assistant
docker pull qinling/jenkinsassistant:latest
docker run -d -p 8080:$port -e "JENKINS_ASSISTANT_PORT=$port" --restart=always --name=jenkins-assistant qinling/jenkinsassistant:latest broker