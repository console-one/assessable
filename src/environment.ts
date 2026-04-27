// ─────────────────────────────────────────────────────────────────────────
// TestEnvironment / TestEnvironmentFactory — wire the (builder, runner,
// summarizer) trio into a callable `handle(testName, body, category?)`
// that runs one test body with a fresh Validator and routes its result
// through the summarizer.
// ─────────────────────────────────────────────────────────────────────────

import { toRemoteSignal } from './vendor/async.js';
import TestBuilder from './builder.js';
import TestRunner from './runner.js';
import { SummarizerFactory, TestSummarizer } from './summarizer.js';
import { Validator } from './validator.js';
import { Colors } from './vendor/color.js';

type ValidatorFn = Function;

/**
 * Signature of a single test body. Receives a {@link Validator} and may
 * return any value or Promise. The body runs inside the environment's
 * `handle` so its outcome is summarized.
 */
export type TestContext = (validate: ValidatorFn) => Promise<any> | any;

/**
 * Signature of `TestEnvironment.handle` — runs one test body and
 * summarizes the result.
 */
export type TestSetter = (testName: string, context: TestContext, category?: string) => Promise<boolean>;

/**
 * One test environment instance. Pair a builder/runner/summarizer with
 * a default category and call `handle(name, body)` per test.
 *
 * @template K Result type produced by the runner's reporter.
 */
export class TestEnvironment<K> {
  complete: () => void;
  handle: TestSetter;
  summarizer: TestSummarizer<K>;

  constructor(
    testBuilder: TestBuilder,
    testRunner: TestRunner<K>,
    testSummarizer: TestSummarizer<K>,
    _defaultCategory: string = 'All',
  ) {
    this.summarizer = testSummarizer;
    this.complete = testSummarizer.complete.bind(testSummarizer);

    this.handle = async (
      testName: string,
      context: TestContext,
      category?: string,
    ): Promise<boolean> => {
      const [summarizerFacade, testResult] = toRemoteSignal<any, any>(testSummarizer);
      const start = new Date().getTime();
      const validator = new Validator<K>(
        testBuilder,
        testRunner,
        summarizerFacade as any,
        testName,
        category ?? 'All',
        start,
      );

      try {
        await context(validator as any);
        if (!validator.executed && validator.shouldForceResolve) {
          return validator.resolveTo as boolean;
        } else if (!validator.executed) {
          const errorMessage = `No tests were executed, test presumed to be empty...`;
          (summarizerFacade as (...args: any[]) => void)(testName, errorMessage, start, category);
          return Promise.resolve(true);
        }
        return testResult;
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error(Colors.all.FgRed(`Error running ${testName}`, err.stack));
        (summarizerFacade as (...args: any[]) => void)(
          testName,
          Promise.reject(`${err.toString()}\n${err.stack}`),
          start,
          'Load failures: ',
        );
        if (validator.shouldForceResolve) {
          return validator.resolveTo as boolean;
        }
        return testResult;
      }
    };
  }

  /** Report a test-construction error against the summarizer. */
  constructionError(filename: string, err: any) {
    return this.summarizer(
      filename,
      Promise.reject(`Test Construction Error:` + err.stack),
      Date.now(),
      'Load failures: ',
    );
  }
}

/**
 * Factory that produces fresh {@link TestEnvironment} instances against
 * a configured (builder, runner, summarizerFactory) triple.
 */
export class TestEnvironmentFactory<K> {
  constructor(
    private testBuilder: TestBuilder,
    private testRunner: TestRunner<K>,
    private summarizerFactory: SummarizerFactory<K>,
  ) {}

  create(dataSink: (...data: any[]) => void): TestEnvironment<K> {
    const summarizer = this.summarizerFactory.create(dataSink);
    return new TestEnvironment<K>(this.testBuilder, this.testRunner, summarizer);
  }
}
