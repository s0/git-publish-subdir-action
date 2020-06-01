import * as child_process from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

import { EnvironmentVariables, Event } from '../src';

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

export const execWithOutput = async (
  command: string,
  opts?: child_process.ExecOptions,
) => {
  const result = await exec(command, opts);
  const stdout = result.stdout.toString();
  const stderr = result.stderr.toString();
  if (stderr.length > 0) {
    console.error(stderr);
  }
  if (stdout.length > 0) {
    console.log(stdout);
  }
  return result;
}

export const runWithEnv = async (env: EnvironmentVariables) => {

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

  const ps = child_process.spawn(
    'docker',
    ['exec', ...envVars, '-u', 'test', 'test-node', 'npx', 'nyc', '--reporter=none', 'ts-node', '--transpile-only', 'src'],
    {
      env: {
        ...process.env,
        ...env
      },
      stdio: 'inherit',
    },
  );

  return new Promise<void>((resolve, reject) => ps.on('close', code => {
    if (code !== 0) {
      reject(new Error('Process exited with code: ' + code));
    } else {
      resolve();
    }
  }))
}

export const runWithGithubEnv = async (
  env: EnvironmentVariables,
  repo: string,
  event: Event,
  actor: string,
) => {
  // create event file
  const file = path.join(DATA_DIR, `event-${new Date().getTime()}.json`);
  await writeFile(file, JSON.stringify(event));

  return runWithEnv({
    ...env,
    GITHUB_ACTOR: actor,
    GITHUB_REPOSITORY: repo,
    GITHUB_EVENT_PATH: file,
  });
}

/**
 * Get the short sha of this repo
 */
export const getRepoSha = () =>
  exec(`git rev-parse HEAD`, { cwd: TEST_DIR })
  .then(r => r.stdout.trim().substr(0, 7));