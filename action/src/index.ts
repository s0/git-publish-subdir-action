import * as child_process from 'child_process';
import * as fs from 'fs';
import gitUrlParse from "git-url-parse";
import { homedir, tmpdir } from 'os';
import * as path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const exec = promisify(child_process.exec);
const copyFile = promisify(fs.copyFile);
const mkdir = promisify(fs.mkdir);
const mkdtemp = promisify(fs.mkdtemp);

export interface EnvironmentVariables {
  /**
   * The URL of the repository to push to, either:
   *
   * * an ssh URL to a repository
   * * the string `"self"`
   */
  REPO?: string;
  /**
   * The name of the branch to push to
   */
  BRANCH?: string;
  /**
   * Which subdirectory in the repository to we want to push as the contents of the branch
   */
  FOLDER?: string;
  /**
   * The private key to use for publishing if REPO is an SSH repo
   */
  SSH_PRIVATE_KEY?: string;
  /**
   * The file path of a known_hosts file with fingerprint of the relevant server
   */
  KNOWN_HOSTS_FILE?: string;
  /**
   * The GITHUB_TOKEN secret
   */
  GITHUB_TOKEN?: string;

  // Implicit environment variables passed by GitHub

  GITHUB_REPOSITORY?: string;
  GITHUB_EVENT_PATH?: string;
  /** The name of the person / app that that initiated the workflow */
  GITHUB_ACTOR?: string;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv extends EnvironmentVariables {}
  }
}

const ENV: EnvironmentVariables = process.env;

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

// Paths

const REPO_SELF = 'self';
const RESOURCES = path.join(path.dirname(__dirname), 'resources');
const KNOWN_HOSTS_GITHUB = path.join(RESOURCES, 'known_hosts_github.com');
const SSH_FOLDER = path.join(homedir(), '.ssh');
const KNOWN_HOSTS_TARGET = path.join(SSH_FOLDER, 'known_hosts');

const SSH_AGENT_PID_EXTRACT = /SSH_AGENT_PID=([0-9]+);/;

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

interface SelfConfig extends BaseConfig {
  mode: 'self';
}

type Config = SshConfig | SelfConfig;

/**
 * The GitHub event that triggered this action
 */
export interface Event {
  pusher?: {
    email?: string;
    name?: string;
  }
}

const config: Config = (() => {
  if (!ENV.REPO)
    throw new Error('REPO must be specified');
  if (!ENV.BRANCH)
    throw new Error('BRANCH must be specified');
  if (!ENV.FOLDER)
    throw new Error('FOLDER must be specified');

  const repo = ENV.REPO;
  const branch = ENV.BRANCH;
  const folder = ENV.FOLDER;

  // Determine the type of URL
  if (repo === REPO_SELF) {
    if (!ENV.GITHUB_TOKEN)
      throw new Error('GITHUB_TOKEN must be specified when REPO == self');
    if (!ENV.GITHUB_REPOSITORY)
      throw new Error('GITHUB_REPOSITORY must be specified when REPO == self');
    const url = `https://x-access-token:${ENV.GITHUB_TOKEN}@github.com/${ENV.GITHUB_REPOSITORY}.git`
    const config: Config = {
      repo: url,
      branch,
      folder,
      mode: 'self'
    };
    return config;
  }
  const parsedUrl = gitUrlParse(repo);

  if (parsedUrl.protocol === 'ssh') {
    if (!ENV.SSH_PRIVATE_KEY)
      throw new Error('SSH_PRIVATE_KEY must be specified when REPO uses ssh');
    const config: Config = {
      repo,
      branch,
      folder,
      mode: 'ssh',
      parsedUrl,
      privateKey: ENV.SSH_PRIVATE_KEY,
      knownHostsFile: ENV.KNOWN_HOSTS_FILE
    };
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

  // Calculate paths that use temp diractory

  const TMP_PATH = await mkdtemp(path.join(tmpdir(), 'git-publish-subdir-action-'));
  const REPO_TEMP = path.join(TMP_PATH, 'repo');
  const SSH_AUTH_SOCK = path.join(TMP_PATH, 'ssh_agent.sock');

  if (!ENV.GITHUB_EVENT_PATH)
    throw new Error('Expected GITHUB_EVENT_PATH');

  const event: Event = JSON.parse((await readFile(ENV.GITHUB_EVENT_PATH)).toString());

  const name = event.pusher && event.pusher.name || ENV.GITHUB_ACTOR || 'Git Publish Subdirectory';
  const email = event.pusher && event.pusher.email || (ENV.GITHUB_ACTOR ? `${ENV.GITHUB_ACTOR}@users.noreply.github.com` : 'nobody@nowhere');

  // Set Git Config
  await exec(`git config --global user.name "${name}"`);
  await exec(`git config --global user.email "${email}"`);

  // Get current sha of repo to use in commit message
  const sha = (await exec(`git rev-parse HEAD`)).stdout.trim().substr(0, 7);

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

    // Setup ssh-agent with private key
    console.log(`Setting up ssh-agent on ${SSH_AUTH_SOCK}`);
    const sshAgentMatch = SSH_AGENT_PID_EXTRACT.exec((await exec(`ssh-agent -a ${SSH_AUTH_SOCK}`, {env})).stdout);
    if (!sshAgentMatch)
      throw new Error('Unexpected output from ssh-agent');
    env.SSH_AGENT_PID = sshAgentMatch[1];
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
    env
  }).catch(err => {
    const s = err.toString();
    if (config.mode === 'ssh') {
      if (s.indexOf("Host key verification failed") !== -1) {
        console.error(KNOWN_HOSTS_ERROR(config.parsedUrl.resource));
      } else if (s.indexOf("Permission denied (publickey)") !== -1) {
        console.error(SSH_KEY_ERROR);
      }
    }
    throw err;
  });

  // Fetch branch if it exists
  await exec(`git fetch -u origin ${config.branch}:${config.branch}`, { env, cwd: REPO_TEMP }).catch(err => {
    const s = err.toString();
    if (s.indexOf('Couldn\'t find remote ref') === -1) {
      console.error('##[warning] Failed to fetch target branch, probably doesn\'t exist')
      console.error(err);
    }
  });

  // Check if branch already exists
  console.log(`##[info] Checking if branch ${config.branch} exists already`);
  const branchCheck = await exec(`git branch --list "${config.branch}"`, {env, cwd: REPO_TEMP });
  if (branchCheck.stdout.trim() === '') {
    // Branch does not exist yet, let's create an initial commit
    console.log(`##[info] ${config.branch} does not exist, creating initial commit`);
    await exec(`git checkout --orphan "${config.branch}"`, { env, cwd: REPO_TEMP });
    await exec(`git rm -rf .`, { env, cwd: REPO_TEMP }).catch(err => { });
    await exec(`touch README.md`, { env, cwd: REPO_TEMP });
    await exec(`git add README.md`, { env, cwd: REPO_TEMP });
    await exec(`git commit -m "Initial ${config.branch} commit"`, { env, cwd: REPO_TEMP });
    await exec(`git push "${config.repo}" "${config.branch}"`, { env, cwd: REPO_TEMP });
  }

  // Update contents of branch
  console.log(`##[info] Updating branch ${config.branch}`);
  await exec(`git checkout "${config.branch}"`, { env, cwd: REPO_TEMP });
  await exec(`git rm -rf .`, { env, cwd: REPO_TEMP }).catch(err => { });
  const folder = path.resolve(process.cwd(), config.folder);
  console.log(`##[info] Copying all files from ${folder}`);
  // TODO: replace this copy with a node implementation
  await exec(`cp -rT ${folder}/ ./`, { env, cwd: REPO_TEMP });
  await exec(`git add -A .`, { env, cwd: REPO_TEMP });
  await exec(`git commit --allow-empty -m "Update ${config.branch} to output generated at ${sha}"`, { env, cwd: REPO_TEMP });
  console.log(`##[info] Pushing`);
  const push = await exec(`git push origin "${config.branch}"`, { env, cwd: REPO_TEMP });
  console.log(push.stdout);
  console.log(`##[info] Deployment Successful`);

  if (config.mode === 'ssh') {
    console.log(`##[info] Killing ssh-agent`);
    await exec(`ssh-agent -k`, { env });
  }

})().catch(err => {
  console.error(err);
  process.exit(1);
});
