
import type { Reporter, Evaluation, Evaluatable, Assessor, Assessable, AssessableJSON, OperatorDefinitions } from './types.js';

export class Validation implements Evaluatable {

  public readonly alias: string;
  public readonly rhs: any; 
  public readonly op: string;
  public readonly lhs: string;
  private assessorMap: Map<string, Assessable>;

  constructor(input: any[]) {

    if (input.length < 4) {
      this.alias = '( ' + input[0] + ' ' + input[1] + ' ' + (input[2] as string) + ' )';
      this.lhs = input[0];
      this.op = input[1];
      this.rhs = input[2];
    } else {
      this.alias = input[0];
      this.lhs = input[1];
      this.op = input[2];
      this.rhs = input[3];
    }

    this.assessorMap = new Map<string, Assessable>();
  }

  assessor<K>(evaluation: Evaluation) : Assessable {
    if (!this.assessorMap.has(evaluation.name)) {
      let paths = new Set<string>([this.lhs]);
      let alias = this.alias;

      this.assessorMap.set(evaluation.name, {
        paths: new Set<string>([this.lhs]),
        alias: this.alias,
        assessor<K>(reporter: Reporter<K>) : Assessor<K> {
          return reporter.createReport(evaluation, paths, alias);
        }
      });
    }
    return this.assessorMap.get(evaluation.name);
  }

  static create(...input: Array<string>) {
    return new Validation(input);
  }
}

export class ValidatorFactory {

  public readonly operatorNamesToFactories: Map<string, OperatorDefinitions>;
  public readonly testValueCache: Map<string, Assessable>;

  constructor(opDefinitions: OperatorDefinitions[]) {
    this.operatorNamesToFactories = this.generateOperators(opDefinitions);
  }

  hasOperator(name) {
    return this.operatorNamesToFactories.has(name);
  }

  getOperator(name) {
    return this.operatorNamesToFactories.get(name);
  }

  create(...input: any[]) : Assessable {
    let opindex = (input.length > 3) ? 2 : 1;
    if (!this.operatorNamesToFactories.has(input[opindex])) {

      throw new Error(`A requirement was attempted to be created with operator named [${input[opindex]}] ` + 
        `. This operator does not exist in the set of all available: ${Array.from(this.operatorNamesToFactories.keys())}`)
    }
    let operatorDefinition: OperatorDefinitions = this.operatorNamesToFactories.get(input[opindex]);
    input[opindex] = operatorDefinition.name;
    let validation: Validation = Validation.create(...input);
    // uncomment and use in a cache map for optimization
    // let testIdentifier: string = operatorDefinition.name + validation.rhs;
    let evaluator: Evaluation = operatorDefinition.create(validation.rhs);
    return validation.assessor(evaluator);
  }

  private generateOperators(operators) {
    return operators.reduce((allOperators, operator) => {
      return operator.names.reduce((existingOperators, name) => {
        if (existingOperators.has(name)) {
          let errorMessage = `Cannot have two lookup operators applied to the
            for the same operation. Operation is: ${name} and operators are: 
            ${JSON.stringify(existingOperators.get(name), null, 4)} and 
            ${JSON.stringify(operator, null, 4)}`;
          throw new Error(errorMessage);
        }
        existingOperators.set(name, operator);
        return existingOperators;
      }, allOperators);
    }, new Map());
  }

}

