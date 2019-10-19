import * as child_process from 'child_process';
import * as fs from 'fs';
import gitUrlParse from "git-url-parse";
import { homedir } from 'os';
import * as path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const exec = promisify(child_process.exec);
const copyFile = promisify(fs.copyFile);
const mkdir = promisify(fs.mkdir);

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
/**
 * The file path of a known_hosts file with fingerprint of the relevant server
 */
const KNOWN_HOSTS_FILE = process.env.KNOWN_HOSTS_FILE;

const GITHUB_EVENT_PATH = process.env.GITHUB_EVENT_PATH;

// Paths

const REPO_TEMP = '/tmp/repo';
const RESOURCES = path.join(path.dirname(__dirname), 'resources');
const KNOWN_HOSTS_GITHUB = path.join(RESOURCES, 'known_hosts_github.com');
const SSH_FOLDER = path.join(homedir(), '.ssh'); // TODO: fix
const KNOWN_HOSTS_TARGET = path.join(SSH_FOLDER, 'known_hosts');
const SSH_AUTH_SOCK = '/tmp/ssh_agent.sock'

// Error messages

const KNOWN_HOSTS_WARNING = `
##[warning] KNOWN_HOSTS_FILE not set
This will probably mean that host verification will fail later on
`;

const KNOWN_HOSTS_ERROR = (host: string) => `
##[error] Host key verification failed!
This is probably because you forgot to supply a value for KNOWN_HOSTS_FILE
or the file is invalid or doesn't correctly verify the host ${host}
`;

const SSH_KEY_ERROR = `
##[error] Permission denied (publickey)
Make sure that the ssh private key is set correctly, and
that the public key has been added to the target repo
`;

const INVALID_KEY_ERROR = `
##[error] Error loading key: invalid format
Please check that you're setting the environment variable
SSH_PRIVATE_KEY correctly
`

interface BaseConfig {
  branch: string;
  folder: string;
  repo: string;
}

interface SshConfig extends BaseConfig {
  mode: 'ssh';
  parsedUrl: gitUrlParse.GitUrl;
  privateKey: string;
  knownHostsFile?: string;
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

  const repo = REPO;
  const branch = BRANCH;
  const folder = FOLDER;

  // Determine the type of URL
  const parsedUrl = gitUrlParse(REPO);

  if (parsedUrl.protocol === 'ssh') {
    if (!SSH_PRIVATE_KEY)
      throw new Error('SSH_PRIVATE_KEY must be specified when REPO uses ssh');
    const config: Config = {
      repo,
      branch,
      folder,
      mode: 'ssh',
      parsedUrl,
      privateKey: SSH_PRIVATE_KEY,
      knownHostsFile: KNOWN_HOSTS_FILE
    }
    return config;
  }
  throw new Error('Unsupported REPO URL');
})();

const writeToProcess = (command: string, args: string[], opts: {env: { [id: string]: string }; data: string;} ) => new Promise((resolve, reject) => {
  const child = child_process.spawn(command, args, {
    env: opts.env,
    stdio: "pipe"
  });
  child.stdin.setDefaultEncoding('utf-8');
  child.stdin.write(opts.data);
  child.stdin.end();
  child.on('error', reject);
  let stderr = '';
  child.stdout.on('data', (data) => {
    console.log(data.toString());
  });
  child.stderr.on('data', (data) => {
    stderr += data;
    console.error(data.toString());
  });
  child.on('close', (code) => {
    if (code === 0) {
      resolve();
    } else {
      reject(new Error(stderr));
    }
  });
});

(async () => {

  if (!GITHUB_EVENT_PATH)
    throw new Error('Expected GITHUB_EVENT_PATH');

  const event: Event = JSON.parse((await readFile(GITHUB_EVENT_PATH)).toString());

  const name = event.pusher && event.pusher.name || process.env.GITHUB_ACTOR || 'Git Publish Subdirectory';
  const email = event.pusher && event.pusher.email || (process.env.GITHUB_ACTOR ? `${process.env.GITHUB_ACTOR}@users.noreply.github.com` : 'nobody@nowhere');

  // Set Git Config
  await exec(`git config --global user.name "${name}"`);
  await exec(`git config --global user.email "${email}"`);

  // Environment to pass to children
  const env = Object.assign({}, process.env, {
    SSH_AUTH_SOCK
  });

  if (config.mode === 'ssh') {
    // Copy over the known_hosts file if set
    let known_hosts = config.knownHostsFile;
    // Use well-known known_hosts for certain domains
    if (!known_hosts && config.parsedUrl.resource === 'github.com') {
      known_hosts = KNOWN_HOSTS_GITHUB;
    }
    if (!known_hosts) {
      console.warn(KNOWN_HOSTS_WARNING);
    } else {
      await mkdir(SSH_FOLDER, {recursive: true});
      await copyFile(known_hosts, KNOWN_HOSTS_TARGET);
    }

    await writeToProcess('cat', [], {
      data: `here is some
      multiline
      test
      data`,
      env
    });

    console.log(config.privateKey.split('\n').length);
    console.log(config.privateKey[0]);
    console.log(config.privateKey[config.privateKey.length-1]);

    // Setup ssh-agent with private key
    console.log(`Setting up ssh-agent on ${SSH_AUTH_SOCK}`);
    await exec(`ssh-agent -a ${SSH_AUTH_SOCK}`, {env});
    console.log(`Adding private key to ssh-agent at ${SSH_AUTH_SOCK}`);
    await writeToProcess('ssh-add', ['-'], {
      data: config.privateKey + '\n',
      env
    }).catch(err => {
      const s = err.toString();
      if (s.indexOf("invalid format") !== -1) {
        console.error(INVALID_KEY_ERROR);
      }
      throw err;
    });
    console.log(`Private key added`);
  }

  // Clone the target repo
  await exec(`git clone "${config.repo}" "${REPO_TEMP}"`, {
    env: {
      SSH_AUTH_SOCK
    }
  }).catch(err => {
    const s = err.toString();
    if (s.indexOf("Host key verification failed") !== -1) {
      console.error(KNOWN_HOSTS_ERROR(config.parsedUrl.resource));
    } else if (s.indexOf("Permission denied (publickey)") !== -1) {
      console.error(SSH_KEY_ERROR);
    }
    throw err;
  });

  // Fetch branch if it exists
  await exec(`git fetch origin ${config.branch}:${config.branch}`).catch(() =>
    console.error('Failed to fetch target branch, probably doesn\'t exist')
  );
})().catch(err => {
  console.error(err);
  process.exit(1);
});
