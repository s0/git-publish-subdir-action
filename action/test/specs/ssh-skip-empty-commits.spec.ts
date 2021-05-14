import { promises as fs } from 'fs';
import * as path from 'path';
import { mkdirP } from '@actions/io';

import * as util from '../util';
import { prepareTestFolders } from '../util/io';

it('Skip empty commits', async () => {
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
      SKIP_EMPTY_COMMITS: 'true',
    },
    's0/test',
    {},
    's0'
  );
  const fullSha1 = await util.getFullRepoSha();
  // Change files and run action again
  await fs.writeFile(path.join(folders.dataDir, 'dummy', 'bat'), 'foobar');
  await util.runWithGithubEnv(
    path.basename(__filename),
    {
      REPO: folders.repoUrl,
      BRANCH: 'branch-a',
      FOLDER: folders.dataDir,
      SSH_PRIVATE_KEY: (await fs.readFile(util.SSH_PRIVATE_KEY)).toString(),
      KNOWN_HOSTS_FILE: util.KNOWN_HOSTS,
      SKIP_EMPTY_COMMITS: 'true',
    },
    's0/test',
    {},
    's0'
  );
  const fullSha2 = await util.getFullRepoSha();
  // Run the action again with no content changes to test skip behaviour
  await util.runWithGithubEnv(
    path.basename(__filename),
    {
      REPO: folders.repoUrl,
      BRANCH: 'branch-a',
      FOLDER: folders.dataDir,
      SSH_PRIVATE_KEY: (await fs.readFile(util.SSH_PRIVATE_KEY)).toString(),
      KNOWN_HOSTS_FILE: util.KNOWN_HOSTS,
      SKIP_EMPTY_COMMITS: 'true',
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
  const sha1 = fullSha1.substr(0, 7);
  const sha2 = fullSha2.substr(0, 7);
  const cleanedLog = log.replace(sha1, '<sha1>').replace(sha2, '<sha2>');
  expect(cleanedLog).toMatchSnapshot();
});
