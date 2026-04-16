
import { Closure } from './vendor/closure.js';
import { ListMultimap } from '@console-one/multimap';

export type SummarizerSink = <K>(name: string, result: Promise<K>, startTime: number, category?: string) => void

export abstract class TestSummarizer<K> extends Closure {

  protected pending: Set<string>;
  protected error: Map<string, any>;
  protected completed: Map<string, K>;
  protected canPrint: boolean;
  protected sink: (...data: any[]) => void;
  protected order: string[]
  protected dedupedToUserInputNames: Map<string, string>;
  protected categories: ListMultimap<string, string>;
  protected executionTimes: Map<string, number>;
  protected categoryOrder: string[]

  constructor(sink: (...data: any[]) => void) {

    super(async (name: string, result: Promise<K>, startTime: number, category?: string) => {
      if ((category === null) || (category === undefined)) {
        category = 'ALL'
      }
      let dedupedName: string = `${name}-${this.order.length}`;
      this.dedupedToUserInputNames.set(dedupedName, name);

      let testPerformance = ((new Date()).getTime()) - startTime;
      this.executionTimes.set(dedupedName, testPerformance); 

      this.order.push(dedupedName);
      this.pending.add(dedupedName);
      if (!this.categories.has(category)) {
        this.categoryOrder.push(category);
      }
      this.categories.set(category, dedupedName);

      try {

        let data = await result;
        this.completed.set(dedupedName, data);
        this.pending.delete(dedupedName);
        return this.toBoolean(data);

      } catch (err) {
        this.error.set(dedupedName, err);
        this.pending.delete(dedupedName);
        return false;
      }
    });

    this.pending = new Set<string>();
    this.error = new Map<string, any>();
    this.completed = new Map<string, K>();
    this.sink = sink;
    this.canPrint = false;
    this.order = [];
    this.dedupedToUserInputNames = new Map<string, string>();
    this.categories = new ListMultimap<string, string>();
    this.executionTimes = new Map<string, number>();
    this.categoryOrder = [];
  }

  public complete() {
    this.canPrint = true;
    this.tryPrint();
  }

  public tryPrint() {
    if (this.canPrint === true && this.pending.size === 0 && this.order.length > 0) {
      this.print();
    }
  }

  abstract print() : void

  abstract toBoolean(result: K) : boolean
}


export interface SummarizerFactory<K> {
  create(sink: ((...data: any[]) => void)) : TestSummarizer<K>
}
