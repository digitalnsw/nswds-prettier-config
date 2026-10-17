import base from './index.json' with { type: 'json' }

const ORGANIZE_IMPORTS = 'prettier-plugin-organize-imports'
const TAILWIND = 'prettier-plugin-tailwindcss'

/**
 * The shared options plus the Tailwind plugin block, so a Tailwind repo's
 * `.prettierrc.mjs` names only what is specific to it: the stylesheet that
 * imports Tailwind, which the class sorter reads to learn the theme.
 *
 * Options use Prettier's own names, so there is exactly one spelling of each.
 * Anything else passed in is spread last and overrides the defaults; a
 * monorepo uses that for per-app `overrides`. `plugins` is the one exception:
 * extra plugins are merged in, because prettier-plugin-tailwindcss wraps the
 * parsers and its README says it must be loaded last to coexist with other
 * plugins, so a consumer must never be able to displace it.
 *
 * @param {import('./tailwind.js').TailwindOptions} options
 * @returns {import('prettier').Config}
 */
export default function tailwind(options) {
  if (options === null || typeof options !== 'object') {
    throw new TypeError(
      '@nswds/prettier-config/tailwind: pass an options object with `tailwindStylesheet`, e.g. tailwind({ tailwindStylesheet: "./src/app/globals.css" })',
    )
  }
  const { tailwindStylesheet, tailwindFunctions = ['clsx'], plugins = [], ...rest } = options
  if (typeof tailwindStylesheet !== 'string' || tailwindStylesheet === '') {
    throw new TypeError(
      '@nswds/prettier-config/tailwind: `tailwindStylesheet` must be the path to the CSS file that imports Tailwind, e.g. "./src/app/globals.css"',
    )
  }
  const extra = plugins.filter((p) => p !== ORGANIZE_IMPORTS && p !== TAILWIND)
  return {
    ...base,
    plugins: [ORGANIZE_IMPORTS, ...extra, TAILWIND],
    tailwindFunctions,
    tailwindStylesheet,
    ...rest,
  }
}
