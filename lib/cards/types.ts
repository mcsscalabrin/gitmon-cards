/**
 * Domínio da carta. Estas são as únicas formas que o renderizador de imagem, a
 * carta interativa e o motor de batalha conhecem — nenhum deles enxerga a API do
 * GitHub diretamente.
 */

/**
 * Os 18 tipos do TCG Pokémon.
 *
 * A RFC 4.4 e o cabeçalho antigo de `./elements.ts` defendiam 7 elementos, com o
 * argumento de que mapear ~20 linguagens para 18 tipos não era tratável. A
 * decisão foi revertida: com 18 tipos há espaço para separar infraestrutura de
 * shell, funcional de verificação formal, e legado de moderno — coisas que antes
 * caíam todas em `neutral`. O custo é um mapa de linguagens maior, que é
 * trabalho de tabela, não de arquitetura.
 *
 * `normal` substitui o antigo `neutral`, para casar com o nome do ícone.
 */
export const ELEMENTS = [
  "normal",
  "fire",
  "water",
  "grass",
  "electric",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
] as const;

export type Element = (typeof ELEMENTS)[number];

/**
 * Oito tiers, espelhando a escada do TCG Pokémon em vez dos 5 originais da RFC
 * 6.1. A distinção entre os tiers altos é feita por **quantidade e cor** do
 * símbolo, não só por tamanho — ver `raritySymbol`/`raritySymbolColor` em
 * `./rarity.ts`.
 *
 * A ressalva antiga dizia que `illustration_rare`, `ultra_rare` e
 * `special_illustration_rare` diferiam só pelo símbolo, porque a arte é sempre o
 * mesmo avatar na mesma moldura. Isso deixou de ser verdade em duas etapas: o
 * tratamento por tier (`cardTreatment`) separou layout, metal e borda, e a
 * textura gravada separou os três tiers do topo. O que a raridade ainda **não**
 * faz é diferenciar duas cartas do mesmo tier — esse é trabalho do eixo, em
 * `./tag.ts`, que é ortogonal a esta escada.
 */
export const RARITIES = [
  "common",
  "uncommon",
  "rare",
  "double_rare",
  "illustration_rare",
  "ultra_rare",
  "special_illustration_rare",
  "hyper_rare",
] as const;

export type Rarity = (typeof RARITIES)[number];

export interface Attack {
  /** Nome curto — vem do dado (nome do repo, login do contribuidor), não é inventado. */
  name: string;
  /** Ícones de custo de energia, 1 a 4. Define o arranjo geométrico no layout. */
  cost: number;
  damage: number;
  /** Linha de texto sob o ataque. Tom técnico-neutro (RFC 9.2). */
  text: string;
}

export type CardKind = "profile" | "repo";

export interface Card {
  kind: CardKind;
  /** `torvalds` ou `facebook/react`. Identidade estável, usada em chave de cache. */
  id: string;
  /** Nome exibido no topo da carta. */
  name: string;
  element: Element;
  hp: number;
  /** 0 a 2 ataques. Perfil sem repositórios legitimamente não tem nenhum. */
  attacks: Attack[];
  weakness: Element | null;
  resistance: Element | null;
  /** Pips de custo de recuo, 1 a 4. */
  retreat: number;
  rarity: Rarity;
  /**
   * Eixo em que a carta é mais forte — o segundo eixo do sistema, ortogonal à
   * raridade. Decide a **tag** impressa ao lado do nome e o **padrão** do foil.
   *
   * O que fica guardado é o eixo e não a tag já resolvida, de propósito: o eixo
   * é o dado, a palavra e a geometria são apresentação. Trocar `ORIGIN` por
   * outra palavra em `./tag.ts` passa a valer para as cartas já em cache, em vez
   * de precisar de um bump de `CARD_VERSION` só para renomear um rótulo.
   */
  axis: Axis;
  /**
   * Número de série sequencial, atribuído na primeira vez que a carta é gerada e
   * imutável depois disso. `null` quando o store durável não respondeu — carta
   * sem número é honesta, carta com número errado não é (ver `./serial.ts`).
   */
  serial: number | null;
  /** URL da arte central (avatar do GitHub). */
  artUrl: string;
  /** Linha de rodapé. Factual, gerada por template a partir dos números. */
  footer: string;
  /** Números crus, para a UI web mostrar de onde cada stat saiu. */
  stats: CardStat[];
  /** Explicação de cada valor derivado. Só o site usa; a imagem, não. */
  derivations?: Derivation[];
  /**
   * Assinatura do perfil para o radar. Como `derivations`, é afordância do site
   * e não entra na imagem exportada. Ver `./ratings.ts` para por que isto é
   * silhueta e não medição.
   */
  ratings?: AxisRating[];
  /** Link para a origem no GitHub. */
  sourceUrl: string;
}

/**
 * De onde saiu um número da carta.
 *
 * O modelo é o do gitfut: todo valor derivado mostra a métrica de origem e uma
 * frase de motivo, em vez de aparecer como número mágico. "Tipo: Fogo" não diz
 * nada; "Fogo — sua linguagem dominante é C, ponderada por estrelas" diz.
 *
 * Opcional de propósito: isto é afordância **do site**, nunca da imagem
 * exportada. O PNG que viaja para o README de outra pessoa continua limpo
 * (RFC 9.6), e por isso o renderizador não precisa deste campo.
 */
export interface Derivation {
  /** Chave i18n do que está sendo explicado ("Tipo", "PS", "Raridade"). */
  labelKey: string;
  /** O valor derivado, já pronto para exibir. */
  value: string;
  /** Chave i18n da frase de motivo. */
  reasonKey: string;
  /** Substituições da frase de motivo. */
  reasonParams?: Record<string, string | number>;
}

import type { Axis, AxisRating } from "./ratings";

export interface CardStat {
  /** Chave do dicionário i18n, não o rótulo já traduzido. */
  labelKey: string;
  value: number | string;
}
