
import { AssessableJSON } from './types.js'
/**
 * Combines two AssessableJSON objects using a logical AND operation.
 *
 * The `and` function serves to create a composite AssessableJSON object
 * by merging two input AssessableJSON objects. This composite object is
 * primarily intended to serve as a more complex filtering or conditional
 * criterion, particularly useful in scenarios where multiple conditions
 * need to be met.
 *
 * ## How It Works
 * 
 * - The `condition` field of the resultant object is always set to 'AND'.
 *
 * - The `alias` fields from the two input objects are concatenated with 'and'
 *   only if both input objects have an `alias`.
 *
 * - The `requirements` field is combined based on the following rules:
 *   1. If both input objects have `condition` as 'AND', their `requirements`
 *      arrays are concatenated.
 *   2. If one object has `condition` as 'AND' and the other as 'OR', the 'AND'
 *      object's `requirements` array is extended to include the 'OR' object.
 *   3. If both objects have `condition` as 'OR', the `requirements` of the new
 *      'AND' object contains both 'OR' objects.
 *
 * @param {AssessableJSON} requireable1 - The first input AssessableJSON object.
 * @param {AssessableJSON} requireable2 - The second input AssessableJSON object.
 * 
 * @returns {AssessableJSON} A new AssessableJSON object that represents the
 * logical AND of the two input objects.
 * 
 * @example
 * ```typescript
 * const obj1: AssessableJSON = { condition: 'AND', requirements: [...], alias: 'alias1' };
 * const obj2: AssessableJSON = { condition: 'OR', requirements: [...], alias: 'alias2' };
 * const result = and(obj1, obj2);
 * ```
 */
export const and = (requirable1: AssessableJSON, requireable2: AssessableJSON) => {
  let result: any = { condition: 'AND' };
  result.condition = 'AND';
  if (requirable1.alias !== undefined && requireable2.alias !== undefined) {
    result.alias = `${requirable1.alias} and ${requireable2.alias}`;
  }
  if (requirable1.condition === 'AND')
    if (requireable2.condition === 'AND') result.requirements = requirable1.requirements.concat(requireable2.requirements);
    else result.requirements = requirable1.requirements.concat([requireable2]);
  else if (requireable2.condition === 'OR') result.requirements = requirable1.requirements.concat([requireable2])
  else result.requirements = requireable2.requirements.concat([requirable1]);
  return result;
}

export const or = (requirable1: AssessableJSON, requireable2: AssessableJSON) => {
  let result: any = { condition: 'OR' };
  result.condition = 'OR';
  if (requirable1.alias !== undefined && requireable2.alias !== undefined) {
    result.alias = `${requirable1.alias} and ${requireable2.alias}`;
  }
  if (requirable1.condition === 'OR')
    if (requireable2.condition === 'OR') result.requirements = requirable1.requirements.concat(requireable2.requirements);
    else result.requirements = requirable1.requirements.concat([requireable2]);
  else if (requireable2.condition === 'OR') result.requirements = requirable1.requirements.concat([requireable2])
  else result.requirements = requireable2.requirements.concat([requirable1]);
  return result;
}
