// ─────────────────────────────────────────────────────────────────────────
// DescriptiveTestEnvironment — a TestEnvironment configured with the
// standard operators and the descriptive reporter, plus a summarizer
// that prints a colored per-category breakdown on `complete()`.
// ─────────────────────────────────────────────────────────────────────────

import TestBuilder from './../builder.js';
import TestRunner from './../runner.js';
import StandardOperators from './../operators/standard.js';
import { DescriptiveResult, IsDescriptiveReporter } from './../reporter/isdescriptive.js';
import { Colors } from './../vendor/color.js';
import { TestSummarizer, SummarizerFactory } from './../summarizer.js';
import { TestEnvironment, TestEnvironmentFactory } from './../environment.js';

const Color = Colors.all;

/**
 * Summarizer that pretty-prints a per-category breakdown of pass/fail
 * counts plus per-test details, using terminal colors. Suitable for CI
 * output where humans (or grep) need to see what happened.
 */
export class DescriptiveTestSummarizer extends TestSummarizer<DescriptiveResult> {
  print() {
    const totalSummary: string[] = [];
    const totalSummmarySink = (str: string) => totalSummary.push(str);
    const categorySummary: string[] = [];
    const categorySummarySink = (str: string) => categorySummary.push(str);
    const orderedDetails: string[] = [];
    const detailsSink = (str: string) => orderedDetails.push(str);
    const numError = (this as any).error.size;
    const numCompleted = (this as any).completed.size;
    const numTests = numCompleted + numError;
    const percCompleted = numTests > 0 ? numCompleted / numTests : 1;
    let numPassed = 0;
    let numFailed = 0;
    const classifiedCounts: Record<string, number> = {};
    let totalExecutionTime = 0;

    // Build a name → category lookup so we can distinguish hard failures
    // from classification-bucketed (warn/info/note) failures.
    const categoryByName = new Map<string, string>();
    for (const cat of (this as any).categoryOrder) {
      for (const name of (this as any).categories.get(cat)) categoryByName.set(name, cat);
    }
    const classificationOf = (cat: string): string | null => {
      for (const tag of ['warn', 'info', 'note']) {
        if (cat.startsWith(`${tag}:`)) return tag;
      }
      return null;
    };

    for (const name of (this as any).completed.keys()) {
      const completion = (this as any).completed.get(name);
      const cat = categoryByName.get(name) ?? 'All';
      const classification = classificationOf(cat);
      if (completion.status) {
        numPassed++;
      } else if (classification) {
        classifiedCounts[classification] = (classifiedCounts[classification] ?? 0) + 1;
      } else {
        numFailed++;
      }
      totalExecutionTime += (this as any).executionTimes.get(name) ?? 0;
    }

    // Hard-fail percentage for the headline: passed + classified count
    // toward "non-hard-failed" so the overall % reflects actual problems.
    const numClassified = Object.values(classifiedCounts).reduce((a, b) => a + b, 0);
    const numHardFailed = numFailed + numError;
    const numNonHardFailed = numPassed + numClassified;
    const percNonHardFailed = numTests > 0 ? numNonHardFailed / numTests : 1;
    const percPassed = numTests > 0 ? numPassed / numTests : 1;
    const percPassedColor = numHardFailed === 0 ? Color['FgGreen'] : Color['FgRed'];
    const percErrors = numTests > 0 ? numError / numTests : 0;
    const percCompletedColor = percErrors === 0 ? Color['FgGreen'] : Color['FgRed'];

    const toSeconds = (millies: number) => Math.round(Number(millies) / 100) / 10;

    totalSummmarySink('');
    totalSummmarySink(`== Summary of ${numTests} tests executed in ${toSeconds(totalExecutionTime)} seconds ==`);
    totalSummmarySink(percPassedColor(
      `${Math.round(percPassed * 1000) / 10}% of tests (${numPassed}/${numTests}) passed` +
        (numHardFailed > 0 ? `, ${numHardFailed} failed.` : '.'),
    ));
    if (numClassified > 0) {
      const classifiedColors: Record<string, any> = {
        warn: Color['FgYellow'],
        info: Color['FgCyan'],
        note: Color['FgBlue'],
      };
      const parts: string[] = [];
      for (const [tag, count] of Object.entries(classifiedCounts)) {
        const colorFn = classifiedColors[tag] ?? Color['FgYellow'];
        parts.push(colorFn(`${count} ${tag}`));
      }
      totalSummmarySink(`Classified outcomes: ${parts.join(', ')}.`);
    }
    totalSummmarySink(percCompletedColor(`${Math.round(percCompleted * 1000) / 10}% of tests (${numCompleted}/${numTests}) completed.`));
    totalSummmarySink('');

    let categoryNumber = 0;
    const details: string[] = [];
    while (categoryNumber < (this as any).categoryOrder.length) {
      const summaries: string[] = [];
      let categoryIndex = 0;
      const category = (this as any).categoryOrder[categoryNumber];
      const categoryTests = (this as any).categories.get(category) as string[];
      const categoryNumTests = categoryTests.length;
      let categoryNumCompleted = 0;
      let categoryNumError = 0;
      let categoryNumPassed = 0;
      let categoryNumFailed = 0;
      let categoryNumPending = 0;
      let categoryExecutionTime = 0;

      const truncated = category.length > 40 ? '...' + category.slice(category.length - 40) : category;
      details.push(`\n== ${truncated} details ==\n`);

      // Detect classification-prefixed categories from `.else('warn')`
      // and friends. Failures inside these buckets are rendered in the
      // tag's color rather than red so they're visually distinct from
      // hard failures.
      const classificationPrefixes: Array<[string, any, string]> = [
        ['warn:', Color['FgYellow'], 'Warning'],
        ['info:', Color['FgCyan'], 'Info'],
        ['note:', Color['FgBlue'], 'Note'],
      ];
      const matched = classificationPrefixes.find(([prefix]) => category.startsWith(prefix));
      const failureColor = matched ? matched[1] : Color['FgRed'];
      const failureLabel = matched ? matched[2] : 'Failed';
      const isClassified = matched !== undefined;

      while (categoryIndex < categoryTests.length) {
        const testName = categoryTests[categoryIndex];
        const userInputName = (this as any).dedupedToUserInputNames.get(testName);
        const resultType = (this as any).completed.has(testName)
          ? 'COMPLETED'
          : (this as any).error.has(testName)
            ? 'ERROR'
            : 'PENDING';
        let summary: string;
        const summaryPrefix = `#${categoryNumber + 1}:${categoryIndex + 1}`;

        switch (resultType) {
          case 'COMPLETED': {
            categoryNumCompleted += 1;
            const executionTime = (this as any).executionTimes.get(testName) ?? 0;
            categoryExecutionTime += executionTime;
            const resultArtifact = (this as any).completed.get(testName);

            if (typeof resultArtifact === 'string') {
              summary = `  ${summaryPrefix} ${Color['FgYellow']('Did Nothing For')} ${userInputName} in ${toSeconds(executionTime)} seconds`;
              summaries.push(summary);
              details.push(`${summaryPrefix} - ${userInputName}\n` + Color['FgYellow'](`${resultArtifact}`));
            } else if (resultArtifact.status) {
              summary = `  ${summaryPrefix} ${Color['FgGreen']('Passed')} ${userInputName} in ${toSeconds(executionTime)} seconds`;
              summaries.push(summary);
              details.push(`${summaryPrefix} - ${userInputName}\n` + Color['FgGreen'](`${resultArtifact.summary}`));
              categoryNumPassed += 1;
            } else {
              summary = `  ${summaryPrefix} ${failureColor(failureLabel)} ${userInputName} in ${toSeconds(executionTime)} seconds`;
              summaries.push(summary);
              details.push(`${summaryPrefix} - ${userInputName}\n` + failureColor(`${resultArtifact.summary}`));
              categoryNumFailed += 1;
            }
            break;
          }
          case 'ERROR':
            summary = `  ${summaryPrefix} ${Color['FgRed']('Errored')} - ${userInputName} `;
            summaries.push(summary);
            details.push(`${summaryPrefix} - ${userInputName}\n` + Color['FgRed'](`Errored with - ${(this as any).error.get(testName)}`));
            categoryNumError += 1;
            break;
          case 'PENDING':
            summary = `  ${summaryPrefix} ${Color['FgYellow']('Pending')} - ${userInputName} `;
            summaries.push(summary);
            details.push(`${summaryPrefix} - ${userInputName}\n` + Color['FgYellow'](`Pending.`));
            categoryNumPending += 1;
            break;
        }
        categoryIndex += 1;
      }

      details.push(`\n== Completed tests executed in ${toSeconds(categoryExecutionTime)} seconds. ==`);
      detailsSink('');

      const categoryPercPassed = categoryNumTests > 0 ? categoryNumPassed / categoryNumTests : 1;
      const categoryPassed = categoryPercPassed === 1;
      const categoryPercPassedColor = categoryPassed ? Color['FgGreen'] : Color['FgRed'];
      const categoryPercCompleted = categoryNumTests > 0 ? categoryNumCompleted / categoryNumTests : 1;
      const categoryCompleted = categoryPercCompleted === 1;
      const categoryPercCompletedColor = categoryCompleted ? Color['Reset'] : Color['FgRed'];

      if ((this as any).categoryOrder.length > 1) {
        categorySummarySink(`${truncated} completed in ${toSeconds(categoryExecutionTime)} seconds`);
        categorySummarySink(
          categoryPercPassedColor(`  ${Math.round(categoryPercPassed * 1000) / 10}%`) +
            ` of tests (${categoryNumPassed}/${categoryNumTests}) passed (` +
            categoryPercCompletedColor(`${Math.round(categoryPercCompleted * 1000) / 10}%`) +
            ` [ ${categoryNumCompleted}/${categoryNumTests} ] completed)`,
        );
      }
      for (const summaryString of summaries) categorySummarySink(summaryString);
      categorySummarySink('');
      categoryNumber += 1;
    }

    detailsSink('== Test Details ');
    detailsSink('');
    for (const detail of details) detailsSink(detail);
    detailsSink('');

    orderedDetails.forEach((s) => (this as any).sink(s));
    totalSummary.forEach((s) => (this as any).sink(s));
    categorySummary.forEach((s) => (this as any).sink(s));
  }

  toBoolean(result: DescriptiveResult): boolean {
    return result.status;
  }
}

/** Factory pairing the descriptive summarizer with a sink. */
export class DescriptiveSummarizerFactory implements SummarizerFactory<DescriptiveResult> {
  create(sink: (...data: any[]) => void): TestSummarizer<DescriptiveResult> {
    return new DescriptiveTestSummarizer(sink);
  }
}

const logger = (...datalog: any[]) => console.log(...datalog);

/**
 * Build a {@link TestEnvironment} configured with the standard operators
 * and descriptive reporter. Default sink prints to console.
 *
 * @param sink Where to send rendered summary lines (default: console.log).
 */
export const DescriptiveTestEnvironment = (
  sink: (...datalog: any[]) => void = logger,
): TestEnvironment<DescriptiveResult> => {
  const operators: any[] = [];
  for (const key of Object.keys(StandardOperators)) {
    operators.push((StandardOperators as any)[key]());
  }
  const testBuilder = new TestBuilder(operators);
  const testRunner: TestRunner<DescriptiveResult> = new TestRunner(IsDescriptiveReporter);
  const factory = new TestEnvironmentFactory<DescriptiveResult>(
    testBuilder,
    testRunner,
    new DescriptiveSummarizerFactory(),
  );
  return factory.create(sink);
};
