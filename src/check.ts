import TestBuilder from './builder';
import StandardOperators from './operators/standard';
import { IsValidReporter } from './reporter/isvalid';
import TestRunner from './runner';
import type { Assessable, SingleTest } from './types';

const testBuilder = new TestBuilder([
  StandardOperators.IS_TYPE(),
  StandardOperators.IS(),
  StandardOperators.EXISTS(),
  StandardOperators.IS_IN()
]);

const testRunner: TestRunner<boolean> = new TestRunner(IsValidReporter);

export const check = (requirement) => {
  let assessable: Assessable = testBuilder.where(requirement).build();
  return async (input) => {
    let singleTest: SingleTest<boolean> = testRunner.test(assessable);
    return singleTest(input);
  }
}