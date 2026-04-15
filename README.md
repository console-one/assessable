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

## What was intentionally dropped during extraction

The following were in `core/testing/` but left out of the standalone package because they carried heavy coupling to the parent monorepo. They can be added back as optional subpath exports later.

- **`operators/interval.ts`** — Uses `Interval` / `Range` from `src/core/parser/`, which pulls in `@dipscope/type-manager`, `ts-mixer`, `linked-list-typescript`, the serialization layer, and metadata. Re-adding this requires either vendoring all of that or replacing the parser with a lighter interval implementation.
- **`environment.ts` + `validator.ts`** — File-executor integration with `utils/async.toRemoteSignal` and Closure. Relevant to the `file-executor/` code path only.
- **`file-executor/descriptive.ts`** — Node-only file loader. Uses `fs` / `path` / `glob` via the utils layer.
- **`environments/descriptive.ts`** — TestEnvironment implementation used by the file executor.
- **`inspect.ts`** — Dev-time inspection utility, depends on the dropped `environments/descriptive.ts`.
- **`runner/*` — only `authorization.ts` was kept**; others were outside scope.
- **`tests/**` and `operators/tests/**`** — Server-side integration tests pulling in Redis, the `namespace`/authorizer module, and `PartitionMap`. Not unit tests of the framework itself.
- **`classification/tests/`** — Same rationale.
- **`Resources.Registry.Builder` glue from `index.ts`** — The original `__fastTestRunner` / `__standardTestBuilder` / `__descriptiveTestRunner` factories were wired into the parent project's DI registry. Stripped from the standalone surface; add back as an optional `assessable/registry` subpath if needed.
- **`decode` import from `src/core/syntaxes`** in `operators/encodings.ts` — the only usage was commented out; import removed.

## Known type warnings

`tsc` builds clean (0 errors). There are ~40 noimplicitany-style warnings carried over from the original source (unused parameters, implicit `any` in callback signatures). They're preserved as-is so the interfaces stay identical to the parent repo. Enable `strict: true` in `tsconfig.json` if you want to flush them out.

One type inconsistency worth flagging: in `reporter/isvalid.ts`, the `createReport(...).evaluate` signature declares `path: string` (required), but the `Reporter<K>` interface in `types.ts` declares `path?: string` (optional). This mismatch exists in the source; `as any` is used at the `TestRunner` construction site to work around it. Fix it in `types.ts` or `isvalid.ts` if you want strict conformance — but changing `types.ts` is an interface change, so left alone during extraction.

## Origin

Extracted on 2026-04-14 from `console-one-workspace/web-server/server/core/testing/` at branch `flounder`. Source files were copied, not symlinked, and all cross-boundary imports were rewritten to point at `vendor/`. The parent repo was not modified.
