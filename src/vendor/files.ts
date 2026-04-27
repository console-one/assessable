// Vendored from console-one/utils/files.ts — directory walking primitives
// the descriptive test executor needs. ListMultimap comes from the
// @console-one/multimap dep already present.

import fs from 'fs';
import path from 'path';
import type { Dirent } from 'fs';
import { resolve as resolvePath } from 'path';
import { promises } from 'fs';
import { ListMultimap } from '@console-one/multimap';

/** Path-type tags used by Directory's multimap keys. */
export enum PathType {
  DIRECTORY,
  FILE,
}

/**
 * A directory listing: a {@link ListMultimap} keyed by {@link PathType}
 * with the directory's name attached.
 */
export class Directory extends ListMultimap<PathType, string> {
  name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }

  static create(directory: string, list: any[]): Directory {
    return list.reduce((map: Directory, item: Dirent) => {
      return map.set(
        item.isDirectory() ? PathType.DIRECTORY : PathType.FILE,
        resolvePath(directory, item.name),
      );
    }, new Directory(directory));
  }
}

/** Read one directory's contents into a Directory instance. */
export async function getDirectoryContents(dir: string): Promise<Directory> {
  const directoryContents = await promises.readdir(dir, { withFileTypes: true });
  return Directory.create(dir, directoryContents);
}

/**
 * Walk a directory tree pre-order, yielding each Directory as it's read.
 * `filterer` controls which subdirectories are descended into.
 */
export async function* perNestedDirectory(
  dir: string,
  filterer: (directory: string) => boolean = () => true,
): AsyncGenerator<Directory> {
  const directoryContents = await getDirectoryContents(dir);
  yield directoryContents;
  for await (const directory of directoryContents.get(PathType.DIRECTORY).filter(filterer)) {
    yield* perNestedDirectory(directory, filterer);
  }
}

/** Delete a single file. */
export async function removeFile(filename: string): Promise<void> {
  fs.unlink(filename, (err) => {
    if (err) throw err;
  });
}

/**
 * Walk a directory tree and select files via a per-Directory selector.
 * `directoryFilterer` controls which subdirectories are descended into.
 */
export async function* selectFiles(
  dir: string,
  selector: (directory: Directory) => any,
  directoryFilterer: (directory: string) => boolean = () => true,
): AsyncGenerator<string> {
  for await (const directory of perNestedDirectory(dir, directoryFilterer)) {
    yield* selector(directory);
  }
}

/** Read a UTF-8 file. */
export async function getFile(filePath: string): Promise<string> {
  return promises.readFile(filePath, { encoding: 'utf8' });
}

export { path };
