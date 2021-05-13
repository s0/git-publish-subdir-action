import { main } from './';

main({
  log: console,
  env: process.env,
}).catch(err => {
  console.error(err);
  process.exit(1);
});