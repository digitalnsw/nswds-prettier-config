import base from './index.json' with { type: 'json' }

const ORGANIZE_IMPORTS = 'prettier-plugin-organize-imports'
const TAILWIND = 'prettier-plugin-tailwindcss'
const PREFIX = '@nswds/prettier-config/tailwind:'

const isPath = (value) => typeof value === 'string' && value !== ''

/**
 * The shared options plus the Tailwind plugin block, so a Tailwind repo's
 * `.prettierrc.mjs` names only what is specific to it: the stylesheet that
 * imports Tailwind, which the class sorter reads to learn the theme. A
 * monorepo names one per app in `overrides` instead and omits the top-level
 * path; a config that sets neither is refused, because the sorter would then
 * run against the default theme and silently leave every custom class
 * unsorted.
 *
 * Options use Prettier's own names, so there is exactly one spelling of each.
 * Anything else passed in is spread last and overrides the defaults.
 * `plugins` is the one exception: extra plugins are merged in, because
 * prettier-plugin-tailwindcss wraps the parsers and its README says it must be
 * loaded last to coexist with other plugins, so a consumer must never be able
 * to displace it.
 *
 * @param {import('./tailwind.mjs').TailwindOptions} options
 * @returns {import('prettier').Config}
 */
export default function tailwind(options) {
  if (options === null || typeof options !== 'object') {
    throw new TypeError(
      `${PREFIX} pass an options object, e.g. tailwind({ tailwindStylesheet: "./src/app/globals.css" })`,
    )
  }
  const { tailwindStylesheet, tailwindFunctions = ['clsx'], plugins = [], ...rest } = options
  if (!Array.isArray(plugins)) {
    throw new TypeError(`${PREFIX} \`plugins\` must be an array of extra plugins to merge in`)
  }
  const inOverrides =
    Array.isArray(rest.overrides) &&
    rest.overrides.some((o) => o && o.options && isPath(o.options.tailwindStylesheet))
  if (tailwindStylesheet !== undefined && !isPath(tailwindStylesheet)) {
    throw new TypeError(
      `${PREFIX} \`tailwindStylesheet\` must be the path to the CSS file that imports Tailwind, e.g. "./src/app/globals.css"`,
    )
  }
  if (tailwindStylesheet === undefined && !inOverrides) {
    throw new TypeError(
      `${PREFIX} set \`tailwindStylesheet\` to the CSS file that imports Tailwind, e.g. "./src/app/globals.css", or set it per app in \`overrides\``,
    )
  }
  const extra = plugins.filter((p) => p !== ORGANIZE_IMPORTS && p !== TAILWIND)
  return {
    ...base,
    plugins: [ORGANIZE_IMPORTS, ...extra, TAILWIND],
    tailwindFunctions,
    ...(tailwindStylesheet === undefined ? {} : { tailwindStylesheet }),
    ...rest,
  }
}
