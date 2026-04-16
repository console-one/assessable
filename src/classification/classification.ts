import { Subscription } from '@console-one/subscription';
import { IsContinuousReporter } from '../reporter/iscontinuous.js';
import { Assessable, EvaluationResult, EvaluationStatus } from '../types.js';
import { QueryCollector } from './querycollector.js'
import { Requireable } from '../types.js';
import { Schema } from '../schema.js';

export type ClassificationResult = { classification: string, result: EvaluationResult, id: string }

export class Classification {

  outpipe: Subscription<any>
  ids: number
  items: number
  type: string

  constructor(
      public name: string, 
      public assessable: Assessable
    ) {
    this.assessable.alias = name;
    this.ids = 0;
    this.items = 0;
    this.type = `json`;
  }

  visit(paths: QueryCollector) : void {
    let assessor = this.assessable.assessor(IsContinuousReporter as any);
    for (let path of assessor.paths) {
      paths.where('json', path).then((item) =>  assessor.evaluate(item, path));
      paths.where('json', path).catch((err) => assessor.error(err, path));
    }
    paths.onComplete(() => setTimeout(() => paths.submit([EvaluationStatus.Fail, 'timeout']), 100));
    assessor.resolved((data, alias) => paths.submit(data as any));
  }

  static fromSchema(builder, name, schema)  {
    let requirements: Requireable = Schema(schema);
    let assessible = builder.toAssessable(requirements);
    assessible.alias = name;
    return new Classification(name, assessible);
  }
}