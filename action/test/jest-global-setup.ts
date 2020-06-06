import * as path from 'path';
import * as fs from 'fs';
import {promisify} from 'util';

import * as util from './util';

const copyFile = promisify(fs.copyFile);

export = async () => {

  // Create Fresh Test Data Directories
  console.log(':: Preparing test data directory');
  await util.exec('rm -rf ../.nyc_output', { cwd: util.TEST_DIR });
  await util.exec('rm -rf data', { cwd: util.TEST_DIR });
  await util.exec('mkdir data', { cwd: util.TEST_DIR });
  await util.exec('mkdir server-ssh-keys', { cwd: util.DATA_DIR });
  await util.exec('mkdir repos', { cwd: util.DATA_DIR });

  // Generate SSH Keys to use in tests
  console.log(':: Generating SSH Keys');
  await util.exec(
    'ssh-keygen -t ed25519 -N "" -f ./id',
    { cwd: util.DATA_DIR }
  );
  await util.exec(
    'ssh-keygen -t ed25519 -N "" -f ./id2',
    { cwd: util.DATA_DIR }
  );
  await copyFile(
    path.join(util.DATA_DIR, 'id.pub'),
    path.join(util.DATA_DIR, 'server-ssh-keys', 'id.pub'),
  );

  // 
  console.log(':: Building docker containers for testing');
  await util.execWithOutput(
    `docker build --build-arg GIT_UID=${process.getuid()} -t git-ssh-server docker/git-ssh`,
    { cwd: util.TEST_DIR });

  // Start docker containers
  console.log(':: (Re) starting docker test containers');
  await util.execWithOutput(`docker-compose up -d --force-recreate`, {
    cwd: util.TEST_DIR,
  });

  // Create user in test container with same UID as host user
  console.log(':: Creating test user in docker');
  await util.execWithOutput(`docker exec -u root ${util.NODE_CONTAINER} useradd -u ${process.getuid()} test`);
  await util.execWithOutput(`docker exec -u root ${util.NODE_CONTAINER} mkdir /home/test`);
  await util.execWithOutput(`docker exec -u root ${util.NODE_CONTAINER} chown test:test /home/test`);

  console.log(':: Creating known_hosts file');
  await util.execWithOutput('docker exec -u test test-node ./test/bin/generate-known-hosts.sh');

};
