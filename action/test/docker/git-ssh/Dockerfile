FROM jkarlos/git-server-docker:latest

ARG GIT_UID

RUN apk update
RUN apk --no-cache add shadow \
    --allow-untrusted \
    --repository http://dl-cdn.alpinelinux.org/alpine/v3.15/community/ \
    --repository http://dl-cdn.alpinelinux.org/alpine/v3.15/main/

# We want to allow for the UID of the git user to match the repos
RUN usermod -u $GIT_UID git
