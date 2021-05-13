#! /bin/bash

set -xe


SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

cd $SCRIPT_DIR
cd ../


echo :: Preparing test data directory;
rm -rf ../.nyc_output
rm -rf data
mkdir data
mkdir data/server-ssh-keys
mkdir data/repos

echo :: Generating SSH Keys
ssh-keygen -t ed25519 -N "" -f data/id
ssh-keygen -t ed25519 -N "" -f data/id2
cp data/id.pub data/server-ssh-keys/id.pub

docker build --build-arg GIT_UID=$(id -u) -t git-ssh-server docker/git-ssh

docker-compose up -d --force-recreate

echo ':: Change UID of node user'
docker exec -u root -i test-node usermod -u $(id -u) node

echo ':: Running Tests'
exec docker exec -u $(id -u) -i test-node npm run test-init -- "$@"
