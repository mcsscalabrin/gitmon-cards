# Contributing to Gitmon Cards

Issues and pull requests are welcome. The project is small and opinionated — this document exists
so that a contribution does not run into an unwritten rule.

## Language

Read this first, because it is unusual and it is deliberate:

| Where | Language |
|---|---|
| This file, the README, issue and PR templates | **English** |
| `docs/`, `PRODUCT.md`, code comments, test names, commit messages | **Portuguese** |
| Exported code — types, exported functions, i18n keys | **English** |

The project is maintained in Portuguese and presented in English. You are not expected to write
Portuguese to contribute code, but you will read it: the reasoning lives in the comments, and the
comments are where this project keeps the parts that a diff cannot show.

The product itself is bilingual (PT/EN) and has been since v1 — see [i18n](#i18n).

## Getting set up

```bash
npm install
cp .env.example .env.local   # fill in GITHUB_TOKEN
npm run dev
```

`GITHUB_TOKEN` is any public-read token (5,000 req/h). Without it the image routes return an error
card that says so, rather than failing silently.

`REDIS_URL` is optional in development, with two separate consequences: the data cache falls back
to per-process (it works, it just spends more rate limit), and cards come out **without serial
numbers**. The second one is deliberate — see `.env.example`, which argues the case.

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm test` | Unit tests (formulas, battle, rendering, i18n) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (`eslint . --max-warnings=0`) |
| `npm run test:e2e` | Playwright (needs `npx playwright install chromium` first) |
| `PREVIEW=<dir> npm test` | Writes the rendered PNGs to disk so you can look at them |
| `npm run assets` | Regenerates frames, foil, metal and energy icons |
| `npm run fonts` | Downloads and subsets the card font — TTF for Satori, WOFF2 for the site |

On PowerShell the preview variable goes first, separately: `$env:PREVIEW="out"; npm test`.

Art and fonts are committed. `assets` and `fonts` only need to run when the drawing or the
character repertoire changes.

### Running the e2e suite

It has two modes, decided by `E2E_BASE_URL`:

- **Without it** — Playwright starts `npm run dev` and tests against it. This mode needs
  `GITHUB_TOKEN` in your environment, because this process is the one calling GitHub.
- **With it** — Playwright only speaks HTTP to the deployment you point at. No token needed
  locally; it lives on the server. This is what CI does.

Tests carry tags. `@smoke` is the read-only subset that production runs against a fresh deploy;
`@stateful` writes battle records to Redis with a 30-day TTL, which is why production skips it.

```bash
npx playwright test --grep '@smoke'
```

On PowerShell the quotes are required — bare `@smoke` is parsed as a splatting operator.

## Before you open the PR

```bash
npm run lint
npm run typecheck
npm test
```

CI runs these three on every PR and **blocks the deploy** if any fails. Running them first is so
you don't discover in the runner what your terminal would have told you in ten seconds.

### What CI does to your PR

| When | What |
|---|---|
| PR | lint + typecheck + unit tests → preview deploy on Vercel → **e2e against that preview** → a bot comment with the URL |
| Push to `main` | the same gates → production deploy → smoke of the image routes against what went up |
| Tag `v*` | GitHub Release, body taken from `CHANGELOG.md` |

The CI e2e does not run against `next dev`: it points `E2E_BASE_URL` at the preview deployment,
which exercises the real serverless environment — Redis, rewrites, `outputFileTracingIncludes`.
That is the difference between proving the code works and proving the deploy works.

**If your PR comes from a fork**, expect this and do not read it as a failure:

```
quality        passes      <- the check that matters for review
deploy         skipped
e2e            skipped
comment        skipped
```

GitHub does not share repository secrets with workflows triggered from a fork, which is the right
call — your PR contains code nobody has reviewed yet. Without secrets there is no Vercel deploy and
no preview to test. A maintainer who wants a preview can push your branch to the repository.

**What CI does not cover is still yours:** it never looks at the card. The bot comment carries the
preview URL for exactly that reason.

### Render it and look at it

The most expensive lesson this project has learned: **layout only breaks when you look at it.**
An attack's damage vanishing from the card, a duplicated title, the right column bleeding out of
the viewport, a click target that never settled — all of them passed typecheck and a green suite.
None were caught by a test. All were caught by a screenshot.

If your PR touches the card, run `PREVIEW=<dir> npm test` and look at the PNGs. If it touches the
page, start `npm run dev` and look. Describe in the PR what you saw.

Two warnings that save an hour of debugging:

- **The cache masks domain changes.** In development the card cache is in-memory and survives hot
  reload. Every time a domain change "didn't show up", this was the cause — restart the server.
- **There is a third cache: the browser.** The image route responds `max-age=3600`, so the PNG on
  screen can be an hour old while the HTML around it is new. If the page and the card disagree,
  reload the PNG with `?bust=<now>` before you suspect the domain.

## Domain rules

- **Changed the card's shape? Bump `CARD_VERSION`** (`lib/cards/index.ts`). A new field, or an enum
  value that no longer exists: without the bump, a cached old card breaks at render time, not at
  compile time — and in development that goes unnoticed until production.
- **The formulas are locked in the RFC**, not a preference of whoever is editing. Touching a weight
  in `profile.ts` or `repo.ts` requires updating RFC 6.1/6.2 in the same PR, with the reason.
- **The exported image is clean (RFC 9.6).** Explanation, radar and navigation affordances live on
  the site only. That is why `derivations` and `ratings` are optional in the domain: the image
  renderer never reads them. A PR that makes it read them breaks the promise along with it.
- **Technical-neutral tone (RFC 9.2).** The data speaks for itself. Attack names are real repository
  names or real logins; the footer is templated from the numbers. No jokes, no humanising, no
  invented TCG flavour text.
- **`layout.json` and `palette.json` are single sources**, read by both the build and the runtime.
  Duplicating a value from them into CSS or a component is the kind of divergence that only shows
  up months later.

## i18n

`MessageKey` is derived from the `pt` dictionary, and `en` is typed as `Record<MessageKey, string>`.
Adding a key only in Portuguese **breaks typecheck**, on purpose — there is no path to a
half-translated site.

Keys with a different subject get their own prefix rather than being reused: `why.*` speaks to the
person ("your dominant language"), `why.repo.*` speaks about the repository. Reusing them would save
a line and make the site address a repository as if it were you.

## Art

Frames, foils, metals and the coloured discs of the type icons are original. **No assets from The
Pokémon Company, no fan icons** from the reference repositories — not even as a temporary
placeholder. The one third-party art in the project is the glyph inside each type disc, which comes
from [Lucide](https://lucide.dev) under the ISC licence and is credited in the README.

Frames, foil and metals are generated by `npm run assets`; the 18 type icons are build inputs in
`scripts/assets/types/`, and the palette in `palette.json` is extracted from them, not the reverse.
That direction is the rule: a new icon set changes the frames with it, so replacing the icons means
re-extracting the palette and re-running `npm run assets`, never hand-editing a hex.

## Commits

Prefix, lowercase, no accents in the subject: `feat:`, `docs:`, `chore:`. The body is where the
value is — explain **why**, not what the diff already shows. A constraint you discovered, an
alternative you discarded and a trap you hit are worth more than a summary of the changed lines.

The RFC does not get rewritten. Where a later decision supersedes it, the original section stays put
with a supersession note directly below, and the new decision goes into `docs/decisions.md`.

## Never commit

`.env.local` (it is in `.gitignore`, and `.env.example` documents the variables without values).
GitHub tokens in a test, a fixture or a commit message.
