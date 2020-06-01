FROM jkarlos/git-server-docker:latest

ARG GIT_UID

RUN echo http://dl-2.alpinelinux.org/alpine/edge/community/ >> /etc/apk/repositories
RUN apk --no-cache add shadow

# We want to allow for the UID of the git user to match the repos
RUN usermod -u $GIT_UID git