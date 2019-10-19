FROM ubuntu:18.04

LABEL "com.github.actions.name"="Git Publish Subdirectory"
LABEL "com.github.actions.description"="Push a subdirectory as a branch to any git repo over SSH"
LABEL "com.github.actions.icon"="upload-cloud"
LABEL "com.github.actions.color"="purple"

LABEL "repository"="https://github.com/s0/git-publish-subdir-action"
LABEL "homepage"="https://github.com/s0/git-publish-subdir-action"
LABEL "maintainer"="Sam Lanning <sam@samlanning.com>"

RUN apt-get update
RUN apt-get -y install nodejs npm

ADD action /opt/action
WORKDIR /opt/action
RUN npm install
RUN npm run build
ENTRYPOINT ["npm", "run", "start"]