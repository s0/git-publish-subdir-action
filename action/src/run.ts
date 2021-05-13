/* istanbul ignore file - this file is used purely as an entry-point */

import { main } from './';

main({
  log: console,
  env: process.env,
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
