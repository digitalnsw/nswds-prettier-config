import base from './index.json' with { type: 'json' }

// The two plugins every Tailwind repo in the fleet runs, in this order:
// organize-imports first so the class sorter sees the final JSX.
const plugins = ['prettier-plugin-organize-imports', 'prettier-plugin-tailwindcss']

/**
 * The shared options plus the Tailwind plugin block, so a Tailwind repo's
 * `.prettierrc.mjs` names only what is specific to it: the stylesheet that
 * imports Tailwind, which the class sorter reads to learn the theme.
 *
 * Anything else passed in is spread last and so overrides the defaults; a
 * monorepo uses that for per-app `overrides`.
 *
 * @param {object} options
 * @param {string} options.stylesheet Path to the CSS file that imports Tailwind,
 *   relative to the config file, e.g. `'./src/app/globals.css'`.
 * @param {string[]} [options.functions] Functions whose string arguments hold
 *   class names (Prettier's `tailwindFunctions`). Defaults to `['clsx']`.
 */
export default function tailwind({ stylesheet, functions = ['clsx'], ...rest } = {}) {
  if (typeof stylesheet !== 'string' || stylesheet === '') {
    throw new TypeError(
      '@nswds/prettier-config/tailwind: `stylesheet` must be the path to the CSS file that imports Tailwind, e.g. "./src/app/globals.css"',
    )
  }
  return {
    ...base,
    plugins,
    tailwindFunctions: functions,
    tailwindStylesheet: stylesheet,
    ...rest,
  }
}
