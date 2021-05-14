import fsModule, { promises as fs } from 'fs';
import * as path from 'path';
import git from 'isomorphic-git';
import { mkdirP } from '@actions/io';

import * as util from '../util';
import { prepareTestFolders } from '../util/io';

it('Test custom tags', async () => {
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
      REPO: folders.repoUrl,
      BRANCH: 'branch-a',
      FOLDER: folders.dataDir,
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
          cwd: folders.repoDir,
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
          cwd: folders.repoDir,
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
    gitdir: folders.repoDir,
    ref: 'refs/tags/foo-bar-tag-v0.1.2',
  });
  const branchSha = await git.resolveRef({
    fs: fsModule,
    gitdir: folders.repoDir,
    ref: 'refs/heads/branch-a',
  });
  expect(tagSha).toEqual(branchSha);
});
