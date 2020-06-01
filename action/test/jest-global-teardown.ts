import * as path from 'path';

import * as util from './util';

const COVERAGE_OUTPUT = path.join(path.dirname(__dirname), 'coverage.lcov');

export = async () => {

  // Print Coverage
  console.log(':: Printing Coverage');
  await util.execWithOutput('docker exec -u test test-node npx nyc report --color');
  const lcov = await (await util.exec('docker exec -u test test-node npx nyc report --reporter=text-lcov')).stdout;
  await util.writeFile(COVERAGE_OUTPUT, lcov);

  // console.log(':: Shutting down docker containers');
  // await util.execWithOutput(`docker-compose kill`, {
  //   cwd: util.TEST_DIR,
  // });

};
