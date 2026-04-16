


import { Subscription } from '@console-one/subscription'
import { Condition, Assessor, EvaluationResult, Evaluation, EvaluationResultArgs, EvaluationStatus } from './../types.js'



type ResultTypes = 'Error' | 'Failure' | 'Pass' | 'Pending'

class ReportTypes<K> {
  constructor(
    public onSuccess: [(input: EvaluationResult, parts: K[]) => K, ResultTypes], 
    public onFailure: [(input: EvaluationResult, parts: K[]) => K, ResultTypes],
    public onError: (input: EvaluationResult) => K
  ) {}
}

class Reporter<K> {

  constructor(
    public fromTest: (evaluation: Evaluation, ...alias: string[]) => K,
    public fromError: (err: Error, ...alias: string[]) => K, 
    public and: (...alias: string[]) => ((data: K[], sink: (fn: K) => void) => boolean),
    public or: (...alias: string[]) => ((data: K[], sink: (fn: K) => void) => boolean)
  ) {}
  
  evaluator(evaluation: Evaluation, ...alias: string[]) {
    try {
      this.fromTest(evaluation, ...alias)
    } catch (err) {
      return this.fromError(err, ...alias)
    }
  }
  aggregate(operators: Assessor<K>[], condition: Condition, ...alias: string[]) : (sink: Subscription<any>) => Subscription<K> {
    let eachTime = Subscription.combine(operators.map(operator => {
      try {
        let subscription = new Subscription();
        operator.resolved((report, alias) => subscription.resolve([report, alias]));
      } catch (err) {
        return err;
      }
    }));
    return Subscription.from((sink: Subscription<K, Error>, toCleanup: any) => {
      let grouper: any = condition === 'AND' ? this.and(...alias) : this.or(...alias); 
      try {
        eachTime.then((data, unsub) => {
          if (grouper(data, sink.resolve)) {
            unsub();
            grouper = undefined;
            toCleanup(); 
          }
        }).catch((err, unsub) => {
          if (grouper(this.fromError(err), sink.resolve)) {
            unsub();
            grouper = undefined;
            toCleanup(); 
          }
        });
      } catch (err) {
        toCleanup(err);
      }
      return sink as any;
    }) as any;
  }
}


// will only work when subscription
// combine is fixed 
// new Reporter(
//   (evaluation, alias) => evaluation[0] === EvaluationStatus.Pass,
//   (err, alias) => false,
//   (alias) => {
//     let last: boolean[] = [];
//     let areTrue: number = 0;
//     let areFalse: number = 0;
//     let all = false;
//     (val: [next: boolean, index: number], sink) => {
//       if (val === undefined) { all = true; sink(areFalse === 0); return ; }
//       for (let i = val.length; i <= val[1]; i++) { last.push(null); }
//       if (last[val[1]] !== val[0]) {
//         if (!val[0]) { 
//           areFalse--; 
//           if (areFalse === 0 && all) sink(true);
//           return;
//         } else {
//           areFalse ++; 
//           if (all && areFalse === 1) sink(false); 
//           return;
//         }
//       }
//     }
//   },     

//   (alias) => {
//     let last: (boolean | null)[] = [];
//     let areTrue: number = 0;
//     let areFalse: number = 0;
//     let all = false;
//     (val: [next: boolean, index: number], sink) => {
//       if (val === undefined) { all = true; sink(areTrue !== 0); return ; }
//       for (let i = val.length; i <= val[1]; i++) { last.push(null); }
//       if (last[val[1]] !== val[0]) {
//         if (val[0]) {
//           areTrue++;
//           if (all && areTrue === 1) sink(true);
//           return;
//         } else if (last[val[1]] !== null) { 
//           areTrue--;
//           if (all && areTrue === 0) sink(false); 
//           return;
//         }
//       }
//     }
//   })