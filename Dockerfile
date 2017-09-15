FROM qinling/nodejs
EXPOSE 80

ADD dist /jenkins-assistant/
WORKDIR /jenkins-assistant/server

ENTRYPOINT ["node", "index.js"]