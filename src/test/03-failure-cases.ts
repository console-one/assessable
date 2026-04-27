// ─────────────────────────────────────────────────────────────────────────
// 03-failure-cases: deliberately-failing assertions. These exercises
// confirm that toLookLike reports failures properly when expectations
// are not met. Each case uses validator.forceResolve(true) to mark the
// test as "expected behavior verified" so the framework still passes
// at the suite level.
// ─────────────────────────────────────────────────────────────────────────

import { check, Schema } from '../index.js';

export default async (test: (name: string, body: (validator: any) => any) => any) => {
  await test('check() returns false for type mismatch', async (validator: any) => {
    const fn = check(Schema({ name: 'string', age: 'number' }) as any);
    const result = await fn({ name: 'A', age: 'forty-one' });
    return validator.expect(result).toLookLike(false);
  });

  await test('check() returns true for matching schema', async (validator: any) => {
    const fn = check(Schema({ name: 'string', age: 'number' }) as any);
    const result = await fn({ name: 'A', age: 41 });
    return validator.expect(result).toLookLike(true);
  });

  await test('check() literal-value mismatch', async (validator: any) => {
    const fn = check(Schema({ env: 'production' }) as any);
    const result = await fn({ env: 'staging' });
    return validator.expect(result).toLookLike(false);
  });

  await test('extra keys in actual: schema does not enforce closure', async (validator: any) => {
    // Schema-by-example only constrains paths it names. Extra keys in
    // actual silently pass — useful for forward-compatible checks but
    // surprising if you assume tight matching.
    const fn = check(Schema({ name: 'string' }) as any);
    const result = await fn({ name: 'A', extra: 'allowed' });
    return validator.expect(result).toLookLike(true);
  });

  await test('missing key in actual: fails', async (validator: any) => {
    const fn = check(Schema({ name: 'string', age: 'number' }) as any);
    const result = await fn({ name: 'A' });
    return validator.expect(result).toLookLike(false);
  });

  await test('null vs undefined: distinguished', async (validator: any) => {
    const fnNull = check(Schema({ x: null }) as any);
    const onUndef = await fnNull({ x: undefined });
    const onNull = await fnNull({ x: null });
    return validator.expect({ onUndef, onNull }).toLookLike({
      onUndef: false,
      onNull: true,
    });
  });

  await test('boolean false is not skipped', async (validator: any) => {
    const fn = check(Schema({ flag: false }) as any);
    const okResult = await fn({ flag: false });
    const koResult = await fn({ flag: true });
    return validator.expect({ okResult, koResult }).toLookLike({
      okResult: true,
      koResult: false,
    });
  });
};
