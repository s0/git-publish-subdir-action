import dotenv from 'dotenv';
import * as child_process from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { promisify, format } from 'util';

import { EnvironmentVariables, Console, Event, main } from '../src';

dotenv.config();

export const exec = promisify(child_process.exec);
export const mkdir = promisify(fs.mkdir);
export const writeFile = promisify(fs.writeFile);
export const readFile = promisify(fs.readFile);

export const TEST_DIR = __dirname;
export const DATA_DIR = path.join(TEST_DIR, 'data');
export const REPOS_DIR = path.join(DATA_DIR, 'repos');
export const SSH_PRIVATE_KEY = path.join(DATA_DIR, 'id');
export const SSH_PRIVATE_KEY_INVALID = path.join(DATA_DIR, 'id2');
export const KNOWN_HOSTS = path.join(DATA_DIR, 'known_hosts');

export const DOCKER_IMAGE_TEST_DIR = '/home/node/repo/action/test'

export const NODE_CONTAINER = 'test-node';

export const getGitHubSSHPrivateKey = () => {
  const key = process.env.GITHUB_SSH_PRIVATE_KEY;
  if (!key)
    throw new Error('Environment variable GITHUB_SSH_PRIVATE_KEY not set, needed for tests');
  return key;
}

export const wrappedExec = async (
  command: string,
  opts?: child_process.ExecOptions,
  extra?: {
    logToConsole?: true;
  }
) => {
  const result = await exec(command, opts);
  const stdout = result.stdout.toString();
  const stderr = result.stderr.toString();
  if (stderr.length > 0 && extra?.logToConsole) {
    console.log(stderr);
  }
  if (stdout.length > 0 && extra?.logToConsole) {
    console.log(stdout);
  }
  return result;
}

interface RunOptions {
  debug?: boolean;
  captureOutput?: boolean;
};

interface TestRunOutput {
  stdout: string;
  stderr: string;
}

export class TestRunError extends Error {
  public readonly output?: TestRunOutput;
  public constructor(message: string, output?: TestRunOutput) {
    super(message);
    this.output = output;
  }
}

export const runWithEnv = async (
  reportName: string,
  env: EnvironmentVariables,
  opts?: RunOptions,
) => {

  const envVars: string[] = [];

  for (let [key, value] of Object.entries(env)) {
    if (typeof value === 'string') {
      envVars.push('-e');
      // Replace paths that are relative to the host to be relative to the docker image
      if (value.startsWith(TEST_DIR)) {
        value = value.replace(TEST_DIR, DOCKER_IMAGE_TEST_DIR);
      }
      envVars.push(`${key}=${value}`);
    }
  }

  const nodeCmd = [
    'node',
    ... (opts?.debug ? ['--inspect-brk'] : []),
    '-r',
    'ts-node/register/transpile-only',
    'src'
  ];

  const uid = process.getuid().toString();

  const ps = child_process.spawn(
    'docker',
    ['exec', ...envVars, '-u', uid, 'test-node', 'npx', 'nyc', '--temp-dir', `./.nyc_output/${reportName}`, '--reporter=none', ...nodeCmd],
    {
      env: {
        ...process.env,
        ...env
      },
      stdio: opts?.captureOutput ? 'pipe' : 'inherit',
    },
  );

  let output: TestRunOutput | undefined = undefined;
  if (opts?.captureOutput) {
    const o = output = {
      stderr: '',
      stdout: ''
    };

    for (const stream of ['stdout', 'stderr'] as const) {
      ps[stream]?.on('data', data => {
        o[stream] += data;
      });
    }
  }

  return new Promise<TestRunOutput | undefined>((resolve, reject) => ps.on('close', code => {
    if (code !== 0) {
      reject(new TestRunError('Process exited with code: ' + code, output));
    } else {
      resolve(output);
    }
  }));
}

interface ExtendedRunOptions extends RunOptions {
  excludeEventPath?: true;
  logToConsole?: true;
}

export const runWithGithubEnv = async (
  reportName: string,
  env: EnvironmentVariables,
  repo: string | undefined,
  event?: Event,
  actor?: string,
  opts?: ExtendedRunOptions,
) => {
  // create event file
  const file = path.join(DATA_DIR, `event-${new Date().getTime()}.json`);
  await writeFile(file, JSON.stringify(event || {}));

  const finalEnv: EnvironmentVariables = {
    ...env,
    ...(actor ? { GITHUB_ACTOR: actor } : {}),
    ...(repo ? { GITHUB_REPOSITORY: repo } : {}),
    ...(opts?.excludeEventPath ? {} : { GITHUB_EVENT_PATH: file }),
  }

  const output = {
    stderr: '',
    stdout: ''
  };
  const log: Console = {
    log: (...msg: unknown[]) => {
      output.stdout += msg.map(format).join(' ') + '\n';
      if (opts?.logToConsole) {
        console.log(...msg);
      }
    },
    error: (...msg: unknown[]) => {
      output.stderr += msg.map(format).join(' ') + '\n';
      if (opts?.logToConsole) {
        console.error(...msg);
      }
    },
    warn: (...msg: unknown[]) => {
      output.stderr += msg.map(format).join(' ') + '\n';
      if (opts?.logToConsole) {
        console.warn(...msg);
      }
    },
  } as const;

  return await main({
    env: finalEnv,
    log: log
  }).then(async result => {
    return result;
  }).catch(async err => {
    output.stderr += format(err) + '\n';
    throw new TestRunError(format(err), output);
  });
}

/**
 * Get the full sha of this repo
 */
export const getFullRepoSha = () =>
  exec(`git rev-parse HEAD`, { cwd: TEST_DIR })
    .then(r => r.stdout.trim());

/**
 * Get the short sha of this repo
 */
export const getRepoSha = () =>
  getFullRepoSha().then(sha => sha.substr(0, 7));
