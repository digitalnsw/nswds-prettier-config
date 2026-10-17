import assert from 'node:assert/strict'
import { test } from 'node:test'

import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

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

test('refuses a config that names no stylesheet anywhere, or is not an object', () => {
  const noStylesheet = { overrides: [{ files: 'apps/web/**', options: { printWidth: 80 } }] }
  for (const bad of [undefined, null, 'x', {}, { tailwindStylesheet: '' }, noStylesheet]) {
    assert.throws(() => tailwind(bad), {
      name: 'TypeError',
      message: /@nswds\/prettier-config\/tailwind/,
    })
  }
})

// A monorepo names a stylesheet per app in overrides and has no sensible
// top-level one; that shape is accepted and emits no top-level key.
test('a stylesheet supplied only through overrides is enough', () => {
  const overrides = [
    { files: 'apps/web/**', options: { tailwindStylesheet: './apps/web/globals.css' } },
    { files: 'apps/admin/**', options: { tailwindStylesheet: './apps/admin/globals.css' } },
  ]
  const config = tailwind({ overrides })
  assert.equal('tailwindStylesheet' in config, false)
  assert.equal(config.overrides, overrides)
})

// Which overrides are meant to carry a stylesheet cannot be known (one may be
// for Markdown), but any value that is set is checked, so a typo in one app's
// entry fails here instead of sorting that app against the default theme.
test('an override that sets a bad stylesheet value is refused', () => {
  for (const bad of ['', 42]) {
    assert.throws(
      () =>
        tailwind({
          overrides: [
            { files: 'apps/web/**', options: { tailwindStylesheet: './apps/web/globals.css' } },
            { files: 'apps/admin/**', options: { tailwindStylesheet: bad } },
          ],
        }),
      { name: 'TypeError', message: /overrides\[1\]\.options\.tailwindStylesheet/ },
    )
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

test('plugin objects and URLs pass through; a non-array is refused', () => {
  const astro = { parsers: {} }
  const url = new URL('file:///x/plugin.mjs')
  const config = tailwind({ tailwindStylesheet, plugins: [astro, url] })
  assert.deepEqual(config.plugins, [
    'prettier-plugin-organize-imports',
    astro,
    url,
    'prettier-plugin-tailwindcss',
  ])
  assert.throws(() => tailwind({ tailwindStylesheet, plugins: 'prettier-plugin-astro' }), {
    name: 'TypeError',
    message: /`plugins` must be an array/,
  })
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

// The declaration file is what editors and type-checked configs see, and a
// typo in it, a mis-named file or a removed `./tailwind` export would ship
// with every other test green (a typo inside the declaration is reported only
// because skipLibCheck is off below; verified both ways). So the consumer resolves the package the way a
// real one does: through a node_modules entry that links to this repo, so
// TypeScript reads package.json and its `exports` map, with no `paths` mapping
// to short-circuit it. Verified to fail when the subpath export is removed and
// when the declaration is renamed. It does NOT fail when only the `types`
// condition is dropped: TypeScript then finds tailwind.d.mts beside
// tailwind.mjs by naming convention, which is also why consumers would still
// get the types. The temp dir sits under this repo's node_modules so
// `prettier`'s types resolve for the consumer too.
test('the shipped types resolve through the package exports', () => {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const cache = path.join(here, 'node_modules', '.cache')
  mkdirSync(cache, { recursive: true })
  const dir = mkdtempSync(path.join(cache, 'types-consumer-'))
  try {
    mkdirSync(path.join(dir, 'node_modules', '@nswds'), { recursive: true })
    // 'junction' needs no privileges on Windows and is ignored elsewhere.
    symlinkSync(here, path.join(dir, 'node_modules', '@nswds', 'prettier-config'), 'junction')
    writeFileSync(
      path.join(dir, 'consumer.ts'),
      [
        `import tailwind from '@nswds/prettier-config/tailwind'`,
        `import type { TailwindOptions } from '@nswds/prettier-config/tailwind'`,
        `const options: TailwindOptions = { tailwindStylesheet: './globals.css', plugins: [{}] }`,
        `export const a = tailwind(options)`,
        `export const b = tailwind({ overrides: [{ files: 'x', options: { tailwindStylesheet: 'y' } }] })`,
        `// @ts-expect-error a stylesheet must come from the top level or from overrides`,
        `export const c = tailwind({})`,
        `// @ts-expect-error tailwindFunctions must be an array`,
        `export const d = tailwind({ tailwindStylesheet: 'z', tailwindFunctions: 'clsx' })`,
        '',
      ].join('\n'),
    )
    writeFileSync(
      path.join(dir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          strict: true,
          noEmit: true,
          module: 'esnext',
          moduleResolution: 'bundler',
          target: 'es2022',
          // Errors inside tailwind.d.mts itself must count; skipLibCheck would
          // silence them and let a typo in the declaration ship.
          skipLibCheck: false,
          types: [],
        },
        files: ['consumer.ts'],
      }),
    )
    // TypeScript's own CLI script through this Node, not the .bin shim, which
    // is a .cmd launcher on Windows and cannot be spawned directly.
    const tsc = path.join(here, 'node_modules', 'typescript', 'bin', 'tsc')
    const result = spawnSync(process.execPath, [tsc, '-p', dir], { encoding: 'utf8' })
    assert.equal(result.status, 0, result.stdout + result.stderr)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

// `prettier.format()` ignores `overrides`; `resolveConfig` applies them. So
// the override-only form, the one a monorepo uses, is exercised through a real
// config file: a file under the override's path must sort against the
// fixture's theme (`bg-brand` lands between `flex` and `p-4`), and one outside
// it, with no stylesheet, must not. The temp dir sits under node_modules so
// the plugin names in the config resolve from this repo's install.
test('an override-supplied stylesheet is honoured through config resolution', async () => {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const cache = path.join(here, 'node_modules', '.cache')
  mkdirSync(cache, { recursive: true })
  const dir = mkdtempSync(path.join(cache, 'overrides-consumer-'))
  try {
    mkdirSync(path.join(dir, 'apps', 'web'), { recursive: true })
    mkdirSync(path.join(dir, 'apps', 'other'), { recursive: true })
    writeFileSync(
      path.join(dir, '.prettierrc.mjs'),
      [
        `import tailwind from ${JSON.stringify(pathToFileURL(path.join(here, 'tailwind.mjs')).href)}`,
        `export default tailwind({`,
        `  overrides: [{ files: 'apps/web/**', options: { tailwindStylesheet: ${JSON.stringify(path.join(here, 'fixtures', 'globals.css'))} } }],`,
        `})`,
        '',
      ].join('\n'),
    )
    const src = `const A = () => <div className="bg-brand p-4 flex" />\n`
    const run = async (filepath) => {
      const config = await prettier.resolveConfig(filepath, { useCache: false })
      assert.ok(config, 'resolveConfig found the temp .prettierrc.mjs')
      return prettier.format(src, { ...config, filepath })
    }
    assert.match(await run(path.join(dir, 'apps', 'web', 'a.jsx')), /className='flex bg-brand p-4'/)
    assert.match(
      await run(path.join(dir, 'apps', 'other', 'a.jsx')),
      /className='bg-brand flex p-4'/,
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
