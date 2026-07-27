import assert from 'node:assert/strict'
import { test } from 'node:test'

import * as prettier from 'prettier'

import config from './index.json' with { type: 'json' }

test('exports a plain options object', () => {
  assert.equal(typeof config, 'object')
  assert.ok(config !== null && !Array.isArray(config))
  assert.ok(Object.keys(config).length > 0)
})

// Prettier silently ignores unknown keys, so a typo in index.json would ship
// unnoticed and quietly stop being applied. Resolving the config through
// Prettier's own validator catches that here instead.
test('every option is one Prettier actually supports', async () => {
  const supported = new Set(
    (await prettier.getSupportInfo()).options.flatMap((o) => [o.name, ...(o.alias ?? [])]),
  )
  const unknown = Object.keys(config).filter((k) => !supported.has(k))
  assert.deepEqual(unknown, [], `unknown Prettier options: ${unknown.join(', ')}`)
})

test('formats code according to the shared options', async () => {
  const out = await prettier.format('const x = {a:1};\n', { ...config, parser: 'babel' })
  // singleQuote + semi:false are the two most load-bearing options here.
  assert.equal(out.trim(), 'const x = { a: 1 }')
})

test('applies jsxSingleQuote', async () => {
  const out = await prettier.format('const A = () => <div className="x" />\n', {
    ...config,
    parser: 'babel',
  })
  assert.match(out, /className='x'/)
})
