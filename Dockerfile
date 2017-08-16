FROM qinling/nodejs
EXPOSE 80

ADD index.js /jenkins-assistant/
ADD rules /jenkins-assistant/rules/
ADD node_modules /jenkins-assistant/node_modules/
WORKDIR /jenkins-assistant

ENTRYPOINT node index.js