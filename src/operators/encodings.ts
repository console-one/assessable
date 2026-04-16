
import type { EvaluationResultArgs } from './../types.js';
import { EvaluationStatus } from './../types.js';

export default {
  // IS_ENCODING: () => ({
  //   name: 'is_encoding',
  //   names: ['isEncoding', 'is_encoding', 'ISENCODING', 'IS_ENCODING', 'isencoding'],
  //   create: (encoding: string) => ({
  //     name: 'is encoding',
  //     async evaluate(item: any, path: string) : Promise<EvaluationResultArgs> {
  //       try {
  //         if (typeof item === 'string') {
  //           let json = JSON.parse(encoding);
  //           let rootEncoding = json['encoding'];
  //           let encodingOrError = decode( item, rootEncoding);
  //           if (encodingOrError instanceof Error) return [EvaluationStatus.Fail, encodingOrError.message]
  //           let intervalOutput: any = encodingOrError;
           
  //         }
  //         return [EvaluationStatus.Pass];
  //       } catch (err) {
  //         return [
  //           EvaluationStatus.Fail,
  //           `Item ${item} at path ${path} is not required type of: ${encoding}.\nItem type is: ${typeof item} and ${item.constructor.name}.`
  //         ];
  //       }
  //     }
  //   })
  // })
}