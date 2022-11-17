import * as child_process from 'child_process';
import { stream as fgStream } from 'fast-glob';
import fsModule, { promises as fs } from 'fs';
import gitUrlParse from 'git-url-parse';
import { homedir, tmpdir } from 'os';
import * as path from 'path';
import git from 'isomorphic-git';
import { mkdirP, cp } from '@actions/io';

export type Console = {
  readonly log: (...msg: unknown[]) => void;
  readonly error: (...msg: unknown[]) => void;
  readonly warn: (...msg: unknown[]) => void;
};

/**
 * Custom wrapper around the child_process module
 */
export const exec = async (
  cmd: string,
  opts: {
    env?: any;
    cwd?: string;
    log: Console;
  }
) => {
  const { log } = opts;
  const env = opts?.env || {};
  const ps = child_process.spawn('bash', ['-c', cmd], {
    env: {
      HOME: process.env.HOME,
      ...env,
    },
    cwd: opts.cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const output = {
    stderr: '',
    stdout: '',
  };

  // We won't be providing any input to command
  ps.stdin.end();
  ps.stdout.on('data', (data) => {
    output.stdout += data;
    log.log(`data`, data.toString());
  });
  ps.stderr.on('data', (data) => {
    output.stderr += data;
    log.error(data.toString());
  });

  return new Promise<{
    stderr: string;
    stdout: string;
  }>((resolve, reject) =>
    ps.on('close', (code) => {
      if (code !== 0) {
        reject(
          new Error('Process exited with code: ' + code + ':\n' + output.stderr)
        );
      } else {
        resolve(output);
      }
    })
  );
};

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
  /**
   * Set to "true" to clear all of the history of the target branch and force push
   */
  SQUASH_HISTORY?: string;
  /**
   * Set to "true" to avoid pushing commits that don't change any files.
   *
   * This is useful for example when you want to be able to easily identify
   * which upstream changes resulted in changes to this repository.
   */
  SKIP_EMPTY_COMMITS?: string;
  /**
   * An optional template string to use for the commit message,
   * if not provided, a default template is used.
   *
   * A number of placeholders are available to use in template strings:
   * * `{target-branch}` - the name of the target branch being updated
   * * `{sha}` - the 7-character sha of the HEAD of the current branch
   * * `{long-sha}` - the full sha of the HEAD of the current branch
   * * `{msg}` - the commit message for the HEAD of the current branch
   */
  MESSAGE?: string;
  /**
   * An optional path to a file to use as a list of globs defining which files
   * to delete when clearing the target branch
   */
  CLEAR_GLOBS_FILE?: string;
  /**
   * An optional string in git-check-ref-format to use for tagging the commit
   */
  TAG?: string;

  /**
   * An optional string to use as the commiter name on the git commit.
   */
  COMMIT_NAME?: string;

  /**
   * An optional string to use as the commiter email on the git commit.
   */
  COMMIT_EMAIL?: string;

  // Implicit environment variables passed by GitHub

  GITHUB_REPOSITORY?: string;
  GITHUB_EVENT_PATH?: string;
  /** The name of the person / app that that initiated the workflow */
  GITHUB_ACTOR?: string;
  /**
   * An optional string to change the directory where the files are copied to
   */
  TARGET_DIR?: string;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv extends EnvironmentVariables {}
  }
}

const DEFAULT_MESSAGE = 'Update {target-branch} to output generated at {sha}';

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
`;

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
  squashHistory: boolean;
  skipEmptyCommits: boolean;
  message: string;
  tag?: string;
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
  };
}

const genConfig: (env?: EnvironmentVariables) => Config = (
  env = process.env
) => {
  if (!env.REPO) throw new Error('REPO must be specified');
  if (!env.BRANCH) throw new Error('BRANCH must be specified');
  if (!env.FOLDER) throw new Error('FOLDER must be specified');

  const repo = env.REPO;
  const branch = env.BRANCH;
  const folder = env.FOLDER;
  const squashHistory = env.SQUASH_HISTORY === 'true';
  const skipEmptyCommits = env.SKIP_EMPTY_COMMITS === 'true';
  const message = env.MESSAGE || DEFAULT_MESSAGE;
  const tag = env.TAG;

  // Determine the type of URL
  if (repo === REPO_SELF) {
    if (!env.GITHUB_TOKEN)
      throw new Error('GITHUB_TOKEN must be specified when REPO == self');
    if (!env.GITHUB_REPOSITORY)
      throw new Error('GITHUB_REPOSITORY must be specified when REPO == self');
    const url = `https://x-access-token:${env.GITHUB_TOKEN}@github.com/${env.GITHUB_REPOSITORY}.git`;
    const config: Config = {
      repo: url,
      branch,
      folder,
      squashHistory,
      skipEmptyCommits,
      mode: 'self',
      message,
      tag,
    };
    return config;
  }
  const parsedUrl = gitUrlParse(repo);

  if (parsedUrl.protocol === 'ssh') {
    if (!env.SSH_PRIVATE_KEY)
      throw new Error('SSH_PRIVATE_KEY must be specified when REPO uses ssh');
    const config: Config = {
      repo,
      branch,
      folder,
      squashHistory,
      skipEmptyCommits,
      mode: 'ssh',
      parsedUrl,
      privateKey: env.SSH_PRIVATE_KEY,
      knownHostsFile: env.KNOWN_HOSTS_FILE,
      message,
      tag,
    };
    return config;
  }
  throw new Error('Unsupported REPO URL');
};

const writeToProcess = (
  command: string,
  args: string[],
  opts: {
    env: { [id: string]: string | undefined };
    data: string;
    log: Console;
  }
) =>
  new Promise<void>((resolve, reject) => {
    const child = child_process.spawn(command, args, {
      env: opts.env,
      stdio: 'pipe',
    });
    child.stdin.setDefaultEncoding('utf-8');
    child.stdin.write(opts.data);
    child.stdin.end();
    child.on('error', reject);
    let stderr = '';
    child.stdout.on('data', (data) => {
      /* istanbul ignore next */
      opts.log.log(data.toString());
    });
    child.stderr.on('data', (data) => {
      stderr += data;
      opts.log.error(data.toString());
    });
    child.on('close', (code) => {
      /* istanbul ignore else */
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr));
      }
    });
  });

export const main = async ({
  env = process.env,
  log,
}: {
  env?: EnvironmentVariables;
  log: Console;
}) => {
  const config = genConfig(env);

  // Calculate paths that use temp diractory

  const TMP_PATH = await fs.mkdtemp(
    path.join(tmpdir(), 'git-publish-subdir-action-')
  );
  const REPO_TEMP = path.join(TMP_PATH, 'repo');
  const SSH_AUTH_SOCK = path.join(TMP_PATH, 'ssh_agent.sock');

  if (!env.GITHUB_EVENT_PATH) throw new Error('Expected GITHUB_EVENT_PATH');

  const event: Event = JSON.parse(
    (await fs.readFile(env.GITHUB_EVENT_PATH)).toString()
  );

  const name =
    env.COMMIT_NAME ||
    event.pusher?.name ||
    env.GITHUB_ACTOR ||
    'Git Publish Subdirectory';
  const email =
    env.COMMIT_EMAIL ||
    event.pusher?.email ||
    (env.GITHUB_ACTOR
      ? `${env.GITHUB_ACTOR}@users.noreply.github.com`
      : 'nobody@nowhere');
  const tag = env.TAG;

  // Set Git Config
  await exec(`git config --global user.name "${name}"`, { log });
  await exec(`git config --global user.email "${email}"`, { log });

  interface GitInformation {
    commitMessage: string;
    sha: string;
  }

  /**
   * Get information about the current git repository
   */
  const getGitInformation = async (): Promise<GitInformation> => {
    // Get the root git directory
    let dir = process.cwd();
    while (true) {
      const isGitRepo = await fs
        .stat(path.join(dir, '.git'))
        .then((s) => s.isDirectory())
        .catch(() => false);
      if (isGitRepo) {
        break;
      }
      // We need to traverse up one
      const next = path.dirname(dir);
      if (next === dir) {
        log.log(
          `##[info] Not running in git directory, unable to get information about source commit`
        );
        return {
          commitMessage: '',
          sha: '',
        };
      } else {
        dir = next;
      }
    }

    // Get current sha of repo to use in commit message
    const gitLog = await git.log({
      fs: fsModule,
      depth: 1,
      dir,
    });
    const commit = gitLog.length > 0 ? gitLog[0] : undefined;
    if (!commit) {
      log.log(`##[info] Unable to get information about HEAD commit`);
      return {
        commitMessage: '',
        sha: '',
      };
    }
    return {
      // Use trim to remove the trailing newline
      commitMessage: commit.commit.message.trim(),
      sha: commit.oid,
    };
  };

  const gitInfo = await getGitInformation();

  // Environment to pass to children
  const childEnv = Object.assign({}, process.env, {
    SSH_AUTH_SOCK,
  });

  if (config.mode === 'ssh') {
    // Copy over the known_hosts file if set
    let known_hosts = config.knownHostsFile;
    // Use well-known known_hosts for certain domains
    if (!known_hosts && config.parsedUrl.resource === 'github.com') {
      known_hosts = KNOWN_HOSTS_GITHUB;
    }
    if (!known_hosts) {
      log.warn(KNOWN_HOSTS_WARNING);
    } else {
      await mkdirP(SSH_FOLDER);
      await fs.copyFile(known_hosts, KNOWN_HOSTS_TARGET);
    }

    // Setup ssh-agent with private key
    log.log(`Setting up ssh-agent on ${SSH_AUTH_SOCK}`);
    const sshAgentMatch = SSH_AGENT_PID_EXTRACT.exec(
      (await exec(`ssh-agent -a ${SSH_AUTH_SOCK}`, { log, env: childEnv }))
        .stdout
    );
    /* istanbul ignore if */
    if (!sshAgentMatch) throw new Error('Unexpected output from ssh-agent');
    childEnv.SSH_AGENT_PID = sshAgentMatch[1];
    log.log(`Adding private key to ssh-agent at ${SSH_AUTH_SOCK}`);
    await writeToProcess('ssh-add', ['-'], {
      data: config.privateKey + '\n',
      env: childEnv,
      log,
    });
    log.log(`Private key added`);
  }

  // Clone the target repo
  await exec(`git clone "${config.repo}" "${REPO_TEMP}"`, {
    log,
    env: childEnv,
  }).catch((err) => {
    const s = err.toString();
    /* istanbul ignore else */
    if (config.mode === 'ssh') {
      /* istanbul ignore else */
      if (s.indexOf('Host key verification failed') !== -1) {
        log.error(KNOWN_HOSTS_ERROR(config.parsedUrl.resource));
      } else if (s.indexOf('Permission denied (publickey') !== -1) {
        log.error(SSH_KEY_ERROR);
      }
    }
    throw err;
  });

  if (!config.squashHistory) {
    // Fetch branch if it exists
    await exec(`git fetch -u origin ${config.branch}:${config.branch}`, {
      log,
      env: childEnv,
      cwd: REPO_TEMP,
    }).catch((err) => {
      const s = err.toString();
      /* istanbul ignore if */
      if (s.indexOf("Couldn't find remote ref") === -1) {
        log.error(
          "##[warning] Failed to fetch target branch, probably doesn't exist"
        );
        log.error(err);
      }
    });

    // Check if branch already exists
    log.log(`##[info] Checking if branch ${config.branch} exists already`);
    const branchCheck = await exec(`git branch --list "${config.branch}"`, {
      log,
      env: childEnv,
      cwd: REPO_TEMP,
    });
    if (branchCheck.stdout.trim() === '') {
      // Branch does not exist yet, let's check it out as an orphan
      log.log(`##[info] ${config.branch} does not exist, creating as orphan`);
      await exec(`git checkout --orphan "${config.branch}"`, {
        log,
        env: childEnv,
        cwd: REPO_TEMP,
      });
    } else {
      await exec(`git checkout "${config.branch}"`, {
        log,
        env: childEnv,
        cwd: REPO_TEMP,
      });
    }
  } else {
    // Checkout a random branch so we can delete the target branch if it exists
    log.log('Checking out temp branch');
    await exec(`git checkout -b "${Math.random().toString(36).substring(2)}"`, {
      log,
      env: childEnv,
      cwd: REPO_TEMP,
    });
    // Delete the target branch if it exists
    await exec(`git branch -D "${config.branch}"`, {
      log,
      env: childEnv,
      cwd: REPO_TEMP,
    }).catch((err) => {});
    // Checkout target branch as an orphan
    await exec(`git checkout --orphan "${config.branch}"`, {
      log,
      env: childEnv,
      cwd: REPO_TEMP,
    });
    log.log('Checked out orphan');
  }

  // // Update contents of branch
  log.log(`##[info] Updating branch ${config.branch}`);

  /**
   * The list of globs we'll use for clearing
   */
  const globs = await (async () => {
    if (env.CLEAR_GLOBS_FILE) {
      // We need to use a custom mechanism to clear the files
      log.log(
        `##[info] Using custom glob file to clear target branch ${env.CLEAR_GLOBS_FILE}`
      );
      const globList = (await fs.readFile(env.CLEAR_GLOBS_FILE))
        .toString()
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s !== '');
      return globList;
    } else if (env.TARGET_DIR) {
      log.log(
        `##[info] Removing all files from target dir ${env.TARGET_DIR} on target branch`
      );
      return [`${env.TARGET_DIR}/**/*`, '!.git'];
    } else {
      // Remove all files
      log.log(`##[info] Removing all files from target branch`);
      return ['**/*', '!.git'];
    }
  })();
  const filesToDelete = fgStream(globs, {
    absolute: true,
    dot: true,
    followSymbolicLinks: false,
    cwd: REPO_TEMP,
  });
  // Delete all files from the filestream
  for await (const entry of filesToDelete) {
    await fs.unlink(entry);
  }
  const folder = path.resolve(process.cwd(), config.folder);
  const destinationFolder = env.TARGET_DIR ? env.TARGET_DIR : './';

  // Make sure the destination folder exists
  await mkdirP(path.resolve(REPO_TEMP, destinationFolder));

  log.log(`##[info] Copying all files from ${folder}`);
  await cp(`${folder}/`, `${REPO_TEMP}/${destinationFolder}/`, {
    recursive: true,
    copySourceDirectory: false,
  });
  await exec(`git add -A .`, { log, env: childEnv, cwd: REPO_TEMP });
  const message = config.message
    .replace(/\{target\-branch\}/g, config.branch)
    .replace(/\{sha\}/g, gitInfo.sha.substr(0, 7))
    .replace(/\{long\-sha\}/g, gitInfo.sha)
    .replace(/\{msg\}/g, gitInfo.commitMessage);
  await git.commit({
    fs: fsModule,
    dir: REPO_TEMP,
    message,
    author: { email, name },
  });
  if (tag) {
    log.log(`##[info] Tagging commit with ${tag}`);
    await git.tag({
      fs: fsModule,
      dir: REPO_TEMP,
      ref: tag,
      force: true,
    });
  }
  if (config.skipEmptyCommits) {
    log.log(`##[info] Checking whether contents have changed before pushing`);
    // Before we push, check whether it changed the tree,
    // and avoid pushing if not
    const head = await git.resolveRef({
      fs: fsModule,
      dir: REPO_TEMP,
      ref: 'HEAD',
    });
    const currentCommit = await git.readCommit({
      fs: fsModule,
      dir: REPO_TEMP,
      oid: head,
    });
    if (currentCommit.commit.parent.length === 1) {
      const previousCommit = await git.readCommit({
        fs: fsModule,
        dir: REPO_TEMP,
        oid: currentCommit.commit.parent[0],
      });
      if (currentCommit.commit.tree === previousCommit.commit.tree) {
        log.log(`##[info] Contents of target repo unchanged, exiting.`);
        return;
      }
    }
  }
  log.log(`##[info] Pushing`);
  const forceArg = config.squashHistory ? '-f' : '';
  const tagsArg = tag ? '--tags' : '';
  const push = await exec(
    `git push ${forceArg} origin "${config.branch}" ${tagsArg}`,
    { log, env: childEnv, cwd: REPO_TEMP }
  );
  log.log(push.stdout);
  log.log(`##[info] Deployment Successful`);

  if (config.mode === 'ssh') {
    log.log(`##[info] Killing ssh-agent`);
    await exec(`ssh-agent -k`, { log, env: childEnv });
  }
};
