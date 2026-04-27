
import { deepEqual } from '../vendor/equals.js';
import type { Evaluation, EvaluationResultArgs } from './../types.js';
import { EvaluationStatus } from './../types.js';

export default {

  IS_TYPE: () => ({
    name: 'is type',
    names: ['isType', 'is_type', 'ISTYPE', 'IS_TYPE', 'istype'],


    create: (typeName: string) => ({
      name: 'is type',
      dependencies: ['./'],
      async evaluate(item: any, path: string) : Promise<EvaluationResultArgs> {
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
    create: (other: any) => {
      return {
        name: 'is',
        async evaluate(item: any, path: string): Promise<EvaluationResultArgs> {
          if (deepEqual(item, other)) return [EvaluationStatus.Pass];
          return [
            EvaluationStatus.Fail,
            `${JSON.stringify(item, null, 4)} is not equal to: ${JSON.stringify(other, null, 4)}.`
          ];
        }
      }
    }
  }),

  EXISTS: () => ({
    name: 'exists',
    names: ['exists', 'EXISTS'],
    create: () => ({
      name: 'exists',
      async evaluate(item: any, path: string): Promise<EvaluationResultArgs> {
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
      async evaluate(item: any, path: string): Promise<EvaluationResultArgs> {
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
    create(iterable: Iterable<any>) : Evaluation {
      let s = new Set<any>();
      for (let item of iterable) {
        s.add(item);
      }
      return {
        name: 'is in',
        async evaluate(item: any, path: string): Promise<EvaluationResultArgs> {
          if (s.has(item)) return [EvaluationStatus.Pass]
          else [
            EvaluationStatus.Fail,
            `Set does not contain value of: ${item}`
          ];
        }
      }
    }
  }),

  // KEYS_ARE — value at path must be a plain object whose key set equals
  // the supplied list. Both extra and missing keys are reported.
  // Closes the open-shape escape hatch in `Schema(obj)` (which only
  // checks paths it names).
  KEYS_ARE: () => ({
    name: 'keys are',
    names: ['KEYS_ARE', 'keysAre', 'keys_are', 'keysare'],
    create: (expectedKeys: string[]) => ({
      name: 'keys are',
      async evaluate(item: any, path: string): Promise<EvaluationResultArgs> {
        if (typeof item !== 'object' || item === null || Array.isArray(item)) {
          return [
            EvaluationStatus.Fail,
            `Item at ${path} is not a plain object — cannot check key set.`,
          ];
        }
        const actualKeys = new Set(Object.keys(item));
        const expected = new Set(expectedKeys);
        const extra = [...actualKeys].filter((k) => !expected.has(k));
        const missing = [...expected].filter((k) => !actualKeys.has(k));
        if (extra.length === 0 && missing.length === 0) return [EvaluationStatus.Pass];
        const parts: string[] = [];
        if (extra.length > 0) parts.push(`extra keys: ${extra.join(', ')}`);
        if (missing.length > 0) parts.push(`missing keys: ${missing.join(', ')}`);
        return [
          EvaluationStatus.Fail,
          `Object at ${path} has key set mismatch — ${parts.join('; ')}.`,
        ];
      },
    }),
  }),

  // LENGTH_IS — value at path must have a numeric `.length` matching the
  // supplied number. Works on arrays and strings; can be used to enforce
  // exact array sizes (the open-shape escape hatch in `Schema([...])`).
  LENGTH_IS: () => ({
    name: 'length is',
    names: ['LENGTH_IS', 'lengthIs', 'length_is', 'lengthis'],
    create: (expected: number) => ({
      name: 'length is',
      async evaluate(item: any, path: string): Promise<EvaluationResultArgs> {
        if (item === null || item === undefined || typeof item.length !== 'number') {
          return [
            EvaluationStatus.Fail,
            `Item at ${path} has no numeric .length property — cannot check length.`,
          ];
        }
        if (item.length === expected) return [EvaluationStatus.Pass];
        return [
          EvaluationStatus.Fail,
          `Length at ${path} is ${item.length}; expected ${expected}.`,
        ];
      },
    }),
  }),
}
