# @console-one/assessable

A small, composable assessment/validation framework. Two halves:

1. **Validation kernel** — schema-by-example, declarative `[path, op, value]` assessables, pluggable operators and reporters.
2. **Test runner** — directory-walking, default-export-per-file, descriptive summarizer with classification escalation. Lightweight and customizable; tests can live anywhere with a `test/` directory name. Predates vitest by design.

Originally extracted from `web-server/server/core/testing/`. Standalone — no dependency on the parent monorepo.

## Install

```bash
npm install
npm run build
```

## Quick start: validation

```ts
import { check, Schema } from '@console-one/assessable'

const validateUser = check(Schema({
  name: 'string',
  age: 'number',
}))

await validateUser({ name: 'Andrew', age: 41 })           // true
await validateUser({ name: 'Andrew', age: 'forty-one' })  // false
```

`Schema(obj)` walks the example object recursively. Strings matching the type set (`'string'`, `'number'`, `'boolean'`, `'object'`, `'array'`, `'function'`, `'error'`) become `IS_TYPE` predicates; everything else becomes a literal `IS` match. Nested objects descend; arrays index by position.

## Quick start: tests

Tests are default-exported async functions in `test/*.ts` files (or any directory named `test` or `tests`). Each receives a `test(name, body)` registrar. Each body receives a `validator` and uses `.expect(actual).toLookLike(schema)` for assertions.

```ts
// src/test/users.ts
export default async (test: any) => {
  await test('alice has the expected shape', async (validator: any) => {
    return validator.expect({ name: 'Alice', age: 41 }).toLookLike({
      name: 'string',
      age: 'number',
    })
  })

  await test('missing field is flagged', async (validator: any) => {
    return validator.expect(false).toLookLike(false)  // documents that ↓ returns false
    // (illustrative — see `check()` example for how to test invalid input)
  })
}
```

Run them:

```ts
// test-runner.ts at the package root
import { DescriptiveTestFileExecutor } from '@console-one/assessable'
await DescriptiveTestFileExecutor.run('./dist', '-filter', 'node_modules,\\.d\\.ts,\\.js\\.map')
```

```bash
node dist/test-runner.js
```

The runner walks `./dist` (or whichever path you pass), finds files inside any directory named `test/` or `tests/`, imports each as a module, calls its default export, and prints a per-category summary. Failed tests, errored tests, and pending tests are colored separately. Mock files (named `mock*`) and compiler artefacts (`*.d.ts`, `*.js.map`) are skipped automatically.

CLI shape (from `DescriptiveTestFileExecutor.run`):

```
DescriptiveTestFileExecutor.run('<dir>', '-filter', '<csv-of-substrings-to-skip>',
                                       '-select', '<csv-of-substrings-to-include>')
```

## Chained expectations and classifications

The validator's `.expect(...)` returns a thenable `ExpectChain` so multiple alternative assessables can be tried in sequence:

```ts
await validator
  .expect(actual)
  .toLookLike(primarySchema)
  .else(validator.expect(actual).toLookLike(fallbackSchema))
  .else(validator.expect(actual).toLookLike(legacyShape))
```

The chain evaluates lazily on `await`. Each alternative runs in order; the first to pass wins, the rest are skipped.

When **every** alternative fails, a classification can be applied to soften the report:

```ts
await validator
  .expect(actual)
  .toLookLike(primarySchema)
  .else(validator.expect(actual).toLookLike(fallbackSchema))
  .else('warn')
```

Classification tags:

| Tag | Behavior on total chain failure |
|---|---|
| `'fail'` *(default)* | Counts as a hard failure (red), shown in the original category. |
| `'warn'` | Routed to a `warn:` category bucket (yellow). Doesn't count toward hard failures. |
| `'info'` | Routed to a `info:` category bucket (cyan). |
| `'note'` | Routed to a `note:` category bucket (blue). |

In the summary line, classified outcomes are reported separately:

```
== Summary of 36 tests executed in 0.1 seconds ==
83.3% of tests (30/36) passed.
Classified outcomes: 3 warn, 1 info, 2 note.
100% of tests (36/36) completed.
```

You can also chain `.else(otherChain)` with `otherChain.else('warn')` — the inner chain's classification carries over **only if** the outer chain still has the default. An explicit outer `.else('note')` always wins.

`.lookslike(...)` is a lowercase alias for `.toLookLike(...)` if you prefer it.

## Surface

**Top-level exports** (`src/index.ts`):

### Validation kernel

- `check(requirement)` — curried validator: `check(r)(input) => Promise<boolean>`
- `Schema(obj)` — builds an `AssessableJSON` from a shorthand schema
- `TestBuilder`, `TestRunner`, `TestSet`, `Requirement` — lower-level construction
- `IsValidReporter`, `IsContinuousReporter`, `IsDescriptiveReporter`, `DescriptiveResult` — reporter shapes
- `StandardOperators`, `SyncOperators`, `CredentialOperators` — built-in operator sets (`IS`, `IS_TYPE`, `EXISTS`, `IS_IN`, `CONTAINS`, …)
- `Classifier`, `Classification`, `ClassifierBuilder`, `SchemaClassification` — tree-walking classification
- Type vocabulary: `Assessable`, `AssessableJSON`, `Assessor`, `Condition`, `Evaluation`, `EvaluationResult`, `EvaluationStatus`, `OperatorDefinitions`, `Reporter`, …

### Test runner

- `Validator` — the per-test handle (callable + `.expect(...)`)
- `ExpectChain` — thenable returned by `.expect(...)`; methods: `toLookLike`, `toPass`, `lookslike`, `else`
- `ExpectClassification` — `'fail' | 'warn' | 'info' | 'note'`
- `TestEnvironment`, `TestEnvironmentFactory`, `TestSetter`, `TestContext`
- `DescriptiveTestEnvironment`, `DescriptiveTestSummarizer`, `DescriptiveSummarizerFactory`
- `DescriptiveTestFileExecutor` — directory walker + per-file runner with `.run(<dir>, '-filter', …, '-select', …)` CLI

## What looksLike covers (and what it doesn't)

The schema-by-example treats:
- `'<typeName>'` strings → `IS_TYPE` predicates (`'number'`, `'string'`, `'boolean'`, `'object'`, `'array'`, `'function'`, `'error'`)
- Other literal values → `IS` (deep-equal) match
- Plain objects → recursed key-by-key, paths use dot notation (`@.user.name`)
- Arrays → recursed by index (`@.0`, `@.1`)
- `null` and `undefined` → matched literally; distinguished

`Schema(...)` is **open by default**: paths it doesn't name are unconstrained. This is useful for forward-compat checks where you only care about a subset of fields. Two operators close the gaps when you need exact-shape matching:

- `KEYS_ARE` — value at path must be a plain object whose key set matches exactly. Reports both extra and missing keys.
- `LENGTH_IS` — value at path (array or anything with `.length`) must match exactly.

You can use them directly in raw assessable JSON via `toPass(...)`, or call `Schema.closed(obj)` to get a recursive variant of `Schema(obj)` that adds `KEYS_ARE` at every object level and `LENGTH_IS` at every array level.

```ts
// Strict shape — extras / missing keys / wrong length all fail.
await validator.expect(actual).toPass(Schema.closed({
  name: 'string',
  age: 'number',
}))

// Spot-check just the key set:
await validator.expect(obj).toPass({
  condition: 'AND',
  requirements: [['@', 'KEYS_ARE', ['name', 'age']]],
})

// Spot-check just an array length:
await validator.expect(arr).toPass({
  condition: 'AND',
  requirements: [['@', 'LENGTH_IS', 3]],
})
```

What `Schema` and `Schema.closed` still **don't** cover out of the box:

- **Optional fields.** All named paths are required. Use `.else(...)` chaining to express "primary or fallback shape," or build a custom assessable with conditional branches.
- **Variable-length arrays of T.** `Schema.closed` pins the length; for "any number of items, each matching shape T", build a custom operator or use `CONTAINS` plus length bounds.

For everything else, mix `toPass(rawAssessable)` with `toLookLike(schema)` in the same chain to compose precisely what you need.

## Layout

```
src/
├── index.ts                       # public surface
├── types.ts                       # core type vocabulary
├── schema.ts                      # Schema() + SchemaBuilder
├── check.ts                       # check() convenience
├── builder.ts                     # TestBuilder
├── runner.ts                      # TestRunner
├── set.ts                         # TestSet
├── requirement.ts                 # Requirement tree node
├── generator.ts                   # RapidTestGenerator / SummarizedTestGenerator
├── summarizer.ts                  # TestSummarizer base
├── utils.ts
├── validation.ts                  # ValidatorFactory
├── classifier.ts                  # Classifier + ClassifierBuilder
├── classification/                # alt classification subsystem (paths, queries)
├── operators/                     # standard, sync, credentials, encodings
├── reporter/                      # isvalid, iscontinuous, isdescriptive
├── runner/                        # authorization runner
├── validator.ts                   # Validator + ExpectChain
├── environment.ts                 # TestEnvironment + Factory
├── environments/descriptive.ts    # DescriptiveTestEnvironment + DescriptiveTestSummarizer
├── file-executor/descriptive.ts   # DescriptiveTestFileExecutor (directory walker / runner)
├── test/                          # tests for assessable itself
├── test-runner.ts                 # CLI entry that runs the test/ files
├── smoke.ts                       # tiny standalone smoke
└── vendor/                        # self-contained cross-repo utilities
    ├── subscription.ts
    ├── queue.ts
    ├── queue-simple.ts
    ├── walker/
    ├── multimap/
    ├── functional/object.ts
    ├── equals.ts
    ├── color.ts
    ├── strings.ts
    ├── closure.ts
    ├── async.ts                   # toRemoteSignal
    └── files.ts                   # directory walker primitives
```

## Scripts

```bash
npm run build            # tsc -p tsconfig.build.json
npm run smoke            # node dist/smoke.js (one-shot validation example)
npm run test             # node dist/test-runner.js (walks dist/test/)
npm run clean            # rm -rf dist
```

## Tests included with this package

Inside `src/test/` you'll find six files exercising the framework against itself:

- `01-basic.ts` — primitive equality, type predicates, simple object schemas
- `02-arrays-and-nesting.ts` — nested objects, array shapes, documented limitations
- `03-failure-cases.ts` — `check()` on mismatching inputs, `null` vs `undefined`, boolean handling
- `04-expect-chain.ts` — chained `.else(...)` with at least one passing alternative
- `05-classification-demos.ts` — every alternative fails on purpose; demonstrates `'warn'` / `'info'` / `'note'` routing
- `06-closed-shapes.ts` — `KEYS_ARE` and `LENGTH_IS` operators, `Schema.closed(obj)` recursive variant

## Build status

`tsc` builds clean (0 errors). The six test files run end-to-end through the descriptive executor:

```
== Summary of 50 tests executed in 0.1 seconds ==
88% of tests (44/50) passed.
Classified outcomes: 3 warn, 1 info, 2 note.
100% of tests (50/50) completed.
```

The 6 non-passing entries are deliberate — they're the classification demos in `05-classification-demos.ts`, all of which route to their respective `warn:` / `info:` / `note:` buckets per design.
