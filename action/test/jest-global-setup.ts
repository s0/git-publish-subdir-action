import * as path from 'path';

import * as util from './util';

export = async () => {

  // Generate known-hosts
  await util.exec(
    path.join(util.TEST_DIR, 'bin/generate-known-hosts.sh'),
    { cwd: util.DATA_DIR }
  );

};
