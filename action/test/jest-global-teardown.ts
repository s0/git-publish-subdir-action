import * as util from './util';

export = async () => {

  // Print Coverage
  console.log(':: Printing Coverage');
  await util.execWithOutput('docker exec -u test test-node npx nyc report --color');
  
  // console.log(':: Shutting down docker containers');
  // await util.execWithOutput(`docker-compose kill`, {
  //   cwd: util.TEST_DIR,
  // });

};
