// ─────────────────────────────────────────────────────────────────────────
// DescriptiveTestFileExecutor — walk directories, find test files, load
// their default-exported test bodies, and run them through a
// DescriptiveTestEnvironment. The CLI shape used by the original
// `test.ts` is preserved (`-dir`, `-filter`, `-select`).
//
// Each test file is expected to default-export an async function:
//
//   export default async (test) => {
//     await test('describes my test', async (validator) => {
//       validator.expect(actual).toLookLike(expectedSchema);
//       // …
//     });
//   };
//
// The executor walks `<root>/.../test/` directories, runs each non-mock
// `.js` file in those directories, and prints a per-category summary
// when finished.
// ─────────────────────────────────────────────────────────────────────────

import path from 'path';
import { TestEnvironment } from './../environment.js';
import { DescriptiveResult } from './../reporter/isdescriptive.js';
import { DescriptiveTestEnvironment } from './../environments/descriptive.js';
import { Validator } from './../validator.js';
import { Closure } from './../vendor/closure.js';
import * as files from './../vendor/files.js';

/** Parsed CLI args for the executor. */
type CommandLineTestCommand = {
  directories: string[];
  filters: ((item: string) => boolean)[];
  selectors: ((item: string) => boolean)[];
};

/**
 * Closure form of a regex matcher — callable as `(str) => boolean`,
 * with `toString()` / `toJSON()` for diagnostics.
 */
class RegexApplicator extends Closure {
  public regex!: RegExp;
  private _regexStr: string;

  constructor(regexStr: string) {
    super((str: string) => (this as RegexApplicator).regex.test(str));
    this._regexStr = regexStr.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    this.regex = new RegExp(this._regexStr);
  }

  toString() {
    return 'RegExp.test of [' + this._regexStr + ']';
  }

  toJSON() {
    return this._regexStr;
  }

  static create(pattern: string) {
    return new RegexApplicator(pattern);
  }
}

const DELIMETER = path.sep;

/**
 * Walk-and-run executor for test files. Construct one per run; either
 * call `testFile(filename)` / `testFiles(...)` directly, or use the
 * static {@link DescriptiveTestFileExecutor.run} entry point that parses
 * CLI args and discovers test files itself.
 */
export class DescriptiveTestFileExecutor {
  environment: TestEnvironment<DescriptiveResult>;

  constructor() {
    this.environment = DescriptiveTestEnvironment();
  }

  /**
   * Load one test file (which must default-export a function) and run
   * its body inside a single test in the environment. The body is
   * called with a `test(name, context)` registration function so it
   * can declare nested tests.
   */
  testFile(filename: string) {
    const relativePath = path.relative('.', filename);
    const perceivedName = relativePath;

    // eslint-disable-next-line no-console
    console.log('MATCHED PROCESS ENVIRONMENT: ', perceivedName, process.memoryUsage());

    return this.environment.handle(
      perceivedName,
      async (validator) => {
        try {
          // dynamic import for ESM compatibility
          const required = await import(filename);
          if (Object.prototype.hasOwnProperty.call(required, 'default') && typeof required.default === 'function') {
            return await required.default((name: string, context: any) => {
              const handleResult = this.environment.handle(
                name,
                async (v) => {
                  return context(v);
                },
                perceivedName,
              );
              (validator as Validator<DescriptiveResult>).forceResolve(true);
              return handleResult;
            });
          } else {
            throw new Error(
              `Loaded module at: ${perceivedName} does not export a default function. ` +
                `Exported:\n${JSON.stringify(required, null, 4)}`,
            );
          }
        } catch (err) {
          (validator as Validator<DescriptiveResult>).forceResolve(true);
          throw err;
        }
      },
      perceivedName,
    );
  }

  /** Run a list of test files concurrently and resolve when all settle. */
  async testFiles(...filenames: string[]) {
    const results: any[] = [];
    for (const filename of filenames) results.push(this.testFile(filename));
    return Promise.allSettled(results);
  }

  /** Trigger the summarizer to print the final report. */
  complete() {
    this.environment.complete();
  }

  /**
   * Parse the CLI args into directories, filters, selectors. Repeating a
   * `-dir`/`-filter`/`-select` arg accumulates entries.
   */
  static toCommand(...args: string[]): CommandLineTestCommand {
    let state = 'awaiting-value';
    let arg: string | null = '-dir';
    let directories: any[] = [];
    let filters: any[] = [];
    let selectors: any[] = [];

    for (const next of args) {
      switch (state) {
        case 'awaiting-arg':
          arg = next;
          state = 'awaiting-value';
          break;
        case 'awaiting-value':
          switch (arg) {
            case '-dir':
              directories = next
                .split(',')
                .reduce((all: string[], dirPath) => {
                  all.push(dirPath);
                  return all;
                }, directories);
              break;
            case '-filter':
              filters = next
                .split(',')
                .map(RegexApplicator.create)
                .reduce((all: any[], fn) => {
                  all.push(fn);
                  return all;
                }, filters);
              break;
            case '-select':
              selectors = next
                .split(',')
                .map((sel) => path.relative('', sel))
                .map(RegexApplicator.create)
                .reduce((all: any[], fn) => {
                  all.push(fn);
                  return all;
                }, selectors);
              break;
          }
          arg = null;
          state = 'awaiting-arg';
          break;
      }
    }
    return { directories, filters, selectors };
  }

  /**
   * The CLI entry point. Discover test files under each `-dir`, filter
   * out non-matching ones, run them, and print the summary on completion.
   *
   *   await DescriptiveTestFileExecutor.run('.', '-filter', 'node_modules');
   */
  static async run(...args: string[]) {
    const cmd = DescriptiveTestFileExecutor.toCommand(...args);

    const directoryFilter = (dirname: string) => {
      for (const fn of cmd.filters) if (fn(dirname)) return false;
      return true;
    };

    const selector = (directory: any) => {
      const parts = directory.name.split(DELIMETER);
      if (parts.length > 0) {
        if (/^test[s]?$/.test(parts[parts.length - 1])) {
          const defaultSelected = directory
            .get(files.PathType.FILE)
            .filter((filepath: string) => {
              const fileName = filepath.split(DELIMETER).pop() || '';
              // Skip mock files by convention.
              if (/^mock[s]?/.test(fileName.split('.')[0])) return false;
              // Compiler artefacts (declaration files, source maps) are
              // never themselves test modules — excluding them keeps the
              // executor from trying to import e.g. `operators.d.ts`.
              if (/\.d\.ts$/.test(fileName)) return false;
              if (/\.d\.ts\.map$/.test(fileName)) return false;
              if (/\.js\.map$/.test(fileName)) return false;
              return true;
            });
          if (cmd.selectors.length > 0) {
            return defaultSelected.filter((filepath: string) => {
              for (const fn of cmd.selectors) if (fn(filepath)) return true;
              return false;
            });
          }
          return defaultSelected;
        }
      }
      return [];
    };

    const executor = new DescriptiveTestFileExecutor();
    try {
      const fileNames: string[] = [];
      for (const dir of cmd.directories) {
        for await (const file of files.selectFiles(dir, selector, directoryFilter)) {
          fileNames.push(file);
        }
      }
      await executor.testFiles(...fileNames);
      executor.complete();
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('ERROR CAUGHT TERMINATING TEST EXECUTION:\n', err.stack);
      executor.complete();
    }
  }
}
