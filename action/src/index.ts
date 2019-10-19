import gitUrlParse from "git-url-parse";

// Environment Variables

/**
 * The URL of the repository to push to, one-of:
 * 
 * * an ssh URL to a repository
 */
const REPO = process.env.REPO;
/**
 * The name of the branch to push to
 */
const BRANCH = process.env.BRANCH;
/**
 * Which subdirectory in the repository to we want to push as the contents of the branch
 */
const FOLDER = process.env.FOLDER;
/**
 * The private key to use for publishing if REPO is an SSH repo
 */
const SSH_PRIVATE_KEY = process.env.SSH_PRIVATE_KEY;

interface BaseConfig {
  branch: string;
  folder: string;
}

interface SshConfig extends BaseConfig {
  mode: 'ssh';
  url: string;
  privateKey: string;
}

type Config = SshConfig;

const config: Config = (() => {
  if (!REPO)
    throw new Error('REPO must be specified');
  if (!BRANCH)
    throw new Error('BRANCH must be specified');
  if (!FOLDER)
    throw new Error('FOLDER must be specified');

  // Determine the type of URL
  const branch = BRANCH;
  const folder = FOLDER;
  const url = gitUrlParse(REPO);

  if (url.protocol === 'ssh') {
    if (!SSH_PRIVATE_KEY)
      throw new Error('SSH_PRIVATE_KEY must be specified when REPO uses ssh');
    const config: Config = {
      branch,
      folder,
      mode: 'ssh',
      url: REPO,
      privateKey: SSH_PRIVATE_KEY
    }
    return config;
  }
  throw new Error('Unsupported REPO URL');
})();
