import { Handler } from './vendor/walker';
import { JSONPathWalker } from './vendor/walker/json';
import { DescriptiveResult } from './reporter/isdescriptive';
import TestSet from './set';
import type { Assessable, Assessor, Reporter, SingleTest, Test } from './types';

export default class TestRunner<K> {

  public reporter: Reporter<K>;

  constructor(reporter: Reporter<K>) {
    this.reporter = reporter;
  }

  test(requirement: Assessable): SingleTest<K> {
    return (item: any) => {
      let walker = new JSONPathWalker();

      let assessor: Assessor<K> = requirement.assessor(this.reporter);
      for (let path of assessor.paths) {
        walker.addHandler(path, new Handler(
          (item) => assessor.evaluate(item, path),
          (err) => assessor.error(err, path)
        ));
      }

      let futureReport: Promise<K> = new Promise((resolve, reject) => {
        try {
          assessor.resolved((report: K, alias: string) => {
            resolve(report);
          });
        } catch (err) {
          assessor.error(err, "Walk of: " + JSON.stringify(item))
        }
      })

      walker.walk(item);
      return futureReport;
    }
  }

  createRunnable(requirements: Assessable[]): Test<K> {
    return (item: any) => {
      let walker = new JSONPathWalker();
      let resultSet = new TestSet<K>();

      requirements.forEach(requirement => {
        let assessor: Assessor<K> = requirement.assessor(this.reporter);

        for (let path of assessor.paths) {
          walker.addHandler(path, new Handler(
            (item) => assessor.evaluate(item, path),
            (err) => assessor.error(err, path)
          ));
        }

        let futureReport: Promise<K> = new Promise((resolve, reject) => {
          assessor.resolved((report: K, alias: string) => {
            resolve(report);
          });
        });
        resultSet.addTest(assessor.alias, futureReport)
      });

      walker.walk(item);
      return resultSet;
    }
  }
}

