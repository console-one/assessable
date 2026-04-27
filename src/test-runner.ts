// Assessable's own test-runner — exercises the framework against itself.
import { DescriptiveTestFileExecutor } from './index.js';
import path from 'path';

(async function main() {
  const allArgs: string[] = ['./dist'];
  const selectOpt = process.argv[2];
  if (selectOpt !== undefined) {
    allArgs.push('-select');
    allArgs.push(selectOpt);
  }
  const filterOpt = process.argv[3];
  allArgs.push('-filter');
  const baseFilter = `node_modules,\\.d\\.ts,\\.js\\.map`;
  const filterValue =
    filterOpt !== undefined
      ? `${baseFilter},.[${path.sep}]test${filterOpt}`
      : baseFilter;
  allArgs.push(filterValue);

  await DescriptiveTestFileExecutor.run(...allArgs);
})();
