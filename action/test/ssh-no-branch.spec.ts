import * as util from './util';

it('Deploy to a new branch over ssh', async () => {
  await util.runWithEnv({
    REPO: 'foo'
  });
});