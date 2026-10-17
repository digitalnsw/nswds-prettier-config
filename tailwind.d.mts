import type { Config } from 'prettier'

interface TailwindBase extends Omit<Config, 'plugins'> {
  /** Functions whose string arguments hold class names. Defaults to `['clsx']`. */
  tailwindFunctions?: string[]
  /**
   * Extra plugins, as names, URLs or plugin objects (anything Prettier accepts).
   * Merged, not replaced: `prettier-plugin-organize-imports` stays first and
   * `prettier-plugin-tailwindcss` last.
   */
  plugins?: Config['plugins']
}

/** One stylesheet for the whole repo. */
export interface TailwindStylesheetOptions extends TailwindBase {
  /**
   * Path to the CSS file that imports Tailwind, relative to the config file,
   * e.g. `'./src/app/globals.css'`. The class sorter reads it to learn the
   * theme.
   */
  tailwindStylesheet: string
}

/**
 * A stylesheet per app, set in `overrides`, as a workspace monorepo does. Files
 * no override gives a stylesheet sort against Tailwind's default theme, so
 * cover every app.
 */
export interface TailwindOverridesOptions extends TailwindBase {
  tailwindStylesheet?: undefined
  overrides: NonNullable<Config['overrides']>
}

export type TailwindOptions = TailwindStylesheetOptions | TailwindOverridesOptions

/** The shared Prettier options plus the Tailwind plugin block. */
export default function tailwind(options: TailwindOptions): Config
