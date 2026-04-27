// ─────────────────────────────────────────────────────────────────────────
// 06-closed-shapes: KEYS_ARE / LENGTH_IS operators and Schema.closed.
//
// These exercise the strict-shape escape hatches:
//   - KEYS_ARE  — object's key set must match exactly (no extras / no missing)
//   - LENGTH_IS — array (or anything with .length) must match exactly
//   - Schema.closed(obj) — recursive variant of Schema(obj) that adds
//                          KEYS_ARE at every object level and LENGTH_IS
//                          at every array level
// ─────────────────────────────────────────────────────────────────────────

import { check, Schema } from '../index.js';

export default async (test: (name: string, body: (validator: any) => any) => any) => {
  // ─── KEYS_ARE direct ────────────────────────────────────────────────
  await test('KEYS_ARE: exact key set passes', async (validator: any) => {
    return validator.expect({ a: 1, b: 2 }).toPass({
      condition: 'AND' as any,
      requirements: [['@', 'KEYS_ARE', ['a', 'b']]],
    });
  });

  await test('KEYS_ARE: extra key fails (via check)', async (validator: any) => {
    const fn = check({
      condition: 'AND' as any,
      requirements: [['@', 'KEYS_ARE', ['a', 'b']]],
    });
    const passing = await fn({ a: 1, b: 2 });
    const failing = await fn({ a: 1, b: 2, c: 3 });
    return validator.expect({ passing, failing }).toLookLike({
      passing: true,
      failing: false,
    });
  });

  await test('KEYS_ARE: missing key fails (via check)', async (validator: any) => {
    const fn = check({
      condition: 'AND' as any,
      requirements: [['@', 'KEYS_ARE', ['a', 'b']]],
    });
    const result = await fn({ a: 1 });
    return validator.expect(result).toLookLike(false);
  });

  // ─── LENGTH_IS direct ────────────────────────────────────────────────
  await test('LENGTH_IS: exact array length passes', async (validator: any) => {
    return validator.expect([1, 2, 3]).toPass({
      condition: 'AND' as any,
      requirements: [['@', 'LENGTH_IS', 3]],
    });
  });

  await test('LENGTH_IS: extra element fails (via check)', async (validator: any) => {
    const fn = check({
      condition: 'AND' as any,
      requirements: [['@', 'LENGTH_IS', 2]],
    });
    const result = await fn([1, 2, 3]);
    return validator.expect(result).toLookLike(false);
  });

  await test('LENGTH_IS: missing element fails (via check)', async (validator: any) => {
    const fn = check({
      condition: 'AND' as any,
      requirements: [['@', 'LENGTH_IS', 3]],
    });
    const result = await fn([1, 2]);
    return validator.expect(result).toLookLike(false);
  });

  await test('LENGTH_IS: works on strings too', async (validator: any) => {
    return validator.expect('hello').toPass({
      condition: 'AND' as any,
      requirements: [['@', 'LENGTH_IS', 5]],
    });
  });

  // ─── Schema.closed: full recursive strict matching ──────────────────
  await test('Schema.closed: exact-shape passes', async (validator: any) => {
    return validator.expect({ name: 'Alice', age: 41 }).toPass(
      Schema.closed({ name: 'string', age: 'number' }) as any,
    );
  });

  await test('Schema.closed: extra key now fails (was open before)', async (validator: any) => {
    const fn = check(Schema.closed({ name: 'string', age: 'number' }) as any);
    const passing = await fn({ name: 'Alice', age: 41 });
    const failing = await fn({ name: 'Alice', age: 41, extra: 'rejected' });
    return validator.expect({ passing, failing }).toLookLike({
      passing: true,
      failing: false,
    });
  });

  await test('Schema.closed: longer array now fails (was open before)', async (validator: any) => {
    const fn = check(Schema.closed([1, 2, 3]) as any);
    const passing = await fn([1, 2, 3]);
    const failing = await fn([1, 2, 3, 4]);
    return validator.expect({ passing, failing }).toLookLike({
      passing: true,
      failing: false,
    });
  });

  await test('Schema.closed: nested objects close at every level', async (validator: any) => {
    const fn = check(Schema.closed({
      user: { name: 'string', email: 'string' },
      meta: { active: 'boolean' },
    }) as any);
    const passing = await fn({
      user: { name: 'Alice', email: 'a@x.com' },
      meta: { active: true },
    });
    const failingExtraInner = await fn({
      user: { name: 'Alice', email: 'a@x.com', age: 41 }, // extra inner key
      meta: { active: true },
    });
    const failingExtraOuter = await fn({
      user: { name: 'Alice', email: 'a@x.com' },
      meta: { active: true },
      stray: 'not-allowed', // extra outer key
    });
    return validator.expect({ passing, failingExtraInner, failingExtraOuter }).toLookLike({
      passing: true,
      failingExtraInner: false,
      failingExtraOuter: false,
    });
  });

  await test('Schema.closed: arrays of objects also close', async (validator: any) => {
    const fn = check(Schema.closed([
      { id: 'number', name: 'string' },
      { id: 'number', name: 'string' },
    ]) as any);
    const passing = await fn([
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ]);
    const wrongLength = await fn([
      { id: 1, name: 'a' },
    ]);
    const extraKey = await fn([
      { id: 1, name: 'a', extra: 'x' },
      { id: 2, name: 'b' },
    ]);
    return validator.expect({ passing, wrongLength, extraKey }).toLookLike({
      passing: true,
      wrongLength: false,
      extraKey: false,
    });
  });

  // ─── Schema vs Schema.closed parity ──────────────────────────────────
  await test('open Schema still permits extras (unchanged)', async (validator: any) => {
    const fn = check(Schema({ name: 'string' }) as any);
    const result = await fn({ name: 'A', extra: 'allowed' });
    return validator.expect(result).toLookLike(true);
  });

  await test('open Schema still permits longer arrays (unchanged)', async (validator: any) => {
    const fn = check(Schema([1, 2]) as any);
    const result = await fn([1, 2, 3]);
    return validator.expect(result).toLookLike(true);
  });
};
