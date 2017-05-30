FROM ubuntu:latest
EXPOSE 8081

ADD **/* /jenkins-assistant/
WORKDIR /jenkins-assistant

RUN apt-get update
RUN apt-get -y install nodejs
RUN apt-get -y install npm
RUN ln -s /usr/bin/nodejs /usr/bin/node
RUN npm install
RUN tsc index.ts

ENTRYPOINT node index.js

