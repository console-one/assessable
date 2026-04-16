import { Subscription } from '@console-one/subscription';
import { WalkerFactory } from '@console-one/walker';
import type { OperatorDefinitions } from '../types.js';
import { ListMultimap } from '@console-one/multimap';
import TestBuilder from '../builder.js';
import StandardOperators from './../operators/standard.js';
import { Classification, ClassificationResult } from './classification.js';
import { Classifier } from './classifier.js';




export class ClassifierBuilder {

  classifications: Map<string, Classification>
  subscriptions: ListMultimap<string, Subscription<ClassificationResult>>

  builder: TestBuilder
  walkerFactory: WalkerFactory
  walkerType: string

  constructor(operators: OperatorDefinitions[] = Array.from(Object.values(StandardOperators).map(op => op() as OperatorDefinitions))) {
    this.builder = new TestBuilder(operators);
    this.walkerFactory = WalkerFactory;
    this.walkerType = 'json';
    this.classifications = new Map<string, Classification>();
    this.subscriptions = new ListMultimap<string, Subscription<any>>();
  }

  addClassificationRequirement(
    name: string,
    requirements: any[]
  ) {
    let assessable = this.builder.toAssessable({
      requirements: requirements,
      condition: 'AND'
    });
    assessable.alias = name;
    let classification = new Classification(name, assessable);
    this.classifications.set(name, classification);
    return this;
  }
  
  addClassification<T>(name: string, json: any) {
    let classification = Classification.fromSchema(this.builder, name, json);
    this.classifications.set(name, classification);
    return this;
  }

  on<T>(name: string, 
    listener: (item: T, unsubscribe: () => void, id?: string) => void) {

    let subscription: any = new Subscription<T>();
    this.subscriptions.set(name, subscription);
    subscription.then((item, unsub) => {
      listener(item, () => {
        unsub();
      })
    });

    subscription.catch((err, unsub) => {
      unsub();
    });
    return this;
  }

  build() {
    let classifications: any[] = [];
    for (let key of this.classifications.keys()) {
      classifications.push(this.classifications.get(key));
    }
    let classifier = new Classifier(classifications, this.walkerFactory, this.walkerType);
    for (let key of this.subscriptions.keys()) {
      for (let subscription of this.subscriptions.get(key)) {
        classifier.subscribe(key, subscription);
      }
    }
    return classifier;
  }

  static create() {
    return new ClassifierBuilder();
  }
}

