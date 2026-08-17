import type { MessageKey } from "@/lib/i18n/dictionaries";

/**
 * Passos do tour guiado. Puro dado — sem React — para poder ser testado e
 * reusado por quem monta o tour de cada página (`lib/guide/pages.ts`).
 *
 * Um passo ilumina um `target` (seletor do elemento). Passo sem `target` é
 * conceitual: a tooltip fica centralizada e a página não é escurecida.
 *
 * O tour nunca navega: cada página roda só os passos cujos alvos existem nela,
 * então `target` é sempre local à página que monta o passo.
 */
export interface GuideStep {
  id: string;
  titleKey: MessageKey;
  bodyKey: MessageKey;
  /** Seletor do elemento iluminado pelo spotlight. */
  target?: string;
}

export const GUIDE_STEPS: readonly GuideStep[] = [
  {
    id: "generate",
    titleKey: "guide.step.generate.title",
    bodyKey: "guide.step.generate.body",
    target: ".search-form",
  },
  {
    id: "pack",
    titleKey: "guide.step.pack.title",
    bodyKey: "guide.step.pack.body",
  },
  {
    id: "card",
    titleKey: "guide.step.card.title",
    bodyKey: "guide.step.card.body",
    target: ".tilt-card",
  },
  {
    id: "headline",
    titleKey: "guide.step.headline.title",
    bodyKey: "guide.step.headline.body",
    target: ".card-headline",
  },
  {
    id: "radar",
    titleKey: "guide.step.radar.title",
    bodyKey: "guide.step.radar.body",
    target: ".radar",
  },
  {
    id: "why",
    titleKey: "guide.step.why.title",
    bodyKey: "guide.step.why.body",
    target: ".card-aside-left .why",
  },
  {
    id: "embed",
    titleKey: "guide.step.embed.title",
    bodyKey: "guide.step.embed.body",
    target: ".embed",
  },
  {
    id: "share",
    titleKey: "guide.step.share.title",
    bodyKey: "guide.step.share.body",
    target: ".share-actions",
  },
  {
    id: "battle",
    titleKey: "guide.step.battle.title",
    bodyKey: "guide.step.battle.body",
    target: ".battle-form",
  },
  {
    id: "ygo",
    titleKey: "guide.step.ygo.title",
    bodyKey: "guide.step.ygo.body",
    target: ".battle-form-modes",
  },
  {
    id: "battle-board",
    titleKey: "guide.step.battle-board.title",
    bodyKey: "guide.step.battle-board.body",
    target: ".duel-stage",
  },
  {
    id: "battle-lp",
    titleKey: "guide.step.battle-lp.title",
    bodyKey: "guide.step.battle-lp.body",
    target: ".duel-lp",
  },
  {
    id: "posters",
    titleKey: "guide.step.posters.title",
    bodyKey: "guide.step.posters.body",
    target: ".battle-actions",
  },
];

export const GUIDE_STEP_IDS: readonly string[] = GUIDE_STEPS.map((step) => step.id);
