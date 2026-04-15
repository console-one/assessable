

export class SetMultimap<T, Q> {

  private map: Map<T, Set<Q>>;

  constructor() {
    this.map = new Map<T, Set<Q>>();
  }

  has(key: T) : boolean {
    return !(!this.map.has(key) || this.map.get(key).size === 0)
  }

  get(key: T) : Set<Q> {
    if (!this.map.has(key)) {
      return new Set<Q>();
    } 
    return this.map.get(key);
  }

  set(key: T, value: Q) : SetMultimap<T, Q> {
    if (!this.has(key)) {
      this.map.set(key, new Set<Q>());
    }
    let set: Set<Q> = this.map.get(key);
    set.add(value);
    this.map.set(key, set);
    return this;
  }

  delete(key: T) : SetMultimap<T, Q> {
    this.map.delete(key);
    return this;
  }

  setAll(key: T, values: Iterable<Q>) : SetMultimap<T, Q> {
    for (let value of values) this.set(key, value);
    return this;
  }

  keys() : T[] {
    return Array.from(this.map.keys());
  }

  count(key: T): number {
    if (!this.map.has(key)) return 0;
    else return this.map.get(key).size;
  }

  merge(other: SetMultimap<T, Q>) : SetMultimap<T, Q> {
    for (let key of other.keys()) this.setAll(key, other.get(key));
    return this;
  }

  copy() : SetMultimap<T, Q> {
    let nMap = new SetMultimap<T, Q>();
    for (let key of this.keys()) nMap.setAll(key, this.get(key));
    return nMap;
  }


  toJSON(serializer: (item: any) => string = (item: any) => item.toString()) {
    let result: { [key: string]: any[] } = {};
    for (let key of this.keys()) {
      result[serializer(key)] = Array.from(this.get(key))
    }
    return result;
  }

  static combine<T, Q>(a: SetMultimap<T, Q>, b: SetMultimap<T, Q>) : SetMultimap<T, Q> {
    let mMap = new SetMultimap<T, Q>();
    for (let key of a.keys()) mMap.setAll(key, a.get(key));
    for (let key of b.keys()) mMap.setAll(key, b.get(key));
    return mMap;
  }

  static fromList<K, T, Q>(
    list: Q[], 
    categorizer: ((item: Q) => K), 
    operator: ((item: any) => T) = (item => item)) : SetMultimap<K, T> {
    return list.reduce((map: SetMultimap<K, T>, item: any) => {
      map.set(categorizer(item), operator(item));
      return map;
    }, new SetMultimap<K, T>());
  }

  static fromJSON = (item: any, deserializer: (str: string) => any = str => str) => {
    let multimap = new SetMultimap<any, any>();
    for (let key of Object.keys(item)) {
      for (let subNode of item[key]) {
        multimap.set(key, subNode);
      }
    }
    return multimap;
  }
}
