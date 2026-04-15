
export class ListMultimap<T, Q> {

  private map: Map<T, Q[]>;

  constructor() {
    this.map = new Map<T, Q[]>();
  }

  has(key: T) : boolean {
    return !(!this.map.has(key) || this.map.get(key).length === 0)
  }

  get(key: T) : Q[] {
    if (!this.map.has(key)) return [];
    return this.map.get(key);
  }

  set(key: T, value: Q) : ListMultimap<T, Q> {
    if (!this.has(key)) {
      this.map.set(key, []);
    }

    let list: Q[] = this.map.get(key);
    list.push(value);
    this.map.set(key, list);
    return this;
  }

  delete(key: T) : ListMultimap<T, Q> {
    this.map.delete(key);
    return this;
  }

  setAll(key: T, values: Iterable<Q>) : ListMultimap<T, Q> {
    for (let value of values) this.set(key, value);
    return this;
  }

  keys() : T[] {
    return Array.from(this.map.keys());
  }

  merge(other: ListMultimap<T, Q>) : ListMultimap<T, Q> {
    for (let key of other.keys()) this.setAll(key, other.get(key));
    return this;
  }

  public static combine<T, Q>(a: ListMultimap<T, Q>, b: ListMultimap<T, Q>) : ListMultimap<T, Q> {
    let mMap = new ListMultimap<T, Q>();
    for (let key of a.keys()) mMap.setAll(key, a.get(key));
    for (let key of b.keys()) mMap.setAll(key, b.get(key));
    return mMap;
  }

  public static fromList<K, T, Q>(
    list: Q[], 
    categorizer: ((item: Q) => K), 
    operator: ((item: any) => T) = (item => item)) : ListMultimap<K, T> {
    return list.reduce((map: ListMultimap<K, T>, item: Q) => {
      return map.set(categorizer(item), operator(item));
    }, new ListMultimap<K, T>());
  }
}