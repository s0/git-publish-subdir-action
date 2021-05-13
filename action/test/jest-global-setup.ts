import * as path from 'path';
import * as fs from 'fs';
import {promisify} from 'util';

import * as util from './util';

const copyFile = promisify(fs.copyFile);

export = async () => {

  // Generate known-hosts
  await util.exec(
    path.join(util.TEST_DIR, 'bin/generate-known-hosts.sh'),
    { cwd: util.DATA_DIR }
  );

};
