

import { RapidTestGenerator } from "../generator.js"
import AccessPermissioning from './../operators/credentials.js'
import { OperatorSet, OperatorDefinitions } from './../types.js'
import TestBuilder from "../builder.js"

export default (credentialsProvider: (name: string) => Promise<(json: any) => Promise<boolean>>) => {
  let operators: OperatorDefinitions[] = []; 
  for (let operatorKey of Object.keys(AccessPermissioning as OperatorSet)) {
    operators.push(AccessPermissioning[operatorKey](credentialsProvider));
  }
  let testBuilder = new TestBuilder(operators);
  let testGenerator = new RapidTestGenerator(testBuilder);
  return testGenerator;
}


