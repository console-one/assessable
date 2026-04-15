
import { ListMultimap } from '../vendor/multimap/list';
import { Assessor, SyncEvaluation, EvaluationResult, EvaluationResultArgs } from './../types';
import { Condition, EvaluationStatus } from './../types';
import { pick, toSet, } from '../vendor/functional/object'
import { Queue } from '../vendor/queue-simple'
import { PipedHandler } from '../vendor/walker'



export const IsContinuousReporter = {

  createReport(evaluation: SyncEvaluation, paths: Set<string>, alias: string): Assessor<boolean> {

    let onFind: (report: boolean, alias: string) => void = null;
    let foundResult: boolean = false;
    let result: boolean = null;

    function processResult(evalResult: EvaluationResultArgs) {
      let passed = (evalResult[0] === EvaluationStatus.Pass);
      if (onFind !== null) {
        return onFind(passed, alias);
      }
      foundResult = true;
      result = passed;
    }

    return {
      paths: paths,
      alias: alias,
      evaluate(item: any, path: string): void {
        try {
          processResult(evaluation.evaluate(item, path));
        } catch (err) {
          processResult([EvaluationStatus.Fail, err.toString()])
        }
      },
      error(err: Error, path: string): void {
        processResult(([EvaluationStatus.Fail, err.toString() + '\n' + err.stack]))
      },
      resolved(callback: (report: boolean, alias: string) => void): void {
        if (foundResult) {
          return callback(result, alias);
        }
        onFind = callback;
      }
    }
  },

  aggregate(operators: Assessor<boolean>[], condition: Condition, alias: string): Assessor<boolean> {

    let toRun: ListMultimap<string, Assessor<boolean>> = operators.reduce((paths, op) => {
      for (let path of op.paths) paths.set(path, op);
      return paths;
    }, new ListMultimap<string, Assessor<boolean>>());


    let resolved = toSet(operators.map(pick('alias')));
    let onFind: (report: boolean, alias: string) => void = null;
    let foundResult: boolean = false;
    let result: boolean = null;

    function setResult(resultValue: boolean) {
      let passed = resultValue;
      if (onFind !== null) {
        return onFind(passed, alias);
      }
      foundResult = true;
      result = passed;
    }

    function processResult(result: boolean, subAlias: string) {
      if (!foundResult) {
        if (Condition.AND === condition) {
          if (!result) {
            setResult(false);
          } else {
            resolved.delete(subAlias);
            if (resolved.size < 1) {
              setResult(true);
            }
          }
        }
        if (Condition.OR === condition) {
          if (result) {
            setResult(true);
          } else {
            resolved.delete(subAlias);
            if (resolved.size < 1) {
              setResult(false);
            }
          }
        }
        if (onFind !== null && foundResult) {
          onFind(result, alias);
        }
      }
    }

    return {
      alias: alias,
      paths: new Set<string>(toRun.keys()),
      clear(): void {
        resolved = toSet(operators.map(pick('alias')))
      },
      evaluate(item: any, path: string): void {
        for (let operator of toRun.get(path)) {
          operator.evaluate(item, path);
          operator.resolved(processResult);
        }
      },
      error(err: Error, path: string): void {
        for (let operator of toRun.get(path)) {
          operator.error(err, path);
          operator.resolved(processResult);
        }
      },
      resolved(callback: (report: boolean, alias: string) => void): void {
        if (foundResult) {
          return callback(result, alias);
        }
        onFind = callback;
      }
    }
  
  }
}
