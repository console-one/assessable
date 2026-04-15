

import { underride } from '../vendor/functional/object';
import type { Evaluation, EvaluationResultArgs } from './../types';
import { EvaluationStatus, OperatorSet } from './../types';
import StandardOperators from './standard';

const Underridden = StandardOperators as OperatorSet;

export default underride({
  HAS_ACCESS: (options: { credentials: any }) => ({
    name: 'has_access',
    names: ['has_access', 'hasaccess', 'HAS_ACCESS', 'hasAccess'],
    create: (contractName: string) => {
      let verifications = options.credentials(contractName);
      return {
        name: 'has_access',
        async evaluate(item: any, path: string) : Promise<EvaluationResultArgs> {
          let result = (await (await verifications)(item));
          if (result) return [EvaluationStatus.Pass];
          else  return [EvaluationStatus.Fail, 'Is not permitted to access: ' + contractName ];
        }
      } as Evaluation
    }
  })
}, Underridden) as OperatorSet ;

