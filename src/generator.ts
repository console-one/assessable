import { Handler, JSONPathWalker } from '@console-one/walker';
import TestBuilder from './builder.js';
import { DescriptiveResult, IsDescriptiveReporter } from './reporter/isdescriptive.js';
import { IsValidReporter } from './reporter/isvalid.js';
import type { AssessableJSON, Assessor, Reporter } from './types.js';
import StandardOperators from './operators/standard.js';

export class TestGenerator<K> {

  constructor(
    public reporter: Reporter<K>, 
    public builder: TestBuilder) {}

  test(requirement: AssessableJSON) {
    return (item): Promise<K> => {
      try {
        let walker: JSONPathWalker = new JSONPathWalker();
        let assessable = this.builder.toAssessable(requirement);
        let assessor: Assessor<K> = assessable.assessor(this.reporter);
        for (let path of assessor.paths) {
          walker.addHandler(path, new Handler(
            (item) => assessor.evaluate(item, path), 
            (err) => assessor.error(err, path)
          ));
        }
        let promised = new Promise<K>((resolve, reject) => {
          try {
            assessor.resolved((report: K, alias: string) => resolve(report))
          } catch (err) {
            reject(err);
          }
        });
        walker.walk(item);
        return promised;
      } catch (err) {
        return Promise.reject(err);
      }
    }
  }
}



export class RapidTestGenerator extends TestGenerator<boolean> {
  constructor(builder: TestBuilder) {
    super(IsValidReporter as Reporter<boolean>, builder)
  }
}

export class StandardRapidTestGenerator extends RapidTestGenerator {
  constructor() {
    super(new TestBuilder([
      StandardOperators.IS_TYPE(),
      StandardOperators.IS(),
      StandardOperators.EXISTS(),
      StandardOperators.IS_IN()
    ]));
  }
}

export class SummarizedTestGenerator extends TestGenerator<DescriptiveResult> {
  constructor(builder: TestBuilder) {
    super(IsDescriptiveReporter as Reporter<DescriptiveResult>, builder)
  }
}