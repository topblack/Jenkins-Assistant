FROM ubuntu:latest
EXPOSE 8081

RUN apt-get update
RUN apt-get -y install nodejs
RUN apt-get -y install npm
RUN ln -s /usr/bin/nodejs /usr/bin/node
ADD index.js /jenkins-assistant
ADD node_modules/**/* /jenkins-assistant
ADD rules/* /jenkins-assistant

WORKDIR /jenkins-assistant

ENTRYPOINT node index.js

