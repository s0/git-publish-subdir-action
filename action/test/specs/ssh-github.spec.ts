import { promises as fs } from 'fs';
import * as path from 'path';
import { mkdirP } from '@actions/io';

import * as util from '../util';
import { prepareTestFolders } from '../util/io';

const RUNNING_IN_GITHUB = !!process.env.GITHUB_SSH_PRIVATE_KEY;

/**
 * Unit test to only run in GitHub environment
 */
const itGithubOnly = RUNNING_IN_GITHUB ? it : xit;

itGithubOnly('Deploy to an existing branch on GitHub', async () => {
  const folders = await prepareTestFolders({ __filename });

  // Create empty repo
  await util.wrappedExec('git init --bare', { cwd: folders.repoDir });

  // Create dummy data
  await mkdirP(path.join(folders.dataDir, 'dummy'));
  await fs.writeFile(path.join(folders.dataDir, 'dummy', 'baz'), 'foobar');
  await fs.writeFile(path.join(folders.dataDir, 'dummy', '.bat'), 'foobar');

  // Run Action
  await util.runWithGithubEnv(
    path.basename(__filename),
    {
      REPO: folders.repoUrl,
      BRANCH: 'branch-a',
      FOLDER: folders.dataDir,
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
