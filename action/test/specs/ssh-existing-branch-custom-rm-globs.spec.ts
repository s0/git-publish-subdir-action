import * as path from 'path';
import { mkdirP, rmRF } from '@actions/io';

import * as util from '../util';
import { listTree } from '../util/git';

const UNIQUE_DIRNAME = `${path.basename(__filename)}.git`;

const REPO_DIR = path.join(util.REPOS_DIR, UNIQUE_DIRNAME);
const WORK_DIR = path.join(util.DATA_DIR, __filename);
const REPO_CLONE_DIR = path.join(WORK_DIR, 'clone');
const DATA_DIR = path.join(WORK_DIR, 'data');

it('Check that only target deleted files are removed', async () => {
  // Create empty repo
  await rmRF(REPO_DIR);
  await mkdirP(REPO_DIR);
  await util.wrappedExec('git init --bare', { cwd: REPO_DIR });

  // Clone repo, and create an initial commit
  await rmRF(WORK_DIR);
  await mkdirP(WORK_DIR);
  await util.wrappedExec(`git clone "${REPO_DIR}" clone`, { cwd: WORK_DIR });
  await util.writeFile(path.join(REPO_CLONE_DIR, 'initial1'), 'foobar1');
  await util.writeFile(path.join(REPO_CLONE_DIR, 'initial2'), 'foobar2');
  await mkdirP(path.join(REPO_CLONE_DIR, 'folder'));
  await util.writeFile(path.join(REPO_CLONE_DIR, 'folder', 'a'), 'foobar1');
  await util.writeFile(path.join(REPO_CLONE_DIR, 'folder', 'b'), 'foobar2');
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
  await rmRF(DATA_DIR);
  await mkdirP(path.join(DATA_DIR, 'dummy'));
  await util.writeFile(path.join(DATA_DIR, 'dummy', 'baz'), 'foobar');
  await util.writeFile(path.join(DATA_DIR, 'dummy', '.bat'), 'foobar');

  // Setup globs
  const globPath = path.join(WORK_DIR, '.globs');
  await util.writeFile(
    globPath,
    `
    folder/*
    !folder/a
    ini*al2
    `
  );

  // Run Action
  await util.runWithGithubEnv(
    path.basename(__filename),
    {
      REPO: `ssh://git@git-ssh/git-server/repos/${UNIQUE_DIRNAME}`,
      BRANCH: 'master',
      FOLDER: DATA_DIR,
      SSH_PRIVATE_KEY: (await util.readFile(util.SSH_PRIVATE_KEY)).toString(),
      KNOWN_HOSTS_FILE: util.KNOWN_HOSTS,
      CLEAR_GLOBS_FILE: globPath,
    },
    's0/test',
    {},
    's0'
  );

  // Check that the list of files in the root of the target repo is as expected
  expect(await listTree(REPO_DIR)).toEqual([
    '.',
    'dummy',
    'dummy/.bat',
    'dummy/baz',
    'folder',
    'folder/a',
    'initial1',
  ]);

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
