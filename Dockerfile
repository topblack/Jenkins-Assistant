FROM qinling/nodejs
EXPOSE 80

COPY dist/**/* /jenkins-assistant/
WORKDIR /jenkins-assistant/server

ENTRYPOINT ["node", "index.js"]