import dotenv from 'dotenv';
import * as child_process from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

import { EnvironmentVariables, Event } from '../src';

dotenv.config();

export const exec = promisify(child_process.exec);
export const mkdir = promisify(fs.mkdir);
export const writeFile = promisify(fs.writeFile);
export const readFile = promisify(fs.readFile);

export const TEST_DIR = __dirname;
export const DATA_DIR = path.join(TEST_DIR, 'data');
export const REPOS_DIR = path.join(DATA_DIR, 'repos');
export const SSH_PRIVATE_KEY = path.join(DATA_DIR, 'id');
export const KNOWN_HOSTS = path.join(DATA_DIR, 'known_hosts');

export const DOCKER_IMAGE_TEST_DIR = '/home/node/repo/action/test'

export const NODE_CONTAINER = 'test-node';

export const getGitHubSSHPrivateKey = () => {
  const key = process.env.GITHUB_SSH_PRIVATE_KEY;
  if (!key)
    throw new Error('Environment variable GITHUB_SSH_PRIVATE_KEY not set, needed for tests');
  return key;
}

export const execWithOutput = async (
  command: string,
  opts?: child_process.ExecOptions,
) => {
  const result = await exec(command, opts);
  const stdout = result.stdout.toString();
  const stderr = result.stderr.toString();
  if (stderr.length > 0) {
    console.log(stderr);
  }
  if (stdout.length > 0) {
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

  const ps = child_process.spawn(
    'docker',
    ['exec', ...envVars, '-u', 'test', 'test-node', 'npx', 'nyc', '--temp-dir', `./.nyc_output/${reportName}`, '--reporter=none', ...nodeCmd],
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
}

export const runWithGithubEnv = async (
  reportName: string,
  env: EnvironmentVariables,
  repo: string,
  event: Event,
  actor: string,
  opts?: ExtendedRunOptions,
) => {
  // create event file
  const file = path.join(DATA_DIR, `event-${new Date().getTime()}.json`);
  await writeFile(file, JSON.stringify(event));

  const postRun = async () => {
    // Process Coverage
    await exec(`docker exec -u test test-node npx nyc merge ./.nyc_output/${reportName} ./.nyc_output/${reportName}.json`);
    // Remove Run-Related Files
    await exec(`docker exec -u test test-node ./test/bin/post-run-clean.sh`);
  }

  return await runWithEnv(
    reportName,
    {
      ...env,
      GITHUB_ACTOR: actor,
      GITHUB_REPOSITORY: repo,
      ...(opts?.excludeEventPath ? {} : { GITHUB_EVENT_PATH: file }),
    },
    opts,
  ).then(async result => {
    await postRun();
    return result;
  }).catch(async err => {
    await postRun();
    throw err;
  });
}

/**
 * Get the short sha of this repo
 */
export const getRepoSha = () =>
  exec(`git rev-parse HEAD`, { cwd: TEST_DIR })
  .then(r => r.stdout.trim().substr(0, 7));