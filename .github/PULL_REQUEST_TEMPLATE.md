<!--
Thanks for the PR. The checklist is short on purpose: the only item that reliably
catches things here is the last one.
-->

## What changed, and why

<!-- The why is the part a diff cannot show. A constraint you discovered or an
     alternative you discarded is worth more than a summary of the lines. -->

## What you saw

<!-- Required if this touches the card or the page. Layout only breaks when you
     look at it: an attack's damage vanishing, a duplicated title, a column
     bleeding out of the viewport — all shipped past a green suite here.

     Card:  PREVIEW=<dir> npm test, then look at the PNGs
     Page:  npm run dev, then look

     A screenshot is the best answer to this section. "N/A — no visual change"
     is a fine answer too. -->

## Checks

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] Touched the card's shape (new field, removed enum value)? Bumped `CARD_VERSION` in `lib/cards/index.ts`
- [ ] Touched a scoring formula? Updated RFC 6.1/6.2 in this same PR, with the reason
- [ ] Added an i18n key? It exists in **both** `pt` and `en` (typecheck enforces this)

<!-- Opening from a fork? `deploy`, `e2e` and the preview comment will be skipped,
     and that is expected — GitHub does not share secrets with forks. `quality` is
     the check that matters for review. See CONTRIBUTING.md. -->
