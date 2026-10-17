import type { Config } from 'prettier'

export interface TailwindOptions extends Config {
  /**
   * Path to the CSS file that imports Tailwind, relative to the config file,
   * e.g. `'./src/app/globals.css'`. Required: the class sorter reads it to
   * learn the theme.
   */
  tailwindStylesheet: string
  /** Functions whose string arguments hold class names. Defaults to `['clsx']`. */
  tailwindFunctions?: string[]
  /**
   * Extra plugins. Merged, not replaced: `prettier-plugin-organize-imports`
   * stays first and `prettier-plugin-tailwindcss` last.
   */
  plugins?: string[]
}

/** The shared Prettier options plus the Tailwind plugin block. */
export default function tailwind(options: TailwindOptions): Config
