import * as path from 'path';

import * as util from '../util';

const DATA_DIR = path.join(util.DATA_DIR, 'ssh-no-branch-github');

const KNOWN_HOSTS_WARNING = `
##[warning] KNOWN_HOSTS_FILE not set
This will probably mean that host verification will fail later on
`;

const KNOWN_HOSTS_ERROR = `
##[error] Host key verification failed!
This is probably because you forgot to supply a value for KNOWN_HOSTS_FILE
or the file is invalid or doesn't correctly verify the host git-ssh
`;

describe('Misconfigurations', () => {
  it('Missing KNOWN_HOSTS_FILE', async () => {

    // Run Action
    await util.runWithGithubEnv(
      path.basename(__filename),
      {
        REPO: 'ssh://git@git-ssh/git-server/repos/ssh-existing-branch.git',
        BRANCH: 'branch-a',
        FOLDER: DATA_DIR,
        SSH_PRIVATE_KEY: (await util.readFile(util.SSH_PRIVATE_KEY)).toString(),
      },
      's0/test',
      {},
      's0',
      {
        captureOutput: true,
      }
    ).then(() => {
      throw new Error('Expected error');
    }).catch((err: util.TestRunError) => {
      expect(err.output).toBeDefined();
      expect(err.output?.stderr.includes(KNOWN_HOSTS_WARNING)).toBeTruthy();
      expect(err.output?.stderr.includes(KNOWN_HOSTS_ERROR)).toBeTruthy();
    });

  });
});