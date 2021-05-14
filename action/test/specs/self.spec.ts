import { promises as fs } from 'fs';
import * as path from 'path';
import { mkdirP, rmRF } from '@actions/io';

import * as util from '../util';

const DATA_DIR = path.join(util.DATA_DIR, 'self');

const RUNNING_IN_GITHUB =
  !!process.env.GITHUB_SELF_TEST_REPO && !!process.env.GITHUB_SELF_TEST_TOKEN;

/**
 * Unit test to only run in GitHub environment
 */
const itGithubOnly = RUNNING_IN_GITHUB ? it : xit;

itGithubOnly('Deploy to another branch on self repo', async () => {
  const repo = process.env.GITHUB_SELF_TEST_REPO;
  if (!repo)
    throw new Error(
      'Environment variable GITHUB_SELF_TEST_REPO not set, needed for tests'
    );

  const token = process.env.GITHUB_SELF_TEST_TOKEN;
  if (!token)
    throw new Error(
      'Environment variable GITHUB_SELF_TEST_TOKEN not set, needed for tests'
    );

  // Create dummy data
  await rmRF(DATA_DIR);
  await mkdirP(DATA_DIR);
  await mkdirP(path.join(DATA_DIR, 'dummy'));
  await fs.writeFile(path.join(DATA_DIR, 'dummy', 'baz'), 'foobar');
  await fs.writeFile(path.join(DATA_DIR, 'dummy', '.bat'), 'foobar');

  // Run Action
  await util.runWithGithubEnv(
    path.basename(__filename),
    {
      REPO: 'self',
      BRANCH: 'tmp-test-branch',
      FOLDER: DATA_DIR,
      GITHUB_TOKEN: token,
    },
    repo,
    {},
    's0'
  );

  // Check that the log of the repo is as expected
  // (check tree-hash, commit message, and author)
  // TODO
});
