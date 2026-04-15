

export default class TestSet<K> {

  resultMap: Map<string, Promise<K>>
  resolved: Set<string>;

  constructor() {
    this.resultMap = new Map<string, Promise<K>>();
  }

  addTest(name: string, result: Promise<K>) : TestSet<K> {
    this.resultMap.set(name, result);
    return this;
  }

  allFinished() : Promise<Map<string, K>> {

    return new Promise((resolve, reject) => {

      let allResults = new Map<string, K>();
      let allKeys = new Set<string>([...this.resultMap.keys()]); 
      
      for (let key of this.resultMap.keys()) {
        this.resultMap.get(key).then(result => {
          allKeys.delete(key);
          allResults.set(key, result);
          if (allKeys.size < 1) {
            resolve(allResults);
          }
        }).catch(err => {
          console.error("Error in aggregating test result: ", err);
          reject(err);
        });
      }
    });

  }
}