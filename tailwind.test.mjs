import assert from 'node:assert/strict'
import { test } from 'node:test'

import * as prettier from 'prettier'

import base from './index.json' with { type: 'json' }
import tailwind from './tailwind.mjs'

const tailwindStylesheet = './fixtures/globals.css'

test('carries the base options plus the plugin block', () => {
  const config = tailwind({ tailwindStylesheet })
  for (const [key, value] of Object.entries(base)) assert.equal(config[key], value)
  assert.deepEqual(config.plugins, [
    'prettier-plugin-organize-imports',
    'prettier-plugin-tailwindcss',
  ])
  assert.deepEqual(config.tailwindFunctions, ['clsx'])
  assert.equal(config.tailwindStylesheet, tailwindStylesheet)
})

test('refuses to build a config without a stylesheet or without options', () => {
  for (const bad of [undefined, null, 'x', {}, { tailwindStylesheet: '' }]) {
    assert.throws(() => tailwind(bad), {
      name: 'TypeError',
      message: /@nswds\/prettier-config\/tailwind/,
    })
  }
})

test('extra options are spread over the defaults', () => {
  const overrides = [
    { files: 'apps/web/**', options: { tailwindStylesheet: './apps/web/globals.css' } },
  ]
  const config = tailwind({
    tailwindStylesheet,
    tailwindFunctions: ['clsx', 'cva'],
    overrides,
    printWidth: 80,
  })
  assert.deepEqual(config.tailwindFunctions, ['clsx', 'cva'])
  assert.equal(config.overrides, overrides)
  assert.equal(config.printWidth, 80)
})

// prettier-plugin-tailwindcss wraps the parsers and must be loaded last, so a
// consumer's plugins are merged in between rather than replacing the list.
test('extra plugins are merged, with the Tailwind plugin kept last', () => {
  const config = tailwind({
    tailwindStylesheet,
    plugins: ['prettier-plugin-astro', 'prettier-plugin-tailwindcss'],
  })
  assert.deepEqual(config.plugins, [
    'prettier-plugin-organize-imports',
    'prettier-plugin-astro',
    'prettier-plugin-tailwindcss',
  ])
})

test('each call returns its own plugins array', () => {
  const a = tailwind({ tailwindStylesheet })
  const b = tailwind({ tailwindStylesheet })
  assert.notEqual(a.plugins, b.plugins)
})

// The plugin options are validated against the plugins' own support info, so a
// rename upstream (tailwindStylesheet was tailwindConfig in the Tailwind 3 era)
// fails here instead of silently stopping class sorting in every consumer.
test('every option is one Prettier or the two plugins support', async () => {
  const config = tailwind({ tailwindStylesheet })
  const supported = new Set(
    (await prettier.getSupportInfo({ plugins: config.plugins })).options.flatMap((o) => [
      o.name,
      ...(o.alias ?? []),
    ]),
  )
  const unknown = Object.keys(config).filter((k) => k !== 'plugins' && !supported.has(k))
  assert.deepEqual(unknown, [], `unknown options: ${unknown.join(', ')}`)
})

// `bg-brand` exists only in the fixture's @theme. With the sheet read it sorts
// into position between `flex` and `p-4`; with the default theme it is an
// unknown class and stays first, so this fails if the stylesheet is not used.
test('sorts classes against the stylesheet, inside clsx too, with the shared quotes', async () => {
  const out = await prettier.format(
    `const A = () => <div className={clsx("bg-brand p-4 flex", open && "block hidden")} />\n`,
    { ...tailwind({ tailwindStylesheet }), parser: 'babel', filepath: 'a.jsx' },
  )
  assert.match(out, /clsx\('flex bg-brand p-4', open && 'block hidden'\)/)
})
