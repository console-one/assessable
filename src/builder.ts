import Requirement from './requirement.js';
import type { Assessable, AssessableJSON, Assessor, Evaluation, OperatorDefinitions, Reporter, Requireable } from './types.js';
import { Condition } from './types.js';
import { ValidatorFactory } from './validation.js';

class EvaluationIndex {

  evaluationMap: any

  constructor() {
    this.evaluationMap = new Map();
  }

  toAssessable(evaluation: Evaluation) {
    if (!this.evaluationMap.has(evaluation.name)) {
      let paths =  new Set<string>(['@']); 
      this.evaluationMap.set(evaluation.name, {
        paths: paths,
        alias: evaluation.name,
        assessor<K>(reporter: Reporter<K>) : Assessor<K> {
          return reporter.createReport(evaluation, paths, evaluation.name);
        }
      });
    }
    return this.evaluationMap.get(evaluation.name);
  }
}

export default class Builder {

  public readonly validatorFactory: ValidatorFactory;
  private condition: Condition;
  private evaluationGroup: Assessable[];
  private evaluationIndex: EvaluationIndex

  constructor(opDefinitions: OperatorDefinitions[]) {
    this.validatorFactory = new ValidatorFactory(opDefinitions);
    this.condition = Condition.OR;
    this.evaluationGroup = [];
    this.evaluationIndex = new EvaluationIndex();
  }

  where(...input: any[]) : Builder {
    if (input.length === 1 && typeof input[0] === 'object' && 
        input[0].condition !== undefined && input[0].requirements !== undefined) {
      let evaluate: AssessableJSON = input[0] as AssessableJSON;
      this.evaluationGroup.push(this.toAssessable(evaluate));
    } else {
      let validationStrings = input as any[];
      let evaluate: Assessable = this.validatorFactory.create(...validationStrings);
      this.evaluationGroup.push(evaluate);
    }
    return this;
  }

  witEvaluation(data: Evaluation): Assessable {
    return this.evaluationIndex.toAssessable(data);
  }

  toAssessable(data: Requireable | Evaluation) : Assessable {
    if (Array.isArray(data)) {
      let validationStrings: any[] = data as any[];
      return this.validatorFactory.create(...validationStrings);
    } else if (typeof data === 'object') {
 
      let assessableJson = data as AssessableJSON;
      let assessables = [];
      for (let reqIndex = 0; reqIndex < assessableJson.requirements.length; reqIndex++) {
        let requirement = assessableJson.requirements[reqIndex];
        if (Array.isArray(requirement)) assessables.push(this.toAssessable(requirement));
      }
      if (assessableJson.hasOwnProperty('alias')) {
        return new Requirement(assessables, assessableJson.condition as Condition, assessableJson.alias);
      }
      return new Requirement(assessables, assessableJson.condition as Condition);
    
    }
  }

  build(condition?: Condition) : Assessable {
    let requirement: Assessable = null;
    if (this.evaluationGroup.length === 1) {
      requirement = this.evaluationGroup[0];
    } else {
      if (condition === null) condition = this.condition;
      requirement = new Requirement(this.evaluationGroup, condition);
    }
    this.evaluationGroup = [];
    this.condition = Condition.OR;
    return requirement;
  }
}
