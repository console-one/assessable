// ─────────────────────────────────────────────────────────────────────────
// 04-expect-chain: the .else() chain — alternative expectations.
//
// Each test here uses chains where SOME alternative passes, so the
// chain reports a pass overall. Classification escalation (warn/info/
// note tags applied when ALL alternatives fail) is demonstrated in
// 05-classification-demos.ts as documentation-by-execution.
// ─────────────────────────────────────────────────────────────────────────

export default async (test: (name: string, body: (validator: any) => any) => any) => {
  await test('chain: first lookslike passes — second is not run', async (validator: any) => {
    return validator
      .expect(42)
      .toLookLike('number')
      .else(validator.expect(42).toLookLike('string'));
  });

  await test('chain: first fails, second passes — overall pass', async (validator: any) => {
    return validator
      .expect(42)
      .toLookLike('string')
      .else(validator.expect(42).toLookLike('number'));
  });

  await test('chain: three alternatives, last passes', async (validator: any) => {
    return validator
      .expect({ env: 'staging' })
      .toLookLike({ env: 'production' })
      .else(validator.expect({ env: 'staging' }).toLookLike({ env: 'development' }))
      .else(validator.expect({ env: 'staging' }).toLookLike({ env: 'staging' }));
  });

  await test('chain: lookslike() (lowercase alias) equivalent to toLookLike', async (validator: any) => {
    return validator.expect({ a: 1 }).lookslike({ a: 'number' });
  });

  await test('chain: combined toPass + lookslike alternatives', async (validator: any) => {
    return validator
      .expect(99)
      .toPass({
        condition: 'AND' as any,
        requirements: [['@', 'IS', 42]],
      })
      .else(validator.expect(99).toLookLike('number'));
  });

  await test('chain: classification tag set but never reached because alt passes', async (validator: any) => {
    // .else('warn') has no effect here because the second alternative
    // passes — the classification only applies when ALL alternatives fail.
    return validator
      .expect({ user: 'alice', role: 'admin' })
      .toLookLike({ user: 'string', role: 'guest' })
      .else(validator.expect({ user: 'alice', role: 'admin' }).toLookLike({ user: 'string', role: 'admin' }))
      .else('warn');
  });
};
