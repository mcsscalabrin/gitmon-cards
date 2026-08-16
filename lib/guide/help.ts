import type { MessageKey } from "@/lib/i18n/dictionaries";

/**
 * A ajuda por seção — o "?" que explica a respectiva aba sem o tour completo.
 *
 * Uma seção é um par de chaves de i18n apontando para os mesmos títulos e
 * corpos do tour guiado (`guide.step.*`): o site não tem duas versões do mesmo
 * texto. Puro dado, sem React, para poder ser testado como o config do tour.
 */
export interface HelpSection {
  id: string;
  titleKey: MessageKey;
  bodyKey: MessageKey;
}

export const HELP: Record<string, HelpSection> = {
  /**
   * "Carta (raridade/tag/classe)" é o passo `headline` do tour: a frente da
   * carta já é explicada junto (o botão vive no cabeçalho da carta).
   */
  card: { id: "card", titleKey: "guide.step.headline.title", bodyKey: "guide.step.headline.body" },
  search: { id: "search", titleKey: "guide.step.generate.title", bodyKey: "guide.step.generate.body" },
  radar: { id: "radar", titleKey: "guide.step.radar.title", bodyKey: "guide.step.radar.body" },
  why: { id: "why", titleKey: "guide.step.why.title", bodyKey: "guide.step.why.body" },
  embed: { id: "embed", titleKey: "guide.step.embed.title", bodyKey: "guide.step.embed.body" },
  battle: { id: "battle", titleKey: "guide.step.battle.title", bodyKey: "guide.step.battle.body" },
  ygo: { id: "ygo", titleKey: "guide.step.ygo.title", bodyKey: "guide.step.ygo.body" },
  poster: { id: "poster", titleKey: "guide.step.posters.title", bodyKey: "guide.step.posters.body" },
};

export const HELP_IDS: readonly string[] = Object.keys(HELP);
