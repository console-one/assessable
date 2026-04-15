

import { RapidTestGenerator } from "../generator" 
import AccessPermissioning from './../operators/credentials'
import { OperatorSet, OperatorDefinitions } from './../types'
import TestBuilder from "../builder"

export default (credentialsProvider: (name: string) => Promise<(json: any) => Promise<boolean>>) => {
  let operators: OperatorDefinitions[] = []; 
  for (let operatorKey of Object.keys(AccessPermissioning as OperatorSet)) {
    operators.push(AccessPermissioning[operatorKey](credentialsProvider));
  }
  let testBuilder = new TestBuilder(operators);
  let testGenerator = new RapidTestGenerator(testBuilder);
  return testGenerator;
}


