import { clone } from './vendor/functional/object.js';
import TestBuilder from './builder.js';
import type { AssessableJSON } from './types.js';
import { Condition } from './types.js';
import { and as andReqs, or as orReqs } from './utils.js';


export class SchemaBuilder {

  testBuilder: TestBuilder
  requirement: [(...all: any[]) => AssessableJSON, ...any[]]
  repo: Record<any, AssessableJSON>
  tempCondition: Condition

  constructor(repo: Record<any, AssessableJSON> = {}) {
    this.repo = repo;
    this.tempCondition = Condition.AND;
  }

  get requirements() {
    return this.requirement !== undefined ? [this.requirement] : []
  }

  and(...others: (AssessableJSON | string | SchemaBuilder)[]) {
    this.tempCondition = Condition.AND;
    this.where(...others)
    return this;
  }

  or(...others: (AssessableJSON | string | SchemaBuilder)[]) {
    this.tempCondition = Condition.OR;
    this.where(...others)
    return this;
  }

  where(...others: (AssessableJSON | string | SchemaBuilder)[]) {
    let conditionFunction = this.tempCondition === Condition.AND ? andReqs : orReqs;
    for (let item of others) {
      if (typeof item === 'string') {
        let cloned = clone(this.repo[item as string]);
        this.requirement.push([conditionFunction, cloned]);
      } else if (item instanceof SchemaBuilder) {
        let cloned = clone(item);
        this.requirement.push([conditionFunction, cloned]);
      } else {
        this.requirement.push([conditionFunction, item])
      }
    }
    return this;
  }

  lookslike(json: any) {
    this.requirement = [lookslike, Schema(json)]
    return this;
  }

  as(name: string) {
    let test = clone(this.requirements);
    this.repo[name] = test;
    return this;
  }

  build(path: string = '@', options: { builder?: TestBuilder } = {}) {
    let reduced = undefined;
    for (let i = 0; i < this.requirements.length; i++) {
      let inputs = (reduced === undefined) ? [path] : [reduced]
      reduced = this.requirements[i][0].apply(this.requirements[i][0], inputs.concat(this.requirements[i].slice(1)))
    }
    return reduced;
  }

  static defaultTestConfiguration: { builder: () => TestBuilder } = { builder: () => new TestBuilder([]) }
}


export const and = (...others: (AssessableJSON | string | SchemaBuilder)[]) => {
  let s = new SchemaBuilder();
  s.tempCondition = Condition.AND;
  return s.and(...others);
}

export const or = (...others: (AssessableJSON | string | SchemaBuilder)[]) => {
  let s = new SchemaBuilder();
  s.tempCondition = Condition.AND;
  return s.or(...others);
}

export const schema = (item: any) => {
  let bldr = new SchemaBuilder({});
  bldr.lookslike(item)
  return bldr;
}

export const lookslike = recursivelyBuild;

export enum SchemaTypes {
  number = 'number',
  string = 'string',
  object = 'object',
  boolean = 'boolean',
  function = 'function',
  array = 'array',
  error = 'error'
}

// todo, add relations here
function recursivelyBuild(obj: any, initialPath = '@', requirements: any[] = []): AssessableJSON {
  let path = initialPath === undefined ? '@' : initialPath;
  if (obj === null || obj === undefined) requirements.push([path, 'IS', obj]);
  else if (typeof obj === 'object') {
    if (obj instanceof SchemaBuilder) {
      requirements.push([path, 'IS', obj]);
    } else if (Object.keys(obj).length === 0) {
      requirements.push([path, 'IS', {}]);
    } else {
      for (let key of Object.keys(obj)) {
        requirements.push(recursivelyBuild(obj[key], path + '.' + key, requirements));
      }
    }
  } else if (obj in SchemaTypes) requirements.push([path, 'IS_TYPE', SchemaTypes[obj]])
  else requirements.push([path, 'IS', obj]);
  return {
    condition: Condition.AND,
    requirements: requirements
  }
}


/**
 * Recursive companion to {@link recursivelyBuild} that also adds
 * KEYS_ARE / LENGTH_IS at every object/array level. Closes the
 * "extra keys silently pass" and "longer arrays silently pass" gaps in
 * the open-shape Schema.
 */
function recursivelyBuildClosed(obj: any, initialPath = '@', requirements: any[] = []): AssessableJSON {
  const path = initialPath === undefined ? '@' : initialPath;
  if (obj === null || obj === undefined) {
    requirements.push([path, 'IS', obj]);
  } else if (typeof obj === 'object') {
    if (obj instanceof SchemaBuilder) {
      requirements.push([path, 'IS', obj]);
    } else if (Array.isArray(obj)) {
      requirements.push([path, 'LENGTH_IS', obj.length]);
      for (let i = 0; i < obj.length; i++) {
        recursivelyBuildClosed(obj[i], `${path}.${i}`, requirements);
      }
    } else if (Object.keys(obj).length === 0) {
      requirements.push([path, 'IS', {}]);
      requirements.push([path, 'KEYS_ARE', []]);
    } else {
      const keys = Object.keys(obj);
      requirements.push([path, 'KEYS_ARE', keys]);
      for (const key of keys) {
        recursivelyBuildClosed(obj[key], `${path}.${key}`, requirements);
      }
    }
  } else if (obj in SchemaTypes) {
    requirements.push([path, 'IS_TYPE', SchemaTypes[obj as keyof typeof SchemaTypes]]);
  } else {
    requirements.push([path, 'IS', obj]);
  }
  return {
    condition: Condition.AND,
    requirements,
  };
}

const SchemaImpl = (objectSchema: any): AssessableJSON => {
  return recursivelyBuild(objectSchema);
};

const SchemaClosedImpl = (objectSchema: any): AssessableJSON => {
  return recursivelyBuildClosed(objectSchema);
};

/**
 * Build an `AssessableJSON` from a schema-by-example.
 *
 * `Schema(obj)` is the open form: only the paths named in `obj` are
 * checked. Extra keys in actual / longer arrays in actual silently
 * pass. Useful for forward-compat checks.
 *
 * `Schema.closed(obj)` is the strict form: every object level also
 * carries a `KEYS_ARE` constraint, every array level a `LENGTH_IS`
 * constraint. Use when you want exact-shape matching.
 *
 * @example
 *   Schema({ name: 'string' })            // open
 *   Schema.closed({ name: 'string' })     // strict
 */
export const Schema: ((objectSchema: any) => AssessableJSON) & {
  closed: (objectSchema: any) => AssessableJSON;
} = Object.assign(SchemaImpl, { closed: SchemaClosedImpl });


