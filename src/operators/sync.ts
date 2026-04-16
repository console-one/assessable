
import { deepEqual } from '../vendor/equals.js';
import { EvaluationStatus } from './../types.js';
import type { EvaluationResult, EvaluationResultArgs, Evaluation } from './../types.js';

export const Operators = {

  IS_TYPE: () => ({
    name: 'is type',
    names: ['isType', 'is_type', 'ISTYPE', 'IS_TYPE', 'istype'],
    create: (typeName: string) => ({
      name: 'is type',
      evaluate(item: any, path: string): EvaluationResultArgs {
        if (typeName !== 'array' && typeof item === typeName) return [EvaluationStatus.Pass];
        else if (typeName === 'array' && typeof item === 'object' && Array.isArray(item)) return [EvaluationStatus.Pass];
        else if (item.constructor.name.toUpperCase() === typeName.toUpperCase()) return [EvaluationStatus.Pass]
        return [
          EvaluationStatus.Fail,
          `Item ${item} at path ${path} is not required type of: ${typeName}.\nItem type is: ${typeof item} and ${item.constructor.name}.`
        ];
      }
    })
  }),
  
  IS: () => ({
    name: 'is',
    names: ['is', 'IS', 'EQUALS', 'IS_EQUAL'],
    create: (other: any) => ({
      name: 'is',
      evaluate(item: any, path: string): EvaluationResultArgs {
        if (deepEqual(item, other)) return [EvaluationStatus.Pass];
        return [
          EvaluationStatus.Fail,
          `${JSON.stringify(item, null, 4)} is not equal to: ${JSON.stringify(other, null, 4)}.`
        ];
      }
    })
  }),

  EXISTS: () => ({
    name: 'exists',
    names: ['exists', 'EXISTS'],
    create: () => ({
      name: 'exists',
      evaluate(item: any, path: string): EvaluationResultArgs {
        if (item !== null || item !== undefined) return [EvaluationStatus.Pass]
        else [
          EvaluationStatus.Fail,
          `Item expected to not be equal to null or undefined, but it is...`
        ];
      }
    })
  }),

  CONTAINS: () => ({
    name: 'contains',
    names: ['contains', 'CONTAINS'],
    create: (value: any) => ({
      name: 'contains',
      evaluate(item: any, path: string): EvaluationResultArgs {
        let toList = (item as Iterable<any>);
        let pass = false;
        for (let listEntry of toList) {
          if (deepEqual(listEntry, value)) {
            pass = true;
            break;
          }
        }
        if (pass) return [EvaluationStatus.Pass]
        else {
          return [
            EvaluationStatus.Fail,
            `Expected ${JSON.stringify(item, null, 4)} to contain ${JSON.stringify(value, null, 4)}, but it does not!`
          ];
        }
      }
    })
  }),

  IS_IN: () => ({
    name: 'is in',
    names: ['IS_IN', 'isIn', 'is_in', 'isin'],
    create(iterable: Iterable<any>) {
      let s = new Set<any>();
      for (let item of iterable) {
        s.add(item);
      }
      return {
        name: 'is in',
        evaluate(item: any, path: string): EvaluationResultArgs {
          if (s.has(item)) return [EvaluationStatus.Pass]
          else {
            return [
              EvaluationStatus.Fail,
              `Set does not contain value of: ${item}`
            ];
          }
        }
      }
    }
  })
}



export const AsArray = Array.from(Object.values(Operators)).map(value => value())

export default Operators;