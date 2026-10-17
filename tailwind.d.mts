import type { Config } from 'prettier'

export interface TailwindOptions extends Config {
  /**
   * Path to the CSS file that imports Tailwind, relative to the config file,
   * e.g. `'./src/app/globals.css'`. The class sorter reads it to learn the
   * theme. Required unless `overrides` sets `tailwindStylesheet` for every
   * Tailwind file, as a monorepo does with one entry per app.
   */
  tailwindStylesheet?: string
  /** Functions whose string arguments hold class names. Defaults to `['clsx']`. */
  tailwindFunctions?: string[]
  /**
   * Extra plugins, as names, URLs or plugin objects (anything Prettier accepts).
   * Merged, not replaced: `prettier-plugin-organize-imports` stays first and
   * `prettier-plugin-tailwindcss` last.
   */
  plugins?: Config['plugins']
}

/** The shared Prettier options plus the Tailwind plugin block. */
export default function tailwind(options: TailwindOptions): Config
