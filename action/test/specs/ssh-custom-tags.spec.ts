import fsModule, { promises as fs } from 'fs';
import * as path from 'path';
import git from 'isomorphic-git';
import { mkdirP, rmRF } from '@actions/io';

import * as util from '../util';

const REPO_DIR = path.join(util.REPOS_DIR, 'ssh-custom-tags.git');
const DATA_DIR = path.join(util.DATA_DIR, 'ssh-custom-tags');

it('Test custom tags', async () => {
  await rmRF(REPO_DIR);
  await rmRF(DATA_DIR);

  // Create empty repo
  await mkdirP(REPO_DIR);
  await util.wrappedExec('git init --bare', { cwd: REPO_DIR });

  // Create dummy data
  await mkdirP(DATA_DIR);
  await mkdirP(path.join(DATA_DIR, 'dummy'));
  await fs.writeFile(path.join(DATA_DIR, 'dummy', 'baz'), 'foobar');
  await fs.writeFile(path.join(DATA_DIR, 'dummy', '.bat'), 'foobar');

  // Run Action
  await util.runWithGithubEnv(
    path.basename(__filename),
    {
      REPO: 'ssh://git@git-ssh/git-server/repos/ssh-custom-tags.git',
      BRANCH: 'branch-a',
      FOLDER: DATA_DIR,
      SSH_PRIVATE_KEY: (await fs.readFile(util.SSH_PRIVATE_KEY)).toString(),
      KNOWN_HOSTS_FILE: util.KNOWN_HOSTS,
    },
    's0/test',
    {},
    's0'
  );
  // Run the action again to make sure that a commit is added even when there are
  // no content changes
  await util.runWithGithubEnv(
    path.basename(__filename),
    {
      REPO: 'ssh://git@git-ssh/git-server/repos/ssh-custom-tags.git',
      BRANCH: 'branch-a',
      FOLDER: DATA_DIR,
      SSH_PRIVATE_KEY: (await fs.readFile(util.SSH_PRIVATE_KEY)).toString(),
      KNOWN_HOSTS_FILE: util.KNOWN_HOSTS,
      MESSAGE: 'This is another commit follow up with no content changes',
      TAG: 'foo-bar-tag-v0.1.2',
    },
    's0/test',
    {},
    's0'
  );

  {
    // Check that the log of the branch is as expected
    let log = (
      await util.exec(
        'git log --pretty="format:msg:%B%ntree:%T%nauthor:%an <%ae>" branch-a',
        {
          cwd: REPO_DIR,
        }
      )
    ).stdout;
    const fullSha = await util.getFullRepoSha();
    const sha = fullSha.substr(0, 7);
    const cleanedLog = log.replace(fullSha, '<long-sha>').replace(sha, '<sha>');
    expect(cleanedLog).toMatchSnapshot();
  }

  {
    // Check that the log got the tag is also as expected
    let log = (
      await util.exec(
        'git log --pretty="format:msg:%B%ntree:%T%nauthor:%an <%ae>" foo-bar-tag-v0.1.2',
        {
          cwd: REPO_DIR,
        }
      )
    ).stdout;
    const fullSha = await util.getFullRepoSha();
    const sha = fullSha.substr(0, 7);
    const cleanedLog = log.replace(fullSha, '<long-sha>').replace(sha, '<sha>');
    expect(cleanedLog).toMatchSnapshot();
  }

  // Ensure that commits for branch and tag are identical
  const tagSha = await git.resolveRef({
    fs: fsModule,
    gitdir: REPO_DIR,
    ref: 'refs/tags/foo-bar-tag-v0.1.2',
  });
  const branchSha = await git.resolveRef({
    fs: fsModule,
    gitdir: REPO_DIR,
    ref: 'refs/heads/branch-a',
  });
  expect(tagSha).toEqual(branchSha);
});
