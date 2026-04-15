import { Subscription } from '../vendor/subscription';
import { EvaluationResult } from '../types';
import { Classification } from './classification';

const delim = `|||||`

export class QueryCollector {

  pathHandlers: Map<string, Subscription<any>>
  done: (() => void) []

  constructor(
    public classification: Classification, 
    public item: string,
    public emittor: Subscription<any>
  ) {
    this.done = [];
    this.pathHandlers = new Map<string, Subscription<any>>();
  }

  toToken(lang, queryPath) {
    return `${lang}${delim}${queryPath}`; 
  }

  where(lang: string, queryPath) {
    this.pathHandlers.set(this.toToken(lang, queryPath), new Subscription<any>(this.toToken(lang, queryPath)));
    let result = this.pathHandlers.get(this.toToken(lang, queryPath))
    if (result === undefined) throw new Error(``); 
    return (result as Subscription<any>);
  }

  onComplete(runMe: () => void) {
    this.done.push(runMe);
  }

  submit(result: EvaluationResult) {
    this.emittor.resolve({ result: result, classification: this.classification, id: this.item });
  }
}
