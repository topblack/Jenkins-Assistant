FROM dockerregistry.scienceaccelerated.com:5000/builder:nodejs
EXPOSE 8081

ADD index.js /jenkins-assistant/
ADD rules /jenkins-assistant/rules/
ADD node_modules /jenkins-assistant/node_modules/
WORKDIR /jenkins-assistant


ENTRYPOINT node index.js

