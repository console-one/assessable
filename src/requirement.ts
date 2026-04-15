import { ListMultimap } from './vendor/multimap/list';
import { SetMultimap } from './vendor/multimap/set';
import { Condition } from './types';
import type { Reporter, Assessor, Assessable } from './types';

export default class Requirement {

  public alias: string;
  public paths: Set<string>;
  public pathsToAliases: SetMultimap<string, string>;
  public aliasesToAssesables: ListMultimap<string, Assessable>;
  public expression: string[]
  public readonly condition: Condition;

  constructor(evaluations: Assessable[], condition: Condition, alias?: string) {
    this.pathsToAliases = new SetMultimap<string, string>();
    this.aliasesToAssesables = new ListMultimap<string, Assessable>();
    this.paths = new Set<string>();
    this.expression = [];

    for (let evaluation of evaluations) {
      for (let path of evaluation.paths) {
        this.pathsToAliases.set(path, evaluation.alias);
        this.paths.add(path);
      }
      this.aliasesToAssesables.set(evaluation.alias, evaluation);
      this.expression.push(evaluation.alias);
    }

    this.condition = condition;
    this.alias = alias ||= ( '( ' + evaluations.map(evaluation => evaluation.alias).join(` ${condition} `) + ' )' );
  }

  assessor<K>(reporter: Reporter<K>) : Assessor<K> {

    let assessors: Assessor<K>[] = [];
    for (let alias of this.aliasesToAssesables.keys()) {
      for (let assessable of this.aliasesToAssesables.get(alias)) {
         assessors.push(assessable.assessor(reporter));
      }
    }
    return reporter.aggregate(assessors, this.condition, this.alias);
  }
}
