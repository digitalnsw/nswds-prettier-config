# @nswds/prettier-config

Shared Prettier config for the NSW Design System fleet — the single source of
truth for the formatting options that were previously copy-pasted into a
`.prettierrc` in every repo.

## Adopt in a repo

Install it, then reference it by name from `package.json` (delete the repo's
old `.prettierrc`):

In `package.json`:

```json
{
  "prettier": "@nswds/prettier-config"
}
```

That's the whole config for a plain repo. No local `.prettierrc` needed.

## Repos that use Tailwind

The base config omits the Tailwind plugin block, because `tailwindStylesheet`
is an app-specific path that does not exist in non-app repos. Tailwind repos use
the `tailwind` entry from a local `.prettierrc.mjs` instead of the `package.json`
key, naming only that path:

```js
// .prettierrc.mjs
import tailwind from '@nswds/prettier-config/tailwind'

export default tailwind({ stylesheet: './src/app/globals.css' })
```

That is the base options plus `prettier-plugin-organize-imports` and
`prettier-plugin-tailwindcss` (install both; they are optional peers, so npm
will not add them for you) and `tailwindFunctions: ['clsx']`. Pass `functions`
to change the latter, and anything else Prettier accepts is spread over the
defaults, which is how a monorepo sorts each app against its own stylesheet:

```js
// .prettierrc.mjs at the root of a workspace monorepo
import tailwind from '@nswds/prettier-config/tailwind'

export default tailwind({
  stylesheet: './apps/web/src/app/globals.css',
  overrides: [
    { files: 'apps/admin/**', options: { tailwindStylesheet: './apps/admin/src/app/globals.css' } },
  ],
})
```

The call form is deliberate: `export default` of an object literal warns under
`import/no-anonymous-default-export`, which
[@nswds/eslint-config](https://github.com/digitalnsw/nswds-eslint-config)
inherits from `eslint-config-next/core-web-vitals`; a call expression does not.

`tailwind.test.mjs` resolves the plugin options through the plugins' own
support info and sorts a real class list on every CI run, so a renamed plugin
option fails here rather than silently stopping class sorting in every consumer.

## Changing the shared options

Edit `index.json` and merge to `main` — [semantic-release](https://semantic-release.gitbook.io/)
versions and publishes it from the Conventional Commit message. Consumers pick
it up on their next `npm update` (Renovate opens the bump PRs).

Publishing uses **OIDC trusted publishing**, so there is no `NPM_TOKEN` secret in
this repo.

`index.test.mjs` resolves every option through Prettier's own support info on
each CI run. Prettier silently ignores keys it does not recognise, so without
that check a typo in `index.json` would ship and quietly stop being applied.

## Shared tooling

This repo is on the [nswds-devops](https://github.com/digitalnsw/nswds-devops)
file sync (**group 2c**), so these are owned centrally — edit them there, not
here, or the next sync will overwrite your change:

- `scripts/` (except `verify-release-published.mjs`, which is this repo's own)
- `commitlint.config.mjs`, `commit-types.mjs`, `git-conventional-commits.yaml`
- `.nvmrc`, `.npmrc`, `renovate.json`
- every workflow except `ci.yml` and `release.yml`

Group 2c exists because `release.yml` is bespoke: it carries `id-token: write`
for OIDC publishing and runs `scripts/verify-release-published.mjs` afterwards,
which fails the job if npm does not match the newest `v*` tag. The stock stub
would replace it and silently disable both — which is why this repo is not in
group 1 or 3.
