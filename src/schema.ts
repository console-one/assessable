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


export const Schema = (objectSchema: any): AssessableJSON => {
  let requirements = recursivelyBuild(objectSchema);
  return requirements;
}


