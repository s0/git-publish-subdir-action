FROM node:10-buster

LABEL "com.github.actions.name"="Git Publish Subdirectory"
LABEL "com.github.actions.description"="Push a subdirectory as a branch to any git repo over SSH"
LABEL "com.github.actions.icon"="upload-cloud"
LABEL "com.github.actions.color"="purple"

LABEL "repository"="https://github.com/s0/git-publish-subdir-action"
LABEL "homepage"="https://github.com/s0/git-publish-subdir-action"
LABEL "maintainer"="Sam Lanning <sam@samlanning.com>"

ADD action /opt/action
WORKDIR /opt/action
RUN npm install
RUN npm run build

RUN useradd -d /github/home github
RUN mkdir -p ~github
RUN chown github:github ~github
USER github
ENTRYPOINT ["node", "/opt/action/lib"]