FROM ubuntu:latest
RUN apt-get -y install update
RUN apt-get -y install nodejs
RUN apt-get -y install npm
ln -s /usr/bin/nodejs /usr/bin/nodejs
