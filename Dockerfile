FROM qinling/nodejs
EXPOSE 80

COPY dist/ /jenkins-assistant/
COPY lib/* /jenkins-assistant/
COPY node_modules/ /jenkins-assistant/node_modules/
WORKDIR /jenkins-assistant

ENTRYPOINT ["node", "server/index.js"]