import { Handler, WalkerFactory } from '@console-one/walker';
import { Schema } from './schema.js';
import { ObservableQueue as Queue } from '@console-one/collections';
import TestBuilder from './builder.js';
import StandardOperators from './operators/sync.js';
import { IsContinuousReporter } from './reporter/iscontinuous.js';
import TestRunner from './runner.js';
import type { Assessable } from './types.js';
import { Requireable } from './types.js';

const testRunner: TestRunner<boolean> = new TestRunner(IsContinuousReporter);

export class Classification {

  subscribers: Map<number, ClassifierListener>
  ids: number
  pathHandlers: Map<string, Handler>

  constructor(
    public name: string,
    public assessable: Assessable
  ) {

    this.assessable.alias = name;
    this.pathHandlers = new Map<string, Handler>();
    this.subscribers = new Map<number, ClassifierListener>();
    this.ids = 0;
  }

  subscribe(subscription: ClassifierSubscription) {
    let id = this.ids;
    this.ids += 1;
    this.subscribers.set(id, subscription(() => {
      this.subscribers.delete(id);
    }));
  }

  visitWith(walker, onItem): void {

    let assessor = this.assessable.assessor(IsContinuousReporter);

    for (let path of assessor.paths) {
      walker.addHandler(path, new Handler(
        (item) => {
          assessor.evaluate(item, path)
        },
        (err) => assessor.error(err, path)
      ));
    }

    let hasSuccess = false;
    let foundResult = false;
    let hasItem = false;
    let item = null;
    let extraInfo: any[] = [];

    onItem((nextItem, ...nextExtraInfo) => {

      console.log(
        "On Item Called with: ",
        "Next item=", nextItem,
        "Next Extra Info=", nextExtraInfo
      );

      if (foundResult && hasSuccess) {
        item = nextItem;
        extraInfo = nextExtraInfo;
        for (let subscriberKey of this.subscribers.keys()) {
          this.subscribers.get(subscriberKey)(item, ...extraInfo);
        }

      } else if (!foundResult) {
        hasItem = true;
        item = nextItem;
        extraInfo = nextExtraInfo;
      }
    });

    assessor.resolved((success, name) => {
      hasSuccess = (success);
      foundResult = true;
      if (hasItem && hasSuccess) {
        for (let subscriberKey of this.subscribers.keys()) {
          this.subscribers.get(subscriberKey)(item, ...extraInfo);
        }
      }
    });

    return;
  }
}


export class Classifier {

  classifications: Classification[]

  nextClassifier: (item: any, ...extraInfo: any[]) => (inputHandler: { success: (...args: any[]) => void, error: (err?: any) => void }) => void

  constructor(classifications: Classification[],
    public walkerFactory: WalkerFactory,
    public walkerType: string) {

    this.classifications = classifications.map(classification => classification);
    this.nextClassifier = this.loadWalker();
  }

  loadWalker() {

    let walker = this.walkerFactory.create(this.walkerType);
    let resolvers = [];
    for (let classification of this.classifications) {
      classification.visitWith(walker, (onItemProvided) => {
        resolvers.push((item, ...extraInfo) => onItemProvided(item, ...extraInfo));
      });
    }

    return (item: any, ...extraInfo: any[]) => {
      let resultQueue = new Queue<any>();
      let handler;

      function dequeue() {
        while (resultQueue.length > 0 && handler !== undefined) {
          let result = resultQueue.shift();
          let outputArgs = result.length < 2 ? [] : result[1]
          handler[result[0]](...outputArgs)
        }
      }

      const setHandler = (inputHandler: { success: (...args: any[]) => void, error: (err?: any) => void }) => {
        handler = inputHandler;
        dequeue();
      }

      try {

        let resolved = Promise.all(resolvers.map(onItemProvided => onItemProvided(item, ...extraInfo)));

        walker.walk(item);

        resolved.then(() => {
          resultQueue.push(['success', [item, ...extraInfo]]);
          dequeue();
        });

      } catch (err) {
        console.error(err);
        resultQueue.push(['error', [err]])
        dequeue();
      }

      return setHandler;
    }
  }

  classify(item, ...extraInfo) {
    let itemID = `input:${new Date().getTime()}`
    let done = this.nextClassifier(item, itemID, ...extraInfo);
    this.nextClassifier = this.loadWalker();
    return done;
  }

  execute(item, ...extraInfo) {
    let itemID = `input:${new Date().getTime()}`
    let done = this.nextClassifier(item, itemID, ...extraInfo);
    this.nextClassifier = this.loadWalker();
    return {
      results: done,
      id: itemID,
      args: [item, ...extraInfo]
    }
  }
}

export type ClassifierSubscription = (unsubscribe: () => void) => ClassifierListener
export type ClassifierListener = (item: any, ...args: any[]) => void


export const SchemaClassification = (builder, name, schema) => {
  let requirements: Requireable = Schema(schema);
  let assessible = builder.toAssessable(requirements);
  assessible.alias = name;
  return new Classification(name, assessible);
}


// class IntervalClassifierBuilder extends ClassifierBuilder {
//   constructor(
//     public selectionIndexer = new IntervalSelectorSet(),
//     tbuilder = new TestBuilder([
//       StandardOperators.IS_TYPE(),
//       StandardOperators.IS(),
//       StandardOperators.EXISTS(),
//       StandardOperators.IS_IN(),
//       IntervalOperators.SELECTION(selectionIndexer)
//   ])) {
//     super(tbuilder)
//   }
// }

// export const makeIntervalClassifierBuilder = () => {
//   return new IntervalClassifierBuilder();
// }


export class ClassifierBuilder {

  classifications: Map<string | number, Classification>
  walkerFactory: WalkerFactory
  walkerType: string

  constructor(public builder: TestBuilder = new TestBuilder([
    StandardOperators.IS_TYPE(),
    StandardOperators.IS(),
    StandardOperators.EXISTS(),
    StandardOperators.IS_IN()
  ])) {
    this.walkerFactory = WalkerFactory;
    this.walkerType = 'json';
    this.classifications = new Map<string, Classification>();
  }

  addClassificationRequirement(
    name: string,
    requirements: any[],
    ...handlers: ClassifierSubscription[]
  ) {

    let assessable = this.builder.toAssessable({
      requirements: requirements,
      condition: 'AND'
    });

    assessable.alias = name;
    let classification = new Classification(name, assessable);
    for (let handler of handlers) classification.subscribe(handler);
    this.classifications.set(name, classification);

    return this;
  }

  addClassification<T>(name: string | number, json: any, ...handlers: ClassifierSubscription[]) {
    let classification = SchemaClassification(this.builder, name, json);
    for (let handler of handlers) classification.subscribe(handler);
    this.classifications.set(name, classification);
    return this;
  }

  on<T>(name: string,
    listener: (item: T, ...extraInfo: any[]) => void,
    unsubscribeConsumer?: (unsubscribe: () => void) => void) {

    this.classifications.get(name).subscribe((unsubscribe: () => void) => {
      if (unsubscribeConsumer !== undefined && unsubscribeConsumer !== null) {
        unsubscribeConsumer(unsubscribe);
      }
      return listener;
    });
    return this;
  }

  build() {
    let classifications = [];
    for (let key of this.classifications.keys()) {
      classifications.push(this.classifications.get(key));
    }
    return new Classifier(classifications, this.walkerFactory, this.walkerType);
  }

  static create() {
    return new ClassifierBuilder();
  }
}







