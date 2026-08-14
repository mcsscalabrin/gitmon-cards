# Security Policy

## Reporting a vulnerability

Report privately through
[GitHub Security Advisories](https://github.com/mcsscalabrin/gitmon-cards/security/advisories/new).
Please do not open a public issue.

This is a side project with a single maintainer, so treat any response time as best-effort rather
than a commitment.

## What is worth reporting

The project holds no visitor accounts and no visitor data — there is no login (RFC 5). What it does
hold is server-side credentials, so the interesting surface is narrower than usual:

- **Anything that exposes `GITHUB_TOKEN` or `GITHUB_TOKENS`.** A server-side token pool is the one
  real secret here. Leaking it through an error message, a rendered card, a response header or a
  source map is the highest-severity issue this project can have.
- **Anything that makes the image routes render attacker-controlled text or images** into a card
  that a third party has embedded in their README. The card travels: a poisoned render is served
  from someone else's repository page, with `s-maxage=86400` behind it.
- **Cache poisoning of the image routes**, for the same reason.
- **Bypassing the per-IP rate limit** (`lib/rateLimit.ts`), which exists to keep scrapers from
  draining the token pool.
- **Anything that writes to Redis outside the two intended paths** — the data cache and the serial
  number counter in `lib/cards/serial.ts`. The serial counter is the only durable data here.

## What is not a vulnerability

- Rate limiting returning 429. That is the feature working.
- Cards rendering without serial numbers when `REDIS_URL` is absent. Documented and deliberate —
  see `.env.example`.
- The error card being a real PNG with a 404 status. That is deliberate too: a broken embed in a
  README needs to say what happened.
- Public GitHub data appearing on a card. All of it comes from the public API, and the card links
  back to its source.
