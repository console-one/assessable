

export type FillFunction<V, K> = ((i: V) => K);

export type Predicate<V extends object> = ((item: V) => boolean)

export type Mapper<V extends object> = ((item: V) => V)

export type Converter<V extends object, K> = ((item: V) => K)

export const push = <Item> (arr: Item[], item: Item) : Item[] => { 
  arr.push(item); return arr; 
};

export const dedupe = <K> (arr: Iterable<K>) : Iterable<K> => [...new Set([...arr])];

export const fill= <K, V>(times: number, fnc: FillFunction<any, V> = i => i) : V[] => {
  let arr = [];
  for (let i = 0; i < times; i++) {
    arr.push(fnc(i));
  }
  return arr;
}

export const toSet = <T>(arr: T[]) : Set<T> => {
  return arr.reduce((s, item) => {
    s.add(item);
    return s;
  }, new Set<T>());
}

export const has = <V extends object>(prop: string) : Predicate<V> => {
  return (item: V) => item.hasOwnProperty(prop)
}

export const isDefined = <V extends object>(prop: string) : Predicate<V> => {


  let parts = prop.split('.');


  return (item: V) => {

    let i = 0; 

    let branch = item;

    let pathIsDefined = true;

    while (i < parts.length) {

      if (typeof branch !== 'object' || 
          branch[parts[i]] === undefined) {
        
        pathIsDefined = false
        break;
      }
      
      branch = branch[parts[i]];
      i+=1;
    }

    return pathIsDefined;
  }
}


export const where = <V extends object>(prop: string, pred: Predicate<V>) : Predicate<V> => {
  return (item: V) => (has(prop)(item) && pred(item[prop]));
}

export const select = <V extends object> (...props: string[]) : Mapper<V> => {
  return (item: V) : V => {
    let filteredProperties: string[] = props.filter(prop => has(prop)(item));
    return filteredProperties.reduce((newItem: V, prop: string) => {
      newItem[prop] = item[prop];
      return newItem;
    }, ({} as V));
  }
}

export const pick = <V extends object, K>(prop: string): Converter<V, K> => {
  return (item: V): K => {
    return item[prop];
  }
}

export const label = <V extends object>(key: string, value: any): Mapper<V> => {
  let isFunction = (typeof value === 'function');
  return (item: V): V => {
    item[key] = isFunction ? value(key) : value;
    return item;
  }
}

export const keys = <V extends object> (item: V) : string[] => Array.from(Object.keys(item))

export const omit = <V extends object> (...props: string[]) : Mapper<V> => {
  let omitting = new Set<string>(props);
  return (item: V) : V => {
    let allowedProperties: string[] = keys(item).filter(prop => !omitting.has(prop));
    return allowedProperties.reduce((newItem, prop) => {
      newItem[prop] = item[prop];
      return newItem;
    }, ({} as V));
  }
}

export const underride =  <V extends object> (source: V, other: V) : V => {
  return keys(other).filter((key: string) => !has(key)(source))
    .reduce((newSource: V, prop: string) => {
      newSource[prop] = other[prop]
      return newSource;
    }, source);
}

export const recursiveUnderride = (obj1, obj2) => {

  const createJSONWalker = (obj2, createState, updator) => {
    let branch = obj2;
    let state = createState();
    let branchStack = [];
    let stateStack = [];
    let pathStack = [];

    return {

      push(key) {
        branchStack.push(branch);
        stateStack.push(state);
        pathStack.push(key);
        state = createState();
        branch = branch[key];
      },

      pop() {
        let keyOnPrev = pathStack.pop();
        let prevState = stateStack.pop();
        prevState[keyOnPrev] = state;
        state = prevState;
        branch = branchStack.pop();
      },

      // we visit key values when they are not objects
      // the branch is the obj2 value to compare it with
      visit(key, val) {
        if (branch === undefined) {
          state = updator(state, [key, val, undefined]);
        } else {
          state = updator(state, [key, val, branch[key]]);
        }
      },

      result() {
        return state;
      }
    }
  }

  function walkJSON(obj1, obj2, walker) {
    let allKeys = Object.keys(obj1).concat(Object.keys(obj2));
    for (let key of allKeys) {
      if (typeof obj1[key] === 'object' && !(Array.isArray(obj1[key]))) {
        // if there is a nested obejct we push onto the walker
        walker.push(key);
        walkJSON(obj1[key], obj2[key], walker);
        walker.pop(); // pop out walker when we are done with the nested object
      } else {
        walker.visit(key, obj1[key]); // if the value of the key is not an obejct then we just visit it
      }
    }
  }

  let walker = createJSONWalker(obj2,
    () => { return {} },
    (newObj, [key, obj1Val, obj2Val]) => {
      if (obj2Val === undefined) {
        newObj[key] = obj1Val;
      } else {
        newObj[key] = obj2Val;
      }
      return newObj;
    });
  walkJSON(obj1, obj2, walker);
  return walker.result();
}


export const setProp = <V extends object> (prop: string, val: any) : Mapper<V> => {
  return (item: V) => {
    item[prop] = val;
    return item;
  }
}

export const setOrUpdateProp = <V extends object> (
  prop: string, 
  createState: (() => any), 
  updateState: ((value: any) => any)) : Mapper<V> => {
  return (item: V) => {
    item[prop] = has(prop)(item) ? createState() : updateState(item[prop]);
    return item;
  }
}

export const fromMap = <V> (map: Map<any, V>): { [key: string | number]: V } => {
  let item: { [key: string | number]: V } = {};
  for (let key of map.keys()) {
    item[key] = map.get(key);
  }
  return item;
}

export const clone = (data: any, recursion?: any, path?: any[], references?: any, cloneMap?: any) => {

  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;

  if (recursion === undefined || !(recursion instanceof Map)) recursion = new Map<any, any>();
  if (path === undefined) path = [];
  if (references === undefined || !(references instanceof Map)) references = new Map<any, any>();
  if (cloneMap === undefined || !(cloneMap instanceof Map)) cloneMap= new Map<any, any>();
  
  recursion.set(data, path.join(':') + '' );


  let cloned: any;

  if (!Array.isArray(data)) {

    cloned = {};

    for (let key of Object.keys(data)) {

      path.push(key);

      let propertyItem = data[key];
      if (recursion.has(propertyItem)) {
        if (!cloneMap.has(recursion.get(propertyItem))) {
          if (!references.has(recursion.get(propertyItem))) {
            references.set(recursion.get(propertyItem), []);
          }
          references.get(recursion.get(propertyItem)).push([cloned, key]);
        } else {
          cloned[key] = cloneMap.get(recursion.get(propertyItem))
        }
      } else {
        cloned[key] = clone(propertyItem, recursion, path, references, cloneMap);
      }
      path.pop();
    }


  } else {

    cloned = [];

    for (let index = 0; index < data.length; index++) {

      path.push(index + '')

      let propertyItem = data[index];

      if (recursion.has(propertyItem)) {
        if (!cloneMap.has(recursion.get(propertyItem))) {
          if (!references.has(recursion.get(propertyItem))) {
            references.set(recursion.get(propertyItem), []);
          }
          references.get(recursion.get(propertyItem)).push([cloned, index]);
          cloned.push(recursion.get(propertyItem));
        } else {
          cloned.push(cloneMap.get(recursion.get(propertyItem)));
        }
      } else {
        cloned.push(clone(propertyItem, recursion, path, references, cloneMap));
      }

      path.pop();

    }
  }

  if (references.has(path.join(':') + '')) {
    for (let toSet of references.get(path.join(':'))) {
      toSet[0][toSet[1]] = cloned;
    }
  }

  references.delete(path.join(':') + '');

  cloneMap.set(path.join(':') + '', cloned);

  return cloned;
}

export const duplicate = <V extends object> (obj: V) : V => {
  return (JSON.parse(JSON.stringify(obj)) as V)
}

const CollisionPolicies = {
    toArray: <T>(...args: T[]) : T[] => args,
    first: <T>(a: T) : T => a,
    last: <T, V>(a: T, b: V) : V => b
}
export const merge = <V extends object> (objs: V[], collisionPolicy: ((...args: any[]) => any) = CollisionPolicies.toArray) : V => {
  return objs.reduce((total, next) => {
     if ((next !== null) && next !== undefined) {
       for (let key of Object.keys(next)) {
         if (total.hasOwnProperty(key)) {
           total[key] = collisionPolicy(total[key], next[key]);
         } else {
           total[key] = next[key];
         }
       }
     }
     return total;
   }, ({} as V)); 
}

export const mergeMaps = <T, V>(a: Map<T, V>, b: Map<T, V>): Map<T, V> => {
  let newMap = new Map<T, V>();
  for (let aKey of a.keys()) newMap.set(aKey, a.get(aKey));
  for (let bKey of b.keys()) newMap.set(bKey, b.get(bKey));
  return newMap;
}

export const copyMap = <T, V>(a: Map<T, V>): Map<T, V> => {
  let newMap = new Map<T, V>();
  for (let aKey of a.keys()) newMap.set(aKey, a.get(aKey));
  return newMap;
}

export const nl = (indents: number = 0) : string => {
  let nline = "\n";
  for (let i=0;i<indents;i++) nline += '  ';
  return nline;
};

export const pivot = <A, K>(arr: A[], extract: (input: A) => K) => {
  return arr.reduce((map, item) => {
    map.set(extract(item), item);
    return map;
  }, new Map<K, A>())
}

export const pivotByOrder = <A, K>(arr: A[], extract: (input: A) => K) => {
  return arr.map((item, index) => [item, index] as [key: A, name: number])
            .reduce((map, item: [key: A, name: number]) => {
              map.set(extract(item[0]), item[1]);
              return map;
            }, new Map<K, number>())
}

export const setNilTo = <T extends object>(item: T, defaults: { [key: string]: () => any }, newItem: () => T = () => ({} as T)): T => {
  if (item === undefined) item = newItem();
  for (let key of Object.keys(defaults)) {
    if (item[key] === undefined) item[key] = defaults[key]();
  }
  return item;
}

export const prune = (
  row: (fnc: { key: any, value: any }) => boolean = () => true,
  subselect: (item: any, key: any) => any = (i) => i
): (item: any) => any  => {
  return (item) => {
    let out: any = {};
    for (let key of Object.keys(item)) {
      if (row({ key: key, value: item[key] })) out[key] = subselect(item[key], key);
    }
    return out;
  }
}

export const entriesToMap = (...entries) => {
  let map = new Map<any, any>();
  for (let entry of entries) {
    map.set(entry[0], entry[1]);
  }
  return map;
}


