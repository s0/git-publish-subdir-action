import * as path from 'path';

import * as util from '../util';

const REPO_DIR = path.join(util.REPOS_DIR, 'ssh-skip-empty-commits.git');
const DATA_DIR = path.join(util.DATA_DIR, 'ssh-skip-empty-commits');

it('Skip empty commits', async () => {

  // Create empty repo
  await util.mkdir(REPO_DIR);
  await util.execWithOutput('git init --bare', { cwd: REPO_DIR });

  // Create dummy data
  await util.mkdir(DATA_DIR);
  await util.mkdir(path.join(DATA_DIR, 'dummy'));
  await util.writeFile(path.join(DATA_DIR, 'dummy', 'baz'), 'foobar');
  await util.writeFile(path.join(DATA_DIR, 'dummy', '.bat'), 'foobar');

  // Run Action
  await util.runWithGithubEnv(
    path.basename(__filename),
    {
      REPO: 'ssh://git@git-ssh/git-server/repos/ssh-skip-empty-commits.git',
      BRANCH: 'branch-a',
      FOLDER: DATA_DIR,
      SSH_PRIVATE_KEY: (await util.readFile(util.SSH_PRIVATE_KEY)).toString(),
      KNOWN_HOSTS_FILE: util.KNOWN_HOSTS,
      SKIP_EMPTY_COMMITS: 'true',
    },
    's0/test',
    {},
    's0',
  );
  const fullSha1 = await util.getFullRepoSha();
  // Change files and run action again
  await util.writeFile(path.join(DATA_DIR, 'dummy', 'bat'), 'foobar');
  await util.runWithGithubEnv(
    path.basename(__filename),
    {
      REPO: 'ssh://git@git-ssh/git-server/repos/ssh-skip-empty-commits.git',
      BRANCH: 'branch-a',
      FOLDER: DATA_DIR,
      SSH_PRIVATE_KEY: (await util.readFile(util.SSH_PRIVATE_KEY)).toString(),
      KNOWN_HOSTS_FILE: util.KNOWN_HOSTS,
      SKIP_EMPTY_COMMITS: 'true',
    },
    's0/test',
    {},
    's0',
  );
  const fullSha2 = await util.getFullRepoSha();
  // Run the action again with no content changes to test skip behaviour
  await util.runWithGithubEnv(
    path.basename(__filename),
    {
      REPO: 'ssh://git@git-ssh/git-server/repos/ssh-skip-empty-commits.git',
      BRANCH: 'branch-a',
      FOLDER: DATA_DIR,
      SSH_PRIVATE_KEY: (await util.readFile(util.SSH_PRIVATE_KEY)).toString(),
      KNOWN_HOSTS_FILE: util.KNOWN_HOSTS,
      SKIP_EMPTY_COMMITS: 'true',
    },
    's0/test',
    {},
    's0',
  );

  // Check that the log of the repo is as expected
  // (check tree-hash, commit message, and author)
  // TODO: test {msg} placeholder and running action outside of a git repo
  let log = (await util.exec(
    'git log --pretty="format:msg:%B%ntree:%T%nauthor:%an <%ae>" branch-a',
    {
      cwd: REPO_DIR
    }
  )).stdout;
  const sha1 = fullSha1.substr(0, 7);
  const sha2 = fullSha2.substr(0, 7);
  const cleanedLog = log.replace(sha1, '<sha1>').replace(sha2, '<sha2>');
  expect(cleanedLog).toMatchSnapshot();
});