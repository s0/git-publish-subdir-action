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

const SSH_KEY_ERROR = `
##[error] Permission denied (publickey)
Make sure that the ssh private key is set correctly, and
that the public key has been added to the target repo
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

  it('missing-repo', async () => {

    const testname = `misconfiguration-missing-repo`;
    const dataDir = path.join(util.DATA_DIR, testname);

    // Run Action
    await util.runWithGithubEnv(
      testname,
      {
        BRANCH: 'branch-a',
        FOLDER: dataDir,
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
        expect(err.output?.stderr.includes('REPO must be specified')).toBeTruthy();
      } catch (e) {
        console.log(err);
        throw e;
      }
    });

  });

  it('missing-folder', async () => {

    const testname = `misconfiguration-missing-folder`;

    // Run Action
    await util.runWithGithubEnv(
      testname,
      {
        REPO: 'ssh://git@git-ssh/git-server/repos/non-existing.git',
        BRANCH: 'branch-a',
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
        expect(err.output?.stderr.includes('FOLDER must be specified')).toBeTruthy();
      } catch (e) {
        console.log(err);
        throw e;
      }
    });

  });

  it('missing-branch', async () => {

    const testname = `misconfiguration-missing-branch`;
    const dataDir = path.join(util.DATA_DIR, testname);

    // Run Action
    await util.runWithGithubEnv(
      testname,
      {
        REPO: 'ssh://git@git-ssh/git-server/repos/non-existing.git',
        FOLDER: dataDir,
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
        expect(err.output?.stderr.includes('BRANCH must be specified')).toBeTruthy();
      } catch (e) {
        console.log(err);
        throw e;
      }
    });

  });

  it('missing-event-path', async () => {

    const testname = `misconfiguration-missing-event-path`;
    const dataDir = path.join(util.DATA_DIR, testname);

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
        excludeEventPath: true,
      }
    ).then(() => {
      throw new Error('Expected error');
    }).catch((err: util.TestRunError) => {
      try {
        expect(err.output).toBeDefined();
        expect(err.output?.stderr.includes('Expected GITHUB_EVENT_PATH')).toBeTruthy();
      } catch (e) {
        console.log(err);
        throw e;
      }
    });

  });

  it('missing-ssh-private-key', async () => {

    const testname = `misconfiguration-missing-ssh-private-key`;
    const dataDir = path.join(util.DATA_DIR, testname);

    // Run Action
    await util.runWithGithubEnv(
      testname,
      {
        REPO: 'ssh://git@git-ssh/git-server/repos/non-existing.git',
        BRANCH: 'branch-a',
        FOLDER: dataDir,
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
        expect(err.output?.stderr.includes('SSH_PRIVATE_KEY must be specified when REPO uses ssh')).toBeTruthy();
      } catch (e) {
        console.log(err);
        throw e;
      }
    });

  });

  it('unsupported-http-repo', async () => {

    const testname = `misconfiguration-unsupported-http-repo`;
    const dataDir = path.join(util.DATA_DIR, testname);

    // Run Action
    await util.runWithGithubEnv(
      testname,
      {
        REPO: 'https://github.com/s0/git-publish-subdir-action-tests.git',
        BRANCH: 'branch-a',
        FOLDER: dataDir,
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
        expect(err.output?.stderr.includes('Unsupported REPO URL')).toBeTruthy();
      } catch (e) {
        console.log(err);
        throw e;
      }
    });

  });
  it('unauthorized-ssh-key', async () => {

    const testname = `unauthorized-ssh-key`;
    const dataDir = path.join(util.DATA_DIR, testname);

    await util.mkdir(dataDir);

    // Run Action
    await util.runWithGithubEnv(
      testname,
      {
        REPO: 'ssh://git@git-ssh/git-server/repos/ssh-no-branch.git',
        BRANCH: 'branch-a',
        FOLDER: dataDir,
        SSH_PRIVATE_KEY: (await util.readFile(util.SSH_PRIVATE_KEY_INVALID)).toString(),
        KNOWN_HOSTS_FILE: util.KNOWN_HOSTS,
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
        expect(err.output?.stderr.includes(SSH_KEY_ERROR)).toBeTruthy();
      } catch (e) {
        console.log(err);
        throw e;
      }
    });

  });
  it('self-missing-token', async () => {

    const testname = `uself-missing-token`;
    const dataDir = path.join(util.DATA_DIR, testname);

    await util.mkdir(dataDir);

    // Run Action
    await util.runWithGithubEnv(
      testname,
      {
        REPO: 'self',
        BRANCH: 'tmp-test-branch',
        FOLDER: dataDir,
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
        expect(err.output?.stderr.includes('GITHUB_TOKEN must be specified when REPO == self')).toBeTruthy();
      } catch (e) {
        console.log(err);
        throw e;
      }
    });

  });

  it('self-missing-repo', async () => {

    const testname = `uself-missing-repo`;
    const dataDir = path.join(util.DATA_DIR, testname);

    await util.mkdir(dataDir);

    // Run Action
    await util.runWithGithubEnv(
      testname,
      {
        REPO: 'self',
        BRANCH: 'tmp-test-branch',
        FOLDER: dataDir,
        GITHUB_TOKEN: 'foobar',
      },
      undefined,
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
        expect(err.output?.stderr.includes('GITHUB_REPOSITORY must be specified when REPO == self')).toBeTruthy();
      } catch (e) {
        console.log(err);
        throw e;
      }
    });

  });
});