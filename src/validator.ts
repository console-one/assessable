// ─────────────────────────────────────────────────────────────────────────
// Validator + ExpectChain.
//
// The Validator is a Closure (callable + has methods) the test body
// receives. Three usage shapes:
//
//   await validator(actual, schema)
//   await validator.expect(actual).toLookLike(schema)
//   await validator
//     .expect(actual)
//     .toLookLike(primarySchema)
//     .else(validator.expect(actual).toLookLike(fallbackSchema))
//     .else('warn')
//
// The chained form:
//   - tries each alternative in sequence; first pass wins
//   - if none pass, applies the classification (default 'fail').
//     'warn'/'info'/'note' route the result through a category-prefixed
//     bucket so the summarizer groups it separately from hard failures
//
// `forceResolve(true|false)` lets a test body declare it's done and skip
// the "no tests executed" warning.
// ─────────────────────────────────────────────────────────────────────────

import TestBuilder from './builder.js';
import TestRunner from './runner.js';
import { Schema } from './schema.js';
import { Closure } from './vendor/closure.js';
import type { SingleTest, AssessableJSON } from './types.js';
import type { SummarizerSink } from './summarizer.js';

/**
 * Classifications that `.else(<tag>)` can apply when the entire chain of
 * alternatives fails. `'fail'` is the default — same behavior as no
 * `.else` tag. Other tags route the result into a category-prefixed
 * bucket the summarizer prints separately.
 */
export type ExpectClassification = 'fail' | 'warn' | 'info' | 'note';

interface Alternative {
  kind: 'pass' | 'lookslike';
  payload: any;
}

/**
 * Chainable expectation builder. Returned by `validator.expect(data)`.
 * Each `.toLookLike(...)` / `.toPass(...)` / `.lookslike(...)` call
 * appends an alternative; `.else(...)` either adds more alternatives
 * (when given another chain) or sets the classification (when given a
 * tag string). The chain evaluates lazily — nothing runs until awaited
 * (the chain is a thenable).
 *
 * @template K Reporter result type.
 *
 * @example
 *   // Simple equality:
 *   await validator.expect(actual).toLookLike(schema);
 *
 *   // Two alternatives — pass if either matches:
 *   await validator
 *     .expect(actual)
 *     .toLookLike(primarySchema)
 *     .else(validator.expect(actual).toLookLike(fallbackSchema));
 *
 *   // Two alternatives, demote total failure to a warning:
 *   await validator
 *     .expect(actual)
 *     .toLookLike(primarySchema)
 *     .else(validator.expect(actual).toLookLike(fallbackSchema))
 *     .else('warn');
 */
export class ExpectChain<K> implements PromiseLike<boolean> {
  private alternatives: Alternative[] = [];
  private classification: ExpectClassification = 'fail';
  private executing: Promise<boolean> | null = null;

  constructor(
    private validator: Validator<K>,
    private data: any,
  ) {}

  /** Append an alternative: `data` should pass the supplied raw assessable. */
  toPass(requirement: AssessableJSON): this {
    this.alternatives.push({ kind: 'pass', payload: requirement });
    return this;
  }

  /** Append an alternative: `data` should match the schema-by-example. */
  toLookLike(dataSchema: object): this {
    this.alternatives.push({ kind: 'lookslike', payload: dataSchema });
    return this;
  }

  /** Lowercase alias for {@link toLookLike}. */
  lookslike(dataSchema: object): this {
    return this.toLookLike(dataSchema);
  }

  /**
   * Either:
   *   - `.else(otherChain)` — append the other chain's alternatives, so
   *     they're tried after the current set.
   *   - `.else('warn' | 'info' | 'note' | 'fail')` — set the classification
   *     applied if every alternative in the chain fails.
   *
   * Multiple `.else(<tag>)` calls overwrite each other; the most recent
   * tag wins. Multiple `.else(<chain>)` calls accumulate alternatives.
   */
  else(otherOrTag: ExpectChain<K> | ExpectClassification): this {
    if (typeof otherOrTag === 'string') {
      this.classification = otherOrTag;
    } else {
      this.alternatives.push(...otherOrTag.alternatives);
      // Inherit a non-default classification only if this chain still
      // has the default — outer `.else(<tag>)` calls take precedence.
      if (this.classification === 'fail' && otherOrTag.classification !== 'fail') {
        this.classification = otherOrTag.classification;
      }
    }
    return this;
  }

  /** PromiseLike: trigger evaluation on first await/then. */
  then<TResult1 = boolean, TResult2 = never>(
    onfulfilled?: ((value: boolean) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null,
  ): Promise<TResult1 | TResult2> {
    if (this.executing === null) this.executing = this.evaluate();
    return this.executing.then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null,
  ): Promise<boolean | TResult> {
    if (this.executing === null) this.executing = this.evaluate();
    return this.executing.catch(onrejected);
  }

  private async evaluate(): Promise<boolean> {
    if (this.alternatives.length === 0) {
      // Nothing to assert. Mark the test as executed so it doesn't
      // count as "empty" but report a vacuous pass through the
      // summarizer using a trivial true assertion.
      this.validator.executed = true;
      return this.routeReport(this.validator.category, this.runOne(Schema(true) as any, true));
    }

    let lastResult: Promise<any> = Promise.resolve(undefined);
    let passed = false;

    for (const alt of this.alternatives) {
      const requirement: AssessableJSON =
        alt.kind === 'lookslike' ? (Schema(alt.payload) as AssessableJSON) : alt.payload;
      lastResult = this.runOne(requirement, this.data);
      const result = await lastResult;
      if (result && (result as any).status === true) {
        passed = true;
        break;
      }
    }

    this.validator.executed = true;

    if (passed) {
      return this.routeReport(this.validator.category, lastResult);
    }

    if (this.classification === 'fail') {
      return this.routeReport(this.validator.category, lastResult);
    }

    // Classification escalation — route the failure into a category-
    // prefixed bucket the summarizer can group apart from hard fails.
    const baseCategory =
      this.validator.category && this.validator.category !== 'All'
        ? this.validator.category
        : 'All';
    const demotedCategory = `${this.classification}: ${baseCategory}`;
    return this.routeReport(demotedCategory, lastResult);
  }

  /**
   * Run a single assessable against `data` without going through the
   * summarizer — internal to the chain's alternative loop.
   */
  private runOne(requirement: AssessableJSON, data: any): Promise<any> {
    const assessable = this.validator.testBuilder.toAssessable(requirement as any);
    const test: SingleTest<K> = this.validator.testRunner.test(assessable);
    return test(data) as Promise<any>;
  }

  /** Send the chain's outcome to the summarizer under the chosen category. */
  private routeReport(category: string, resultPromise: Promise<any>): Promise<boolean> {
    return Promise.resolve(
      this.validator.testSummarizer(
        this.validator.testName,
        resultPromise,
        this.validator.startTime,
        category,
      ) as unknown as boolean,
    );
  }
}

/**
 * Validator — the per-test handle passed into a test body. Callable as
 * `(data, requirement)` and exposes `.expect(data)` for fluent chained
 * assertions via {@link ExpectChain}.
 *
 * @template K  The reporter's result type for one assessment.
 */
export class Validator<K> extends Closure {
  public shouldForceResolve!: boolean;
  public resolveTo!: boolean | null;
  public executed!: boolean;

  constructor(
    public testBuilder: TestBuilder,
    public testRunner: TestRunner<K>,
    public testSummarizer: SummarizerSink,
    public testName: string,
    public category: string,
    public startTime: number,
  ) {
    super((data: any, shouldLookLike: AssessableJSON) => {
      (this as Validator<K>).executed = true;
      const simpleTest: SingleTest<K> = testRunner.test(
        testBuilder.toAssessable(shouldLookLike as any),
      );
      const testResult = simpleTest(data);
      return testSummarizer(testName, testResult, startTime, category);
    });

    this.shouldForceResolve = false;
    this.resolveTo = null;
    this.executed = false;
  }

  /** Mark the test as forcibly resolved (skip the empty-test warning). */
  forceResolve(resolveTo: boolean, value?: any): this {
    this.shouldForceResolve = true;
    this.resolveTo = (value as boolean) ?? resolveTo;
    return this;
  }

  /**
   * Begin a chainable expectation.
   *
   *   await validator.expect(data).toLookLike(schema)
   *   await validator.expect(data)
   *     .toLookLike(primary)
   *     .else(validator.expect(data).toLookLike(fallback))
   *     .else('warn')
   */
  expect(data: any): ExpectChain<K> {
    return new ExpectChain<K>(this, data);
  }
}
