import type { MessageKey } from "@/lib/i18n/dictionaries";

/**
 * Passos do tour guiado. Puro dado — sem React — para poder ser testado e
 * reusado pela página /docs, que espelha os mesmos títulos e corpos.
 *
 * Um passo tem dois eixos:
 *
 *   `to`     rota para a qual o tour navega antes de mostrar o passo. Só muda
 *            quando o alvo mora noutra página (busca na home, carta no perfil).
 *   `target` seletor do elemento iluminado. Passo sem `target` é conceitual: a
 *            tooltip fica centralizada e a página não é escurecida.
 *
 * A navegação dos passos-alvo encadeados na mesma rota é gratuita: o passo 4
 * (carta) navega para /torvalds, e os passos seguintes só rolam até o alvo.
 */
export interface GuideStep {
  id: string;
  titleKey: MessageKey;
  bodyKey: MessageKey;
  /** Rota para navegar antes de exibir o passo. */
  to?: string;
  /** Seletor do elemento iluminado pelo spotlight. */
  target?: string;
}

export const GUIDE_STEPS: readonly GuideStep[] = [
  {
    id: "concept",
    titleKey: "guide.step.concept.title",
    bodyKey: "guide.step.concept.body",
    target: ".docs-hero",
  },
  {
    id: "generate",
    titleKey: "guide.step.generate.title",
    bodyKey: "guide.step.generate.body",
    to: "/",
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
    to: "/torvalds?guide=1",
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
    id: "posters",
    titleKey: "guide.step.posters.title",
    bodyKey: "guide.step.posters.body",
    to: "/docs",
  },
  {
    id: "language",
    titleKey: "guide.step.language.title",
    bodyKey: "guide.step.language.body",
    target: ".locale-toggle",
  },
  {
    id: "end",
    titleKey: "guide.step.end.title",
    bodyKey: "guide.step.end.body",
    to: "/docs",
  },
];

export const GUIDE_STEP_IDS: readonly string[] = GUIDE_STEPS.map((step) => step.id);
