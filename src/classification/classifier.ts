import { Classification , ClassificationResult } from './classification'
import {  WalkerFactory } from '../vendor/walker';
import { Subscription } from '../vendor/subscription'
import { QueryCollector } from './querycollector'

export class Classifier {

  classifications: Classification[]
  subscriptionsByName:  { [key: string]: Subscription<ClassificationResult> }
  nextClassifier: (item: any, ...extraInfo: any[]) => (inputHandler: { success: (...args: any[]) => void, error: (err?: any) => void }) => void
  next: number 
  output: Subscription<ClassificationResult>

  constructor(classifications: Classification[], 
    public walkerFactory: WalkerFactory, 
    public walkerType: string) {

    this.output = new Subscription<ClassificationResult>();
    this.subscriptionsByName = classifications.reduce((all, classification) => {
      all[classification.name] = new Subscription<ClassificationResult>();
      this.output.then((data, unsub) => {
        all[classification.name].resolve(data);
        return;
      });
      return all; 
    }, {} as { [key: string]: Subscription<ClassificationResult>  });

    this.classifications = classifications.map(classification => classification);
    this.next = 0; 
  }

  subscribe(name: string, subscription: Subscription<any>) {
    this.subscriptionsByName[name].pipe(subscription);
  }

  classify(item: any, ...extraInfo: any[]) {
    
    let walker = this.walkerFactory.create(this.walkerType);
    let itemNum = `${this.next}`;
    this.next += 1;
    let result = new Subscription(`item:${itemNum}`);
    let queries = this.classifications.map(classification => new QueryCollector(classification, itemNum, result));
    let queryMap: { [key: string]: QueryCollector } = {};

    let subscriptions = queries.reduce((paths, query) => {
      for (let key of query.pathHandlers.keys()) {
        if (!paths.has(key)) paths.set(key, new Subscription(`item:${itemNum}:${key}`));
        let subscription = query.pathHandlers.get(key);
        queryMap[subscription?.id] = query;
        if (subscription !== undefined) paths.get(key)?.pipe(subscription);
      }
      return paths;
    }, new Map<string, Subscription<any>>()); 

    for (let path of subscriptions.keys()) {
      let subscription =  subscriptions.get(path);
      if (subscription !== undefined) walker.addHandler(path, subscription);
    }

    walker.walk(item);

    for (let subscription of  subscriptions.values()) {
      if (subscription.lastEvent === undefined) {
        queryMap[subscription.id].done.forEach(fn => fn())
      }
    }

    let sub = new Subscription<any>();
    this.output.subscribe((item, unsub) => {
      if (Number(item.id) > Number(itemNum)) {
        sub.resolve(null);
        unsub();
      }
      if (Number(item.id) === Number(itemNum)) sub.resolve(item);
    });
    return sub;
  }
  

}