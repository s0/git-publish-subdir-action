import * as path from 'path';

import * as util from '../util';

const REPO_DIR = path.join(util.REPOS_DIR, 'ssh-no-branch-github.git');
const DATA_DIR = path.join(util.DATA_DIR, 'ssh-no-branch-github');

const RUNNING_IN_GITHUB = !!process.env.GITHUB_SSH_PRIVATE_KEY;

/**
 * Unit test to only run in GitHub environment
 */
const itGithubOnly = RUNNING_IN_GITHUB ? it : xit;

itGithubOnly('Deploy to an existing branch on GitHub', async () => {

  // Create empty repo
  await util.mkdir(REPO_DIR);
  await util.wrappedExec('git init --bare', { cwd: REPO_DIR });

  // Create dummy data
  await util.mkdir(DATA_DIR);
  await util.mkdir(path.join(DATA_DIR, 'dummy'));
  await util.writeFile(path.join(DATA_DIR, 'dummy', 'baz'), 'foobar');
  await util.writeFile(path.join(DATA_DIR, 'dummy', '.bat'), 'foobar');

  // Run Action
  await util.runWithGithubEnv(
    path.basename(__filename),
    {
      REPO: 'git@github.com:s0/git-publish-subdir-action-tests.git',
      BRANCH: 'branch-a',
      FOLDER: DATA_DIR,
      SSH_PRIVATE_KEY: util.getGitHubSSHPrivateKey(),
    },
    's0/test',
    {},
    's0'
  );

  // Check that the log of the repo is as expected
  // TODO: clone the repo from GitHub and ensure it looks correct
  // For now, the job succeeding is good enough
});