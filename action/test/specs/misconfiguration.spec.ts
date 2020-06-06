import * as path from 'path';

import * as util from '../util';

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
  it('missing-known-hosts', async () => {

    const testname = `misconfiguration-missing-known-hosts`;
    const dataDir = path.join(util.DATA_DIR, testname);

    await util.mkdir(dataDir);

    // Run Action
    await util.runWithGithubEnv(
      testname,
      {
        REPO: 'ssh://git@git-ssh/git-server/repos/non-existing.git',
        BRANCH: 'branch-a',
        FOLDER: dataDir,
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
      try {
        expect(err.output).toBeDefined();
        expect(err.output?.stderr.includes(KNOWN_HOSTS_WARNING)).toBeTruthy();
        expect(err.output?.stderr.includes(KNOWN_HOSTS_ERROR)).toBeTruthy();
      } catch (e) {
        console.log(err);
        throw e;
      }
    });

  });
});