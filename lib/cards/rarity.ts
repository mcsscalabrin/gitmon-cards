import type { Rarity } from "./types";

/**
 * Faixas de raridade, na escada de oito tiers do TCG Pokémon.
 *
 * Os três primeiros limiares continuam onde a calibração original da RFC 6.1 os
 * deixou, contra estes perfis de referência:
 *
 *   conta nova (0★, 1 seguidor, 5 repos, 1 ano)      →    13  common
 *   dev comum (10★, 5 seguidores, 30 repos, 8 anos)  →   105  uncommon
 *   dev sólido (200★, 100 seguidores, 60 repos, 10)  →   810  rare
 *   dev notável (2k★, 1k seguidores, 100 repos, 12)  →  7160  ultra_rare
 *
 * Os tiers acima de `double_rare` foram calibrados contra perfis reais medidos
 * pela API, não estimados. O score cresce muito mais rápido do que a intuição
 * sugere, porque estrelas contam ×2 e seguidores ×3:
 *
 *   mcsscalabrin   6★     29 seg     15 repos   4a  →      134  uncommon
 *   kentcdodds     45k★   35k seg   753 repos  14a  →  196.983  ultra_rare
 *   defunkt        37k★   23k seg   107 repos  19a  →  142.566  ultra_rare
 *   gaearon        30k★   91k seg   299 repos  15a  →  334.805  special_illu.
 *   yyx990803      14k★  109k seg   198 repos  16a  →  355.967  special_illu.
 *   tj            135k★   52k seg   296 repos  18a  →  426.514  special_illu.
 *   torvalds      254k★  316k seg    12 repos  15a  →  1.456.179  hyper_rare
 *   sindresorhus  851k★   81k seg  1141 repos  17a  →  1.945.490  hyper_rare
 *
 * A primeira versão desta escada parava em 25.000 e colocava **seis dos sete**
 * perfis notáveis em `hyper_rare` — o tier mais raro virou o tier padrão. Os
 * limiares tinham sido escolhidos como se fossem contagem de estrelas, e não
 * score. O topo precisa continuar raro para significar alguma coisa.
 */
const RARITY_THRESHOLDS: Array<{ min: number; rarity: Rarity }> = [
  { min: 800_000, rarity: "hyper_rare" },
  { min: 200_000, rarity: "special_illustration_rare" },
  { min: 40_000, rarity: "ultra_rare" },
  { min: 8_000, rarity: "illustration_rare" },
  // 1500 não é número redondo por acaso: é o corte que o `freshnessBonus` de
  // `./repo.ts` precisa para continuar significando alguma coisa. Um repo com
  // 700★ vale 1400 pontos, e os 300 de atividade recente são exatamente o que o
  // empurra para cá. Baixar este limiar faz mantido e abandonado caírem no mesmo
  // tier, e o bônus deixa de ser visível na carta.
  { min: 1500, rarity: "double_rare" },
  { min: 350, rarity: "rare" },
  { min: 75, rarity: "uncommon" },
  { min: 0, rarity: "common" },
];

export function rarityForScore(score: number): Rarity {
  for (const { min, rarity } of RARITY_THRESHOLDS) {
    if (score >= min) return rarity;
  }
  return "common";
}

/**
 * Símbolo do rodapé direito (RFC 4.4, item 8).
 *
 * O layout original previa 3 glifos para 5 tiers. Com oito, a leitura passa a ser
 * **contagem + cor**: uma, duas ou três estrelas, pretas, prateadas ou douradas.
 * O subset da fonte já cobre ⬤ ◆ ★ (ver `lib/og/assets.ts`), então repetir a
 * estrela não exige glifo novo.
 */
export function raritySymbol(rarity: Rarity): string {
  switch (rarity) {
    case "common":
      return "●";
    case "uncommon":
      return "◆";
    case "rare":
    case "illustration_rare":
      return "★";
    case "double_rare":
    case "ultra_rare":
    case "special_illustration_rare":
      return "★★";
    case "hyper_rare":
      return "★★★";
  }
}

/**
 * Cor do símbolo. Necessária porque a contagem sozinha não separa os tiers:
 * `double_rare`, `ultra_rare` e `special_illustration_rare` têm duas estrelas
 * cada, e só a cor os distingue.
 *
 * Estes três valores não vêm de `palette.json` — aquela paleta é dos sete
 * elementos e não tem metais. Ficam aqui porque só a raridade os usa.
 */
const SYMBOL_INK = "#2B2721";
const SYMBOL_SILVER = "#C8CDD4";
const SYMBOL_GOLD = "#C9A227";

export function raritySymbolColor(rarity: Rarity): string {
  switch (rarity) {
    case "common":
    case "uncommon":
    case "rare":
    case "double_rare":
      return SYMBOL_INK;
    case "ultra_rare":
      return SYMBOL_SILVER;
    case "illustration_rare":
    case "special_illustration_rare":
    case "hyper_rare":
      return SYMBOL_GOLD;
  }
}

/**
 * Tamanho de fonte do símbolo. Não cresce linearmente por tier: a partir de duas
 * estrelas o conjunto já ocupa o dobro da largura, então o tamanho recua para o
 * rodapé não estourar (`layout.footer`).
 */
export function raritySymbolSize(rarity: Rarity): number {
  switch (rarity) {
    case "common":
      return 14;
    case "uncommon":
      return 16;
    case "rare":
    case "illustration_rare":
      return 18;
    case "double_rare":
    case "ultra_rare":
    case "special_illustration_rare":
      return 15;
    case "hyper_rare":
      return 13;
  }
}

/**
 * Raridades que ganham camada de foil por cima da moldura.
 *
 * No TCG a Rare já vem com foil holográfico básico, então o corte desce de
 * `holo` para `rare`: seis tiers com foil em vez de dois. Cada um precisa do seu
 * `public/assets/frames/foil-<rarity>.png`, gerado por `scripts/build-assets.mjs`.
 */
export function hasFoil(rarity: Rarity): boolean {
  return rarity !== "common" && rarity !== "uncommon";
}

/**
 * Força do foil ao vivo, de 0 a 1 (`components/card/TiltCard.tsx`).
 *
 * O `hasFoil` acima é booleano porque a moldura impressa só precisa saber se
 * existe arquivo de foil para compor. Na tela é diferente: seis tiers dividindo
 * a mesma camada faz `rare` e `hyper_rare` brilharem igual, e a escada de
 * raridade que o resto da carta constrói morre exatamente no efeito mais
 * visível dela.
 *
 * Os valores não são lineares. O salto grande fica entre `double_rare` e
 * `illustration_rare`, que é onde o tratamento também muda para full-art
 * (`cardTreatment`) — o foil acompanha o degrau que já existe em vez de
 * inventar outro.
 */
export function foilIntensity(rarity: Rarity): number {
  switch (rarity) {
    case "common":
    case "uncommon":
      return 0;
    case "rare":
      return 0.42;
    case "double_rare":
      return 0.55;
    case "illustration_rare":
      return 0.78;
    case "ultra_rare":
      return 0.88;
    case "special_illustration_rare":
      return 0.95;
    case "hyper_rare":
      return 1;
  }
}

export type MetalTone = "silver" | "gold";

export interface CardTreatment {
  /** Janela da arte em sangria, com nome e faixa de tipo por cima dela. */
  fullArt: boolean;
  /** Camada metálica sobre a moldura, ou `null`. */
  metal: MetalTone | null;
}

/**
 * Tratamento visual por tier.
 *
 * Existe porque contagem e cor de estrela não bastavam: `illustration_rare`,
 * `ultra_rare` e `special_illustration_rare` saíam praticamente idênticas, já que
 * a arte é sempre o mesmo avatar na mesma moldura. A escada visual agora é:
 *
 *   rare / double_rare          layout padrão, só foil
 *   illustration_rare           full-art sem metal
 *   ultra_rare                  full-art + prata
 *   special_illustration_rare   full-art + ouro
 *   hyper_rare                  layout padrão + ouro (folheada, como no TCG)
 *
 * `hyper_rare` volta ao layout padrão de propósito: no TCG a secret dourada é
 * gravada sobre a carta normal, não sobre full-art, e isso a torna distinguível
 * da `special_illustration_rare` à primeira vista em vez de por contagem de
 * estrelas.
 */
export function cardTreatment(rarity: Rarity): CardTreatment {
  switch (rarity) {
    case "illustration_rare":
      return { fullArt: true, metal: null };
    case "ultra_rare":
      return { fullArt: true, metal: "silver" };
    case "special_illustration_rare":
      return { fullArt: true, metal: "gold" };
    case "hyper_rare":
      return { fullArt: false, metal: "gold" };
    default:
      return { fullArt: false, metal: null };
  }
}
