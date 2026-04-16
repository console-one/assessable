import { check, Schema } from './index.js'

async function main() {
  const validateUser = check(Schema({
    name: 'string',
    age: 'number',
  }) as any)

  const ok = await validateUser({ name: 'Andrew', age: 41 })
  const bad = await validateUser({ name: 'Andrew', age: 'not-a-number' })

  console.log('[smoke] valid input ->', ok)
  console.log('[smoke] invalid input ->', bad)

  if (ok !== true) throw new Error('expected valid input to pass, got ' + ok)
  if (bad !== false) throw new Error('expected invalid input to fail, got ' + bad)

  console.log('[smoke] OK')
}

main().catch(e => {
  console.error('[smoke] FAIL', e)
  process.exit(1)
})
