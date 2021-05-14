import * as util from '../util';
import { prepareTestFolders } from '../util/io';

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
  xit('missing-known-hosts', async () => {
    const folders = await prepareTestFolders({ __filename });

    // Run Action
    await util
      .runWithGithubEnv(
        folders.testName,
        {
          REPO: folders.repoUrl,
          BRANCH: 'branch-a',
          FOLDER: folders.dataDir,
          SSH_PRIVATE_KEY: (
            await util.readFile(util.SSH_PRIVATE_KEY)
          ).toString(),
        },
        's0/test',
        {},
        's0',
        {
          captureOutput: true,
        }
      )
      .then(() => {
        throw new Error('Expected error');
      })
      .catch((err: util.TestRunError) => {
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
    const folders = await prepareTestFolders({ __filename });

    // Run Action
    await util
      .runWithGithubEnv(
        folders.testName,
        {
          BRANCH: 'branch-a',
          FOLDER: folders.dataDir,
        },
        's0/test',
        {},
        's0',
        {
          captureOutput: true,
        }
      )
      .then(() => {
        throw new Error('Expected error');
      })
      .catch((err: util.TestRunError) => {
        try {
          expect(err.output).toBeDefined();
          expect(
            err.output?.stderr.includes('REPO must be specified')
          ).toBeTruthy();
        } catch (e) {
          console.log(err);
          throw e;
        }
      });
  });

  it('missing-folder', async () => {
    const folders = await prepareTestFolders({ __filename });

    // Run Action
    await util
      .runWithGithubEnv(
        folders.testName,
        {
          REPO: folders.repoUrl,
          BRANCH: 'branch-a',
        },
        's0/test',
        {},
        's0',
        {
          captureOutput: true,
        }
      )
      .then(() => {
        throw new Error('Expected error');
      })
      .catch((err: util.TestRunError) => {
        try {
          expect(err.output).toBeDefined();
          expect(
            err.output?.stderr.includes('FOLDER must be specified')
          ).toBeTruthy();
        } catch (e) {
          console.log(err);
          throw e;
        }
      });
  });

  it('missing-branch', async () => {
    const folders = await prepareTestFolders({ __filename });

    // Run Action
    await util
      .runWithGithubEnv(
        folders.testName,
        {
          REPO: folders.repoUrl,
          FOLDER: folders.dataDir,
        },
        's0/test',
        {},
        's0',
        {
          captureOutput: true,
        }
      )
      .then(() => {
        throw new Error('Expected error');
      })
      .catch((err: util.TestRunError) => {
        try {
          expect(err.output).toBeDefined();
          expect(
            err.output?.stderr.includes('BRANCH must be specified')
          ).toBeTruthy();
        } catch (e) {
          console.log(err);
          throw e;
        }
      });
  });

  it('missing-event-path', async () => {
    const folders = await prepareTestFolders({ __filename });

    // Run Action
    await util
      .runWithGithubEnv(
        folders.testName,
        {
          REPO: folders.repoUrl,
          BRANCH: 'branch-a',
          FOLDER: folders.dataDir,
          SSH_PRIVATE_KEY: (
            await util.readFile(util.SSH_PRIVATE_KEY)
          ).toString(),
        },
        's0/test',
        {},
        's0',
        {
          captureOutput: true,
          excludeEventPath: true,
        }
      )
      .then(() => {
        throw new Error('Expected error');
      })
      .catch((err: util.TestRunError) => {
        try {
          expect(err.output).toBeDefined();
          expect(
            err.output?.stderr.includes('Expected GITHUB_EVENT_PATH')
          ).toBeTruthy();
        } catch (e) {
          console.log(err);
          throw e;
        }
      });
  });

  it('missing-ssh-private-key', async () => {
    const folders = await prepareTestFolders({ __filename });

    // Run Action
    await util
      .runWithGithubEnv(
        folders.testName,
        {
          REPO: folders.repoUrl,
          BRANCH: 'branch-a',
          FOLDER: folders.dataDir,
        },
        's0/test',
        {},
        's0',
        {
          captureOutput: true,
        }
      )
      .then(() => {
        throw new Error('Expected error');
      })
      .catch((err: util.TestRunError) => {
        try {
          expect(err.output).toBeDefined();
          expect(
            err.output?.stderr.includes(
              'SSH_PRIVATE_KEY must be specified when REPO uses ssh'
            )
          ).toBeTruthy();
        } catch (e) {
          console.log(err);
          throw e;
        }
      });
  });

  it('unsupported-http-repo', async () => {
    const folders = await prepareTestFolders({ __filename });

    // Run Action
    await util
      .runWithGithubEnv(
        folders.testName,
        {
          REPO: 'https://github.com/s0/git-publish-subdir-action-tests.git',
          BRANCH: 'branch-a',
          FOLDER: folders.dataDir,
        },
        's0/test',
        {},
        's0',
        {
          captureOutput: true,
        }
      )
      .then(() => {
        throw new Error('Expected error');
      })
      .catch((err: util.TestRunError) => {
        try {
          expect(err.output).toBeDefined();
          expect(
            err.output?.stderr.includes('Unsupported REPO URL')
          ).toBeTruthy();
        } catch (e) {
          console.log(err);
          throw e;
        }
      });
  });
  it('unauthorized-ssh-key', async () => {
    const folders = await prepareTestFolders({ __filename });

    // Run Action
    await util
      .runWithGithubEnv(
        folders.testName,
        {
          REPO: folders.repoUrl,
          BRANCH: 'branch-a',
          FOLDER: folders.dataDir,
          SSH_PRIVATE_KEY: (
            await util.readFile(util.SSH_PRIVATE_KEY_INVALID)
          ).toString(),
          KNOWN_HOSTS_FILE: util.KNOWN_HOSTS,
        },
        's0/test',
        {},
        's0',
        {
          captureOutput: true,
        }
      )
      .then(() => {
        throw new Error('Expected error');
      })
      .catch((err: util.TestRunError) => {
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
    const folders = await prepareTestFolders({ __filename });

    // Run Action
    await util
      .runWithGithubEnv(
        folders.testName,
        {
          REPO: 'self',
          BRANCH: 'tmp-test-branch',
          FOLDER: folders.dataDir,
        },
        's0/test',
        {},
        's0',
        {
          captureOutput: true,
        }
      )
      .then(() => {
        throw new Error('Expected error');
      })
      .catch((err: util.TestRunError) => {
        try {
          expect(err.output).toBeDefined();
          expect(
            err.output?.stderr.includes(
              'GITHUB_TOKEN must be specified when REPO == self'
            )
          ).toBeTruthy();
        } catch (e) {
          console.log(err);
          throw e;
        }
      });
  });

  it('self-missing-repo', async () => {
    const folders = await prepareTestFolders({ __filename });

    // Run Action
    await util
      .runWithGithubEnv(
        folders.testName,
        {
          REPO: 'self',
          BRANCH: 'tmp-test-branch',
          FOLDER: folders.dataDir,
          GITHUB_TOKEN: 'foobar',
        },
        undefined,
        {},
        's0',
        {
          captureOutput: true,
        }
      )
      .then(() => {
        throw new Error('Expected error');
      })
      .catch((err: util.TestRunError) => {
        try {
          expect(err.output).toBeDefined();
          expect(
            err.output?.stderr.includes(
              'GITHUB_REPOSITORY must be specified when REPO == self'
            )
          ).toBeTruthy();
        } catch (e) {
          console.log(err);
          throw e;
        }
      });
  });
});
