import { main } from './';

main({
  console,
  env: process.env,
}).catch(err => {
  console.error(err);
  process.exit(1);
});