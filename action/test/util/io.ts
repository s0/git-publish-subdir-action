import * as path from 'path';
import { mkdirP, rmRF } from '@actions/io';

import * as util from '../util';

export const prepareTestFolders = async (args: { __filename: string }) => {
  const testName = path.basename(__filename);
  const repoName = `${testName}.git`;
  const repoUrl = `ssh://git@git-ssh/git-server/repos/${repoName}`;

  const repoDir = path.join(util.REPOS_DIR, repoName);
  const workDir = path.join(util.DATA_DIR, __filename);
  const repoCloneDir = path.join(workDir, 'clone');
  const dataDir = path.join(workDir, 'data');

  await rmRF(repoDir);
  await rmRF(workDir);
  await mkdirP(repoDir);
  await mkdirP(workDir);
  await mkdirP(dataDir);

  return {
    testName,
    repoName,
    repoUrl,
    repoDir,
    workDir,
    repoCloneDir,
    dataDir,
  };
};
