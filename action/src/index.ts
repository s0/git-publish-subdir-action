import * as fs from 'fs';
import gitUrlParse from "git-url-parse";
import {promisify} from 'util';

const readFile = promisify(fs.readFile);

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

const GITHUB_EVENT_PATH = process.env.GITHUB_EVENT_PATH;

// Constants
const REPO_TEMP = '/tmp/repo';

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

interface Event {
  pusher?: {
    email?: string;
    name?: string;
  }
}

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


(async () => {

  if (!GITHUB_EVENT_PATH)
    throw new Error('Expected GITHUB_EVENT_PATH');

  const event: Event = JSON.parse((await readFile(GITHUB_EVENT_PATH)).toString());

  const name = event.pusher && event.pusher.name || process.env.GITHUB_ACTOR || 'Git Publish Subdirectory';
  const email = event.pusher && event.pusher.email || process.env.GITHUB_ACTOR ? `${process.env.GITHUB_ACTOR}@users.noreply.github.com` : 'nobody@nowhere';

  console.log(event);
  console.log(name);
  console.log(email);
})();
