// ─────────────────────────────────────────────────────────────────────────
// 01-basic: the simplest validator usage. Each test body receives a
// `validator` (the per-test handle) and uses `.expect(actual)` to begin
// an assertion.
//
// Two equivalent shapes:
//   validator.expect(actual).toLookLike(schema)   - schema by example
//   validator.expect(actual).toPass(assessable)   - raw assessable JSON
// ─────────────────────────────────────────────────────────────────────────

export default async (test: (name: string, body: (validator: any) => any) => any) => {
  await test('primitive equality: number', async (validator: any) => {
    return validator.expect(42).toLookLike(42);
  });

  await test('primitive equality: string', async (validator: any) => {
    return validator.expect('hello').toLookLike('hello');
  });

  await test('primitive equality: boolean', async (validator: any) => {
    return validator.expect(true).toLookLike(true);
  });

  await test('type predicate: number', async (validator: any) => {
    return validator.expect(42).toLookLike('number');
  });

  await test('type predicate: string', async (validator: any) => {
    return validator.expect('hi').toLookLike('string');
  });

  await test('type predicate: object', async (validator: any) => {
    return validator.expect({ a: 1 }).toLookLike('object');
  });

  await test('shallow object schema: literal values', async (validator: any) => {
    return validator.expect({ name: 'Andrew', age: 41 }).toLookLike({
      name: 'Andrew',
      age: 41,
    });
  });

  await test('shallow object schema: type predicates', async (validator: any) => {
    return validator.expect({ name: 'Andrew', age: 41 }).toLookLike({
      name: 'string',
      age: 'number',
    });
  });

  await test('mixed literal + type schema', async (validator: any) => {
    return validator.expect({ name: 'Andrew', age: 41 }).toLookLike({
      name: 'Andrew',
      age: 'number',
    });
  });
};
