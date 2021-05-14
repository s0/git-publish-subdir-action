import { promises as fs } from 'fs';
import * as path from 'path';
import { mkdirP, rmRF } from '@actions/io';

import * as util from '../util';

const REPO_DIR = path.join(util.REPOS_DIR, 'ssh-existing-branch.git');
const WORK_DIR = path.join(util.DATA_DIR, 'ssh-existing-branch');
const REPO_CLONE_DIR = path.join(WORK_DIR, 'clone');
const DATA_DIR = path.join(WORK_DIR, 'data');

it('Deploy to a existing branch over ssh', async () => {
  await rmRF(REPO_DIR);
  await rmRF(WORK_DIR);

  // Create empty repo
  await mkdirP(REPO_DIR);
  await util.wrappedExec('git init --bare', { cwd: REPO_DIR });

  // Clone repo, and create an initial commit
  await mkdirP(WORK_DIR);
  await util.wrappedExec(`git clone "${REPO_DIR}" clone`, { cwd: WORK_DIR });
  await fs.writeFile(path.join(REPO_CLONE_DIR, 'initial'), 'foobar');
  await util.wrappedExec(`git add -A .`, { cwd: REPO_CLONE_DIR });
  await util.wrappedExec(`git config user.name "Test User"`, {
    cwd: REPO_CLONE_DIR,
  });
  await util.wrappedExec(`git config user.email "test@example.com"`, {
    cwd: REPO_CLONE_DIR,
  });
  await util.wrappedExec(`git commit -m initial`, { cwd: REPO_CLONE_DIR });
  await util.wrappedExec(`git push origin master`, { cwd: REPO_CLONE_DIR });

  // Create dummy data
  await mkdirP(DATA_DIR);
  await mkdirP(path.join(DATA_DIR, 'dummy'));
  await fs.writeFile(path.join(DATA_DIR, 'dummy', 'baz'), 'foobar');
  await fs.writeFile(path.join(DATA_DIR, 'dummy', '.bat'), 'foobar');

  // Run Action
  await util.runWithGithubEnv(
    path.basename(__filename),
    {
      REPO: 'ssh://git@git-ssh/git-server/repos/ssh-existing-branch.git',
      BRANCH: 'master',
      FOLDER: DATA_DIR,
      SSH_PRIVATE_KEY: (await fs.readFile(util.SSH_PRIVATE_KEY)).toString(),
      KNOWN_HOSTS_FILE: util.KNOWN_HOSTS,
    },
    's0/test',
    {},
    's0'
  );

  // Check that the log of the repo is as expected
  // (check tree-hash, commit message, and author)
  const log = (
    await util.exec(
      'git log --pretty="format:msg:%s%ntree:%T%nauthor:%an <%ae>" master',
      {
        cwd: REPO_DIR,
      }
    )
  ).stdout;
  const sha = await util.getRepoSha();
  const cleanedLog = log.replace(sha, '<sha>');
  expect(cleanedLog).toMatchSnapshot();
});
