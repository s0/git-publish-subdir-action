import * as path from 'path';

import * as util from '../util';

const REPO_DIR = path.join(util.REPOS_DIR, 'ssh-no-branch.git');
const DATA_DIR = path.join(util.DATA_DIR, 'ssh-no-branch');

it('Deploy to a new branch over ssh', async () => {
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
      REPO: 'ssh://git@git-ssh/git-server/repos/ssh-no-branch.git',
      BRANCH: 'branch-a',
      FOLDER: DATA_DIR,
      SSH_PRIVATE_KEY: (await util.readFile(util.SSH_PRIVATE_KEY)).toString(),
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
      'git log --pretty="format:msg:%s%ntree:%T%nauthor:%an <%ae>" branch-a',
      {
        cwd: REPO_DIR,
      }
    )
  ).stdout;
  const sha = await util.getRepoSha();
  const cleanedLog = log.replace(sha, '<sha>');
  expect(cleanedLog).toMatchSnapshot();
});
