// ─────────────────────────────────────────────────────────────────────────
// 05-classification-demos: documentation-as-execution for the chain's
// classification escalation. Every test in this file deliberately has
// every alternative fail, so the .else(<tag>) routing kicks in. Each
// test lands in a "<tag>: …" category in the summary instead of the
// hard-failure column.
//
// You'll see these in the run output as Warning / Info / Note rows
// rendered in their respective colors, and counted under
// "Classified outcomes" in the totals — distinct from hard failures.
// ─────────────────────────────────────────────────────────────────────────

export default async (test: (name: string, body: (validator: any) => any) => any) => {
  await test('warn classification: missing optional field', async (validator: any) => {
    return validator
      .expect({ name: 'Alice' })
      .toLookLike({ name: 'string', email: 'string' })
      .else('warn');
  });

  await test('warn classification: type drift on a non-critical field', async (validator: any) => {
    return validator
      .expect({ id: 1, label: 12345 })
      .toLookLike({ id: 'number', label: 'string' })
      .else('warn');
  });

  await test('info classification: deprecated shape still loadable', async (validator: any) => {
    return validator
      .expect({ value: 42, version: 1 })
      .toLookLike({ value: 'number', version: 2 })
      .else('info');
  });

  await test('note classification: chained fallbacks then note', async (validator: any) => {
    return validator
      .expect({ status: 'unknown' })
      .toLookLike({ status: 'active' })
      .else(validator.expect({ status: 'unknown' }).toLookLike({ status: 'pending' }))
      .else(validator.expect({ status: 'unknown' }).toLookLike({ status: 'inactive' }))
      .else('note');
  });

  await test('inheritance: inner chain "warn" inherited when outer is default', async (validator: any) => {
    const inner = validator
      .expect({ x: 1 })
      .toLookLike({ x: 'string' })
      .else('warn');
    return validator
      .expect({ x: 1 })
      .toLookLike({ x: 'string' })
      .else(inner);
  });

  await test('override: outer .else("note") wins over inherited "warn"', async (validator: any) => {
    const inner = validator
      .expect({ x: 1 })
      .toLookLike({ x: 'string' })
      .else('warn');
    return validator
      .expect({ x: 1 })
      .toLookLike({ x: 'string' })
      .else(inner)
      .else('note');
  });
};
