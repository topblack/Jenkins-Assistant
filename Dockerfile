FROM qinling/nodejs
EXPOSE 80

ADD dist/* /jenkins-assistant/
ADD script/entrypoint.sh /jenkins-assistant/
ADD lib/* /jenkins-assistant/
ADD node_modules /jenkins-assistant/node_modules/
WORKDIR /jenkins-assistant

RUN chmod +x /jenkins-assistant/entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]