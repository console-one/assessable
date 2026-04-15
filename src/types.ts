
export enum EvaluationStatus {
  Pass,
  Fail
}

export type EvaluationResultArgs = [
  EvaluationStatus,
  string?
]

export class EvaluationContainer {
  0: EvaluationStatus
  1?: string
  constructor(status: EvaluationStatus, value?: string) {
    if ((value !== undefined) && (value !== null)) {
      this[1] = value;
    }
  }
  then(fnc) {
    return Promise.resolve(this).then(fnc);
  }
  catch(err) {
    return this.then(() => this).catch(err);
  }
}

export type EvaluationResult = Promise<EvaluationResultArgs> | EvaluationResultArgs

export type Evaluation = {
  name: string
  evaluate: (item: any, path?: string) => EvaluationResult
}

export type SyncEvaluation = {
  name: string
  evaluate: (item: any, path?: string) => EvaluationResultArgs
}

export type AsyncEvaluation = {
  name: string
  evaluate: (item: any, path?: string) => Promise<EvaluationResultArgs>
}


export type OperatorDefinitions = {
  name: string
  names: string[]
  create: (rhs: any) => Evaluation; 
}

export type LoadableOperatorDefinitions = {
  name: string
  names: string[]
  create: (rhs: any) => Evaluation; 
}

export type SyncOperatorDefinitions = {
  name: string
  names: string[]
  create: (rhs: any) => SyncEvaluation;
}


export type OperatorFactory = (...any: any[]) => OperatorDefinitions
export type OperatorSet = Record<any, OperatorFactory>

export type SyncOperatorFactory = (...any: any[]) => SyncOperatorDefinitions

export type SyncOperatorSet = Record<any, SyncOperatorFactory>


export type Consumer = (item: any) => void;

export type Reporter<OutputReport> = {
  aggregate: (operators: Assessor<OutputReport>[], condition: Condition, alias?: string) => Assessor<OutputReport>;
  createReport: (evaluator: Evaluation, paths: Set<string>, alias?: string) => Assessor<OutputReport>;
}

export type SyncReporter<OutputReport> = {
  aggregate: (operators: Assessor<OutputReport>[], condition: Condition, alias?: string) => Assessor<OutputReport>;
  createReport: (evaluator: SyncEvaluation, paths: Set<string>, alias?: string) => Assessor<OutputReport>;
}

export interface Evaluatable {
  assessor<K>(evaluation: Evaluation) : Assessable
}


export interface SyncEvaluatable {
  assessor<K>(evaluation: SyncEvaluation): Assessable
}


export type Validation = [any, any, any, any?]

export enum Condition {
  AND = "AND",
  OR = "OR"
}

export type Requireable = AssessableJSON | Validation

export const isRequirement = (obj) => {
  return typeof obj === 'object' && 
    !Array.isArray(obj) && 
    obj.hasOwnProperty('requirements') && 
    obj.hasOwnProperty('conditition')
}
/**
 * A JSON object used to determine the users capability to perform some action within a workflow
 */
export type AssessableJSON = {
  alias?: string
  requirements: Requireable[],
  condition: Condition | keyof typeof Condition
} 

/**
 * Contains the requirements and conditions of hierarchical nested test JSON.
 * It pairs this information with a test reporter, responsible for packaging
 * requirement validation output in a use-case suitable comminication format.
 */ 
export type Assessable = {
  alias: string
  paths: Set<string>
  assessor<OutputReport>(reporter: Reporter<OutputReport> | SyncReporter<OutputReport>): Assessor<OutputReport>
}

/**
 * Contains all instantiated components to execute user defined test criteria.
 * 
 * Contains all paths which required to be searched within some input object in order
 * to fulfill it's input requirements - a seperate the 'walker' module component fetches 
 * and returns document content at these nested paths, and passes the resulting data back 
 * to the assessable. 
 * 
 * The assessable accepts the data from the walker and maps it to the input of one to many 
 * test predicates which may require it. Since these predicates may exist at different levels 
 * within a hierarchical JSON, the assessor is also responsible for managing the predicate to 
 * input-path mapping.
 */
export type Assessor<OutputReport> = {
  alias: string,
  paths: Set<string>
  evaluate: (item: any, path: string) => void
  error: (err: Error, path: string) => void
  resolved: (callback: (report: OutputReport, alias: string) => void) => void
  clear?: () => void
}

/**
 * Contains all instantiated components to execute user defined test criteria.
 * 
 * Contains all paths which required to be searched within some input object in order
 * to fulfill it's input requirements - a seperate the 'walker' module component fetches 
 * and returns document content at these nested paths, and passes the resulting data back 
 * to the assessable. 
 * 
 * The assessable accepts the data from the walker and maps it to the input of one to many 
 * test predicates which may require it. Since these predicates may exist at different levels 
 * within a hierarchical JSON, the assessor is also responsible for managing the predicate to 
 * input-path mapping.
 */
export type SingleTest<OutputReport> = (item: any) => Promise<OutputReport>

export type TestSet<K> = {
  addTest(name: string, promise: Promise<K>) : TestSet<K>
  allFinished() : Promise<Map<string, K>> 
}

export type Test<K> = (item: any) => TestSet<K>

