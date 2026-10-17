import assert from 'node:assert/strict'
import { test } from 'node:test'

import * as prettier from 'prettier'

import base from './index.json' with { type: 'json' }
import tailwind from './tailwind.mjs'

const stylesheet = './fixtures/globals.css'

test('carries the base options plus the plugin block', () => {
  const config = tailwind({ stylesheet })
  for (const [key, value] of Object.entries(base)) assert.equal(config[key], value)
  assert.deepEqual(config.plugins, [
    'prettier-plugin-organize-imports',
    'prettier-plugin-tailwindcss',
  ])
  assert.deepEqual(config.tailwindFunctions, ['clsx'])
  assert.equal(config.tailwindStylesheet, stylesheet)
})

test('refuses to build a config with no stylesheet', () => {
  assert.throws(() => tailwind(), TypeError)
  assert.throws(() => tailwind({}), TypeError)
  assert.throws(() => tailwind({ stylesheet: '' }), TypeError)
})

test('extra options are spread over the defaults', () => {
  const overrides = [
    { files: 'apps/web/**', options: { tailwindStylesheet: './apps/web/globals.css' } },
  ]
  const config = tailwind({ stylesheet, functions: ['clsx', 'cva'], overrides, printWidth: 80 })
  assert.deepEqual(config.tailwindFunctions, ['clsx', 'cva'])
  assert.equal(config.overrides, overrides)
  assert.equal(config.printWidth, 80)
})

// The plugin options are validated against the plugins' own support info, so a
// rename upstream (tailwindStylesheet was tailwindConfig in the Tailwind 3 era)
// fails here instead of silently stopping class sorting in every consumer.
test('every option is one Prettier or the two plugins support', async () => {
  const config = tailwind({ stylesheet })
  const supported = new Set(
    (await prettier.getSupportInfo({ plugins: config.plugins })).options.flatMap((o) => [
      o.name,
      ...(o.alias ?? []),
    ]),
  )
  const unknown = Object.keys(config).filter((k) => k !== 'plugins' && !supported.has(k))
  assert.deepEqual(unknown, [], `unknown options: ${unknown.join(', ')}`)
})

test('sorts Tailwind classes, inside clsx too, with the shared quotes', async () => {
  const out = await prettier.format(
    `const A = () => <div className={clsx("p-4 flex", open && "block hidden")} />\n`,
    { ...tailwind({ stylesheet }), parser: 'babel', filepath: 'a.jsx' },
  )
  assert.match(out, /clsx\('flex p-4', open && 'block hidden'\)/)
})
