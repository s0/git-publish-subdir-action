import * as child_process from 'child_process';
import { promisify } from 'util';
import { EnvironmentVariables } from '../src';

const exec = promisify(child_process.exec);

export const runWithEnv = async (env: EnvironmentVariables) => {

  await exec(`ts-node --transpile-only src`, {
    env: {
      ...process.env,
      ...env
    }
  });
}