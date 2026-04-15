import { ListMultimap } from '../vendor/multimap/list';
import { Colors } from '../vendor/color';
import { truncate } from '../vendor/strings';
import { pick, toSet, mergeMaps as merge } from '../vendor/functional/object'
import { EvaluationStatus, Condition } from './../types';
import { EvaluationResult, EvaluationResultArgs, AsyncEvaluation, Assessor } from './../types';
import { TestSummarizer, SummarizerFactory } from './../summarizer';

const Color = Colors.all;

export class DescriptiveResult {
  constructor(
    public alias: string, 
    public status: boolean, 
    public summary: string, 
    public info: Map<string, DescriptiveResult> = new Map<string, DescriptiveResult>()) { }
}


class AggregatedDescriptiveResultBuilder {

  public alias: string
  public info: Map<boolean, Map<string, DescriptiveResult>>
  public condition: Condition
  public status

  constructor(alias: string, condition: Condition) {
    this.alias = alias;
    this.info = new Map<boolean, Map<string, DescriptiveResult>>();
    this.info.set(true, new Map<string, DescriptiveResult>());
    this.info.set(false, new Map<string, DescriptiveResult>());
    this.condition = condition;
  }

  addSubTest(descriptiveResult: DescriptiveResult) {
    let resultsWithStatus: Map<string, DescriptiveResult> = this.info.get(descriptiveResult.status);
    resultsWithStatus.set(descriptiveResult.alias, descriptiveResult);
    return this;
  }

  build() {
    let status: boolean;
    let summary: string;
    let maxDescriptionLength = 150;

    if (this.condition === Condition.AND) {
      status = (this.info.get(false).size === 0);
      if (status) {
        let aliases: string[] = Array.from(this.info.get(true).keys());
        let aliasString = aliases.join('\n'); 
        let prefix = `All ${aliases.length} sub-test${aliases.length>1 ? 's': ''} passed as:\n`
        summary = truncate(aliasString, prefix, maxDescriptionLength);
        
      } else {
        let aliases: string[] = Array.from(this.info.get(false).keys());
        let prefix = `${aliases.length} sub-test${aliases.length>1 ? 's': ''} failed with:\n`
        
        let aliasString = aliases.map(alias => {
          let descriptiveResult = this.info.get(false).get(alias);
          return descriptiveResult.alias + ' failed as ' + descriptiveResult.summary
        }).join('\n')

        summary = truncate(aliasString, prefix, 1000);
      }
    }

    if (this.condition === Condition.OR) {
      status = (this.info.get(true).size > 0);

      if (status) {
        let aliases: string[] = Array.from(this.info.get(true).keys());
        let prefix = `${aliases.length} sub-test${aliases.length>1 ? 's': ''} passed and only one was required. Passed as: \n`
        let aliasString = aliases.join('\n')
        summary = truncate(aliasString, prefix, maxDescriptionLength);
      } else {
        let aliases: string[] = Array.from(this.info.get(false).keys());
        let prefix = `All ${aliases.length} sub-test${aliases.length>1 ? 's': ''} failed:\n`
        
        let aliasString = aliases.map(alias => {
          let descriptiveResult = this.info.get(false).get(alias);
          return descriptiveResult.alias + ' failed as ' + descriptiveResult.summary
        }).join('\n');

        summary = truncate(aliasString, prefix, 1000);
      }
    }

    let resultMap: Map<string, DescriptiveResult> = merge(this.info.get(true), this.info.get(false))
    return new DescriptiveResult(this.alias, status, summary, resultMap); 
  }
}


export const IsDescriptiveReporter = {

  createReport(evaluation: AsyncEvaluation, paths: Set<string>, alias: string) : Assessor<DescriptiveResult> {
    let onFind: (report: DescriptiveResult, alias: string) => void = null;
    let foundResult: boolean = false;
    let result: DescriptiveResult = null;

    function processResult(evalResult: EvaluationResultArgs, path: string) {
      let passed: boolean = (evalResult[0] === EvaluationStatus.Pass);
      let message: string = passed ? `Passed because ${alias}.` : evalResult[1];
      let descriptiveResult = new DescriptiveResult(alias, passed, message);
      if (onFind !== null) return onFind(descriptiveResult, alias);
      foundResult = true;
      result = descriptiveResult;
    }

    return {
      paths: paths,
      alias: alias,
      evaluate(item: any, path: string) : void {
        evaluation.evaluate(item, path).then((evaluationResult) => processResult(evaluationResult, path)).catch(err => {
          processResult([EvaluationStatus.Fail,  err.stack], path)
        })
      },
      error(err: Error, path: string) : void {
        processResult([EvaluationStatus.Fail, err.stack], path)
      },
      resolved(callback: (report: DescriptiveResult, alias: string) => void) : void {
        if (foundResult) return callback(result, alias);
        onFind = callback;
      }
    }
  },

  aggregate(operators: Assessor<DescriptiveResult>[], condition: Condition, alias: string) : Assessor<DescriptiveResult> {
    
    let toRun: ListMultimap<string, Assessor<DescriptiveResult>> = operators.reduce((paths, op) => {
      for (let path of op.paths) paths.set(path, op);
      return paths;
    }, new ListMultimap<string, Assessor<DescriptiveResult>>());

    let resolved = toSet(operators.map(pick<object, string>('alias')));
    let onFind: (report: DescriptiveResult, alias: string) => void = null;
    let foundResult: boolean = false;
    let result: DescriptiveResult = null;
    let aggregatedResultBuilder = new AggregatedDescriptiveResultBuilder(alias, condition);

    function processResult(result: DescriptiveResult) {
      if (!foundResult) {
        resolved.delete(result.alias);
        aggregatedResultBuilder.addSubTest(result);
        if (resolved.size === 0) {
          foundResult = true;
          result = aggregatedResultBuilder.build();
          if (onFind !== null) {
            onFind(result, alias);
          }
        }
      }
    }

    return {
      alias: alias,
      paths: new Set<string>(toRun.keys()),
      evaluate(item: any, path: string) : void {
        for (let operator of toRun.get(path)) {
          operator.evaluate(item, path);
          operator.resolved(processResult);
        }
      },
      error(err: Error, path: string) : void {
        for (let operator of toRun.get(path)) {
           operator.error(err, path);
           operator.resolved(processResult);
        }
      },
      resolved(callback: (report: DescriptiveResult, alias: string) => void) : void {
        if (foundResult) return callback(result, alias);
        onFind = callback;
      }
    } 
  }
}



