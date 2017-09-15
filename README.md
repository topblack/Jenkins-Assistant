![](https://travis-ci.org/topblack/Jenkins-Assistant.svg?branch=master)

docker pull qinling/jenkinsassistant:latest

docker run -d -p 8081:80 -v $rulesFolder:/jenkins-assistant/rules/ --restart=always --name jenkins-assistant $IMAGE_TAG