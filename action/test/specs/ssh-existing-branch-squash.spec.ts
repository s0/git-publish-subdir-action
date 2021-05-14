import { promises as fs } from 'fs';
import * as path from 'path';
import { mkdirP } from '@actions/io';

import * as util from '../util';
import { prepareTestFolders } from '../util/io';

it('Deploy to a existing branch over ssh, and squash commits', async () => {
  const folders = await prepareTestFolders({ __filename });

  // Create empty repo
  await util.wrappedExec('git init --bare', { cwd: folders.repoDir });

  // Clone repo, and create an initial commit
  await util.wrappedExec(`git clone "${folders.repoDir}" clone`, {
    cwd: folders.workDir,
  });
  await util.wrappedExec(`git config user.name "Test User"`, {
    cwd: folders.repoCloneDir,
  });
  await util.wrappedExec(`git config user.email "test@example.com"`, {
    cwd: folders.repoCloneDir,
  });
  // Create first commit
  await fs.writeFile(path.join(folders.repoCloneDir, 'initial'), 'foobar');
  await util.wrappedExec(`git add -A .`, { cwd: folders.repoCloneDir });
  await util.wrappedExec(`git commit -m initial`, {
    cwd: folders.repoCloneDir,
  });
  await util.wrappedExec(`git push origin master`, {
    cwd: folders.repoCloneDir,
  });
  // Create second commit
  await fs.writeFile(path.join(folders.repoCloneDir, 'secondary'), 'foobar');
  await util.wrappedExec(`git add -A .`, { cwd: folders.repoCloneDir });
  await util.wrappedExec(`git commit -m secondary`, {
    cwd: folders.repoCloneDir,
  });
  await util.wrappedExec(`git push origin master`, {
    cwd: folders.repoCloneDir,
  });

  // Create dummy data
  await mkdirP(folders.dataDir);
  await mkdirP(path.join(folders.dataDir, 'dummy'));
  await fs.writeFile(path.join(folders.dataDir, 'dummy', 'baz'), 'foobar');
  await fs.writeFile(path.join(folders.dataDir, 'dummy', '.bat'), 'foobar');

  // Run Action
  await util.runWithGithubEnv(
    path.basename(__filename),
    {
      REPO: folders.repoUrl,
      BRANCH: 'master',
      FOLDER: folders.dataDir,
      SSH_PRIVATE_KEY: (await fs.readFile(util.SSH_PRIVATE_KEY)).toString(),
      KNOWN_HOSTS_FILE: util.KNOWN_HOSTS,
      SQUASH_HISTORY: 'true',
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
        cwd: folders.repoDir,
      }
    )
  ).stdout;
  const sha = await util.getRepoSha();
  const cleanedLog = log.replace(sha, '<sha>');
  expect(cleanedLog).toMatchSnapshot();
});
