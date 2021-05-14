import * as fs from 'fs';
import git, { TreeEntry } from 'isomorphic-git';

export const listTree = async (dir: string) => {
  const head = await git.resolveRef({
    fs,
    gitdir: dir,
    ref: 'refs/heads/master',
  });
  const currentCommit = await git.readCommit({
    fs,
    gitdir: dir,
    oid: head,
  });
  const tree: {
    /**
     * TODO: fix this, allow access to file path without impl detail
     *
     * @deprecated
     */
    _fullpath: string;
  }[] = await git.walk({
    fs,
    gitdir: dir,
    trees: [git.TREE({ ref: currentCommit.oid })],
    reduce: async (parent: unknown[], children: unknown[]) =>
      [parent, ...children].flat(),
  });
  return tree.map((s) => s._fullpath);
};
