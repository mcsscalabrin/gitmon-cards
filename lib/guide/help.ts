import { GUIDE_STEPS, type GuideStep } from "@/lib/guide/steps";
import type { MessageKey } from "@/lib/i18n/dictionaries";

/**
 * A ajuda por seção — o "?" que explica a respectiva aba sem o tour completo.
 *
 * Uma seção é um par de chaves de i18n apontando para os mesmos títulos e
 * corpos do tour guiado (`guide.step.*`), mais a lista de passos que formam o
 * mini-tour daquela aba (`stepIds`). O site não tem duas versões do mesmo
 * texto. Puro dado, sem React, para poder ser testado como o config do tour.
 */
export interface HelpSection {
  id: string;
  titleKey: MessageKey;
  bodyKey: MessageKey;
  /**
   * Passos do `GUIDE_STEPS` que compõem esta seção. O "Passo a passo" da bolha
   * roda só estes — a seção não arrasta o tour universal de 14 passos.
   */
  stepIds: readonly string[];
}

export const HELP: Record<string, HelpSection> = {
  /**
   * "Carta (raridade/tag/classe)" é o passo `headline` do tour; o mini-tour da
   * aba começa antes, na revelação do pacote, e passa pela frente da carta até
   * o cabeçalho com raridade, tag e classe.
   */
  card: {
    id: "card",
    titleKey: "guide.step.headline.title",
    bodyKey: "guide.step.headline.body",
    stepIds: ["pack", "card", "headline"],
  },
  search: {
    id: "search",
    titleKey: "guide.step.generate.title",
    bodyKey: "guide.step.generate.body",
    stepIds: ["generate"],
  },
  radar: {
    id: "radar",
    titleKey: "guide.step.radar.title",
    bodyKey: "guide.step.radar.body",
    stepIds: ["radar"],
  },
  why: {
    id: "why",
    titleKey: "guide.step.why.title",
    bodyKey: "guide.step.why.body",
    stepIds: ["why"],
  },
  embed: {
    id: "embed",
    titleKey: "guide.step.embed.title",
    bodyKey: "guide.step.embed.body",
    stepIds: ["embed", "share"],
  },
  battle: {
    id: "battle",
    titleKey: "guide.step.battle.title",
    bodyKey: "guide.step.battle.body",
    stepIds: ["battle"],
  },
  ygo: {
    id: "ygo",
    titleKey: "guide.step.ygo.title",
    bodyKey: "guide.step.ygo.body",
    stepIds: ["ygo"],
  },
  poster: {
    id: "poster",
    titleKey: "guide.step.posters.title",
    bodyKey: "guide.step.posters.body",
    stepIds: ["posters"],
  },
};

export const HELP_IDS: readonly string[] = Object.keys(HELP);

/** Resolve os passos de uma seção a partir dos ids do tour. */
export function stepsForSection(id: string): readonly GuideStep[] {
  const section = HELP[id];
  if (!section) return [];
  return GUIDE_STEPS.filter((step) => section.stepIds.includes(step.id));
}
