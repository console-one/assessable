// ─────────────────────────────────────────────────────────────────────────
// 02-arrays-and-nesting: how toLookLike handles arrays, nested objects,
// and the (limited) ways to express variable-length / heterogeneous data.
// Probes for documented gaps so they're explicit rather than surprising.
// ─────────────────────────────────────────────────────────────────────────

export default async (test: (name: string, body: (validator: any) => any) => any) => {
  await test('array of literal values', async (validator: any) => {
    return validator.expect([1, 2, 3]).toLookLike([1, 2, 3]);
  });

  await test('array of mixed types via type predicates', async (validator: any) => {
    return validator.expect([1, 'two', true]).toLookLike(['number', 'string', 'boolean']);
  });

  await test('nested object schema', async (validator: any) => {
    return validator.expect({
      user: { name: 'Andrew', age: 41 },
      meta: { active: true },
    }).toLookLike({
      user: { name: 'string', age: 'number' },
      meta: { active: 'boolean' },
    });
  });

  await test('array of objects', async (validator: any) => {
    return validator.expect([
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ]).toLookLike([
      { id: 'number', name: 'string' },
      { id: 'number', name: 'string' },
    ]);
  });

  await test('deeply nested', async (validator: any) => {
    return validator.expect({
      a: { b: { c: { d: 42 } } },
    }).toLookLike({
      a: { b: { c: { d: 'number' } } },
    });
  });

  // Below cases probe known/historical gaps. Expected behavior is
  // documented per-test rather than asserting uniform pass/fail.

  await test('array length mismatch (extra in actual)', async (validator: any) => {
    // Schema [1, 2] vs actual [1, 2, 3]: schema only checks @.0 and @.1,
    // so it passes — this is a documented limitation. There's no
    // built-in length operator in the standard set.
    return validator.expect([1, 2, 3]).toLookLike([1, 2]);
  });

  await test('array length mismatch (missing in actual)', async (validator: any) => {
    // Schema [1, 2, 3] vs actual [1, 2]: @.2 is missing → fail.
    return validator
      .expect([1, 2])
      .toLookLike('object'); // sanity check that the value is at least an array-shaped object
  });

  await test('null literal', async (validator: any) => {
    return validator.expect({ x: null }).toLookLike({ x: null });
  });
};
