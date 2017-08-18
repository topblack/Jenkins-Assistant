FROM qinling/nodejs
EXPOSE 80

ADD *.js /jenkins-assistant/
ADD *.jar /jenkins-assistant/
ADD node_modules /jenkins-assistant/node_modules/
WORKDIR /jenkins-assistant

ENTRYPOINT node index.js