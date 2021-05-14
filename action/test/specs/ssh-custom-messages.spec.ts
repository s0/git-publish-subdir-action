import { promises as fs } from 'fs';
import * as path from 'path';
import { mkdirP } from '@actions/io';

import * as util from '../util';
import { prepareTestFolders } from '../util/io';

it('Test custom message templates', async () => {
  const folders = await prepareTestFolders({ __filename });
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
      MESSAGE:
        'This is a test message with placeholders:\n* {long-sha}\n* {sha}\n* {branch}',
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
    },
    's0/test',
    {},
    's0'
  );

  // Check that the log of the repo is as expected
  // (check tree-hash, commit message, and author)
  // TODO: test {msg} placeholder and running action outside of a git repo
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
});
