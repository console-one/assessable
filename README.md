# assessable

Composable, schema-driven assessment/validation framework with pluggable operators, reporters, and classifiers.

Extracted from `web-server/server/core/testing/`. Standalone — no dependency on the parent monorepo.

## Install

```bash
npm install
npm run build
```

## Quick start

```ts
import { check, Schema } from 'assessable'

const validateUser = check(Schema({
  name: 'string',
  age: 'number',
}))

await validateUser({ name: 'Andrew', age: 41 })           // true
await validateUser({ name: 'Andrew', age: 'forty-one' })  // false
```

Run the built-in smoke test:

```bash
npm run build
node dist/smoke.js
```

## Surface

**Top-level exports** (`src/index.ts`):

- `check(requirement)` — curried validator; `check(r)(input) => Promise<boolean>`
- `Schema(obj)` — builds an `AssessableJSON` from a shorthand schema
- `TestBuilder`, `TestRunner`, `TestSet`, `Requirement` — lower-level construction
- `IsValidReporter`, `IsContinuousReporter`, `IsDescriptiveReporter` — result shapes
- `StandardOperators`, `SyncOperators`, `CredentialOperators` — built-in operator sets
- `Classifier`, `Classification`, `ClassifierBuilder`, `SchemaClassification` — tree-walking classification
- Types: `Assessable`, `AssessableJSON`, `Assessor`, `Condition`, `Evaluation`, `EvaluationResult`, `EvaluationStatus`, `OperatorDefinitions`, `Reporter`, etc.

## Layout

```
src/
├── index.ts               # public surface
├── types.ts               # core type vocabulary
├── schema.ts              # Schema() + SchemaBuilder
├── check.ts               # check() convenience
├── builder.ts             # TestBuilder
├── runner.ts              # TestRunner
├── set.ts                 # TestSet
├── requirement.ts         # Requirement tree node
├── generator.ts           # RapidTestGenerator / SummarizedTestGenerator
├── summarizer.ts          # TestSummarizer
├── utils.ts
├── validation.ts          # ValidatorFactory
├── classifier.ts          # Classifier + ClassifierBuilder
├── classification/        # alt classification subsystem (paths, queries)
├── operators/             # standard, sync, credentials, encodings
├── reporter/              # isvalid, iscontinuous, isdescriptive, reporter, results
├── runner/                # authorization runner
└── vendor/                # self-contained copies of cross-repo utilities
    ├── subscription.ts    # Subscription (from src/core/generics)
    ├── queue.ts           # Queue used by Subscription
    ├── queue-simple.ts    # Queue used by reporters (separate implementation)
    ├── walker/            # JSONPathWalker + WalkerFactory
    ├── multimap/          # ListMultimap, SetMultimap
    ├── functional/object.ts  # clone, pick, toSet, mergeMaps, underride
    ├── equals.ts          # deepEqual
    ├── color.ts           # Colors (used by descriptive reporter)
    ├── strings.ts         # truncate
    └── closure.ts         # Closure base class
```

## Known type warnings

`tsc` builds clean (0 errors). There are ~40 no-implicit-any-style warnings (unused parameters, implicit `any` in callback signatures). Enable `strict: true` in `tsconfig.json` if you want to flush them out.

One type inconsistency worth flagging: `reporter/isvalid.ts`'s `createReport(...).evaluate` declares `path: string` (required) while the `Reporter<K>` interface in `types.ts` declares `path?: string` (optional). `as any` is used at the `TestRunner` construction site to work around it.
