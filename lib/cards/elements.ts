import palette from "./palette.json";
import type { Card, Element } from "./types";

/**
 * Fraqueza e resistência de cada tipo.
 *
 * Segue o quadro real do Pokémon, reduzido ao que cabe na carta: **uma**
 * fraqueza e **uma** resistência por tipo, escolhidas entre as do quadro oficial.
 * A carta tem um slot de cada — a tabela 18×18 inteira não caberia nem faria
 * diferença numa batalha de dois ataques.
 *
 * Duas leituras que exigiram decisão:
 *
 * - `normal` e `dark` resistem a `ghost` porque no jogo são **imunes** a ele.
 *   Imunidade é a resistência mais forte que existe, então vira a resistência
 *   impressa.
 * - `ice` fica sem resistência. No quadro oficial ele só resiste a `ice`, e uma
 *   carta que resiste ao próprio tipo lê como defeito, não como regra.
 */
export const ELEMENT_CHAIN: Record<
  Element,
  { weakTo: Element | null; resists: Element | null }
> = {
  normal: { weakTo: "fighting", resists: "ghost" },
  fire: { weakTo: "water", resists: "grass" },
  water: { weakTo: "electric", resists: "fire" },
  grass: { weakTo: "fire", resists: "water" },
  electric: { weakTo: "ground", resists: "flying" },
  ice: { weakTo: "fire", resists: null },
  fighting: { weakTo: "psychic", resists: "rock" },
  poison: { weakTo: "psychic", resists: "grass" },
  ground: { weakTo: "water", resists: "poison" },
  flying: { weakTo: "electric", resists: "grass" },
  psychic: { weakTo: "dark", resists: "fighting" },
  bug: { weakTo: "fire", resists: "grass" },
  rock: { weakTo: "water", resists: "fire" },
  ghost: { weakTo: "dark", resists: "poison" },
  dragon: { weakTo: "fairy", resists: "fire" },
  dark: { weakTo: "fighting", resists: "ghost" },
  steel: { weakTo: "fire", resists: "grass" },
  fairy: { weakTo: "poison", resists: "fighting" },
};

export interface ElementColors {
  base: string;
  dark: string;
  light: string;
  ink: string;
}

/**
 * Cor de identidade de cada elemento. A definição mora em `palette.json` porque o
 * gerador de arte (`scripts/build-assets.mjs`) lê o mesmo arquivo — moldura e
 * interface recoloridas por duas fontes diferentes seria erro garantido.
 */
export const ELEMENT_COLORS = palette as unknown as Record<Element, ElementColors>;

/**
 * Linguagem do GitHub → tipo.
 *
 * O agrupamento é temático, não técnico — o que a linguagem *representa* na
 * cultura de quem escreve, não sua taxonomia formal. Com 18 tipos dá para
 * separar coisas que antes colapsavam: infraestrutura declarativa (`steel`)
 * deixou de ser a mesma coisa que shell (`ground`), e verificação formal
 * (`ice`) deixou de ser a mesma coisa que funcional (`psychic`).
 *
 * Todo tipo tem pelo menos uma linguagem — um tipo inalcançável seria um ícone
 * que nunca aparece. Coberto por `tests/unit/elements.test.ts`.
 *
 * TODO(Q8): reconciliar com o mapa do protótipo (`reference/github-card-prototype.html`)
 * quando ele estiver disponível — a RFC 6.1 trata aquele mapa como fonte.
 */
export const LANGUAGE_ELEMENTS: Record<string, Element> = {
  // fire — sistemas, performance, baixo nível
  c: "fire",
  "c++": "fire",
  rust: "fire",
  zig: "fire",
  assembly: "fire",
  cuda: "fire",

  // water — dados, científico, consulta
  python: "water",
  r: "water",
  julia: "water",
  matlab: "water",
  sql: "water",
  plpgsql: "water",
  "jupyter notebook": "water",

  // grass — concorrência e ecossistemas que crescem sozinhos
  go: "grass",
  elixir: "grass",
  erlang: "grass",
  crystal: "grass",

  // electric — web, front-end, tempo real
  javascript: "electric",
  typescript: "electric",
  vue: "electric",
  svelte: "electric",
  astro: "electric",
  coffeescript: "electric",

  // ice — verificação formal: prova antes de rodar, tudo congelado no tipo
  coq: "ice",
  agda: "ice",
  idris: "ice",
  lean: "ice",
  tla: "ice",
  "isabelle": "ice",

  // fighting — plataformas corporativas e runtimes pesados
  java: "fighting",
  "c#": "fighting",
  kotlin: "fighting",
  groovy: "fighting",
  visualbasic: "fighting",
  "visual basic .net": "fighting",

  // poison — fama de armadilha: poderosas e fáceis de usar errado
  php: "poison",
  perl: "poison",

  // ground — shell e automação de sistema, o chão onde tudo roda
  shell: "ground",
  powershell: "ground",
  batchfile: "ground",
  fish: "ground",
  zsh: "ground",
  awk: "ground",

  // flying — mobile e multiplataforma, código que viaja
  swift: "flying",
  "objective-c": "flying",
  dart: "flying",

  // psychic — funcional, simbólico, abstrato
  haskell: "psychic",
  clojure: "psychic",
  ocaml: "psychic",
  "f#": "psychic",
  elm: "psychic",
  "emacs lisp": "psychic",
  "common lisp": "psychic",
  scheme: "psychic",
  racket: "psychic",
  prolog: "psychic",

  // bug — ferramentas pequenas e cola entre programas
  tcl: "bug",
  sed: "bug",
  m4: "bug",
  gnuplot: "bug",

  // rock — legado sólido, décadas de pé
  fortran: "rock",
  cobol: "rock",
  ada: "rock",
  pascal: "rock",
  delphi: "rock",
  "objectpascal": "rock",

  // ghost — o que assombra o editor: metaprogramação e configuração viva
  "vim script": "ghost",
  "vim snippet": "ghost",
  "emacs lisp ": "ghost",

  // dragon — grandes, poderosas e difíceis de domar
  scala: "dragon",
  nim: "dragon",
  d: "dragon",
  chapel: "dragon",

  // dark — contratos e código irreversível: erro aqui não tem rollback
  solidity: "dark",
  vyper: "dark",
  hack: "dark",

  // steel — infraestrutura declarativa, a estrutura que sustenta o resto
  dockerfile: "steel",
  makefile: "steel",
  cmake: "steel",
  hcl: "steel",
  nix: "steel",
  yaml: "steel",
  toml: "steel",
  starlark: "steel",

  // fairy — linguagens feitas para a alegria de quem escreve
  ruby: "fairy",
  lua: "fairy",
  processing: "fairy",

  // normal — marcação, estilo e texto: o tecido do resto
  html: "normal",
  css: "normal",
  scss: "normal",
  less: "normal",
  mdx: "normal",
  markdown: "normal",
  roff: "normal",
  tex: "normal",
  xml: "normal",
};

/** Tipo de uma linguagem do GitHub. Linguagem desconhecida ou ausente → `normal`. */
export function elementForLanguage(language: string | null | undefined): Element {
  if (!language) return "normal";
  return LANGUAGE_ELEMENTS[language.toLowerCase()] ?? "normal";
}

/**
 * Multiplicador de efetividade de um ataque (RFC 7.3, item 3).
 *
 * Lê a fraqueza/resistência **impressa na carta defensora**, não a cadeia genérica:
 * a fraqueza de uma carta de perfil vem da segunda linguagem do dev (RFC 6.1), que
 * pode divergir da cadeia. A carta é a fonte da verdade, como no TCG de verdade.
 */
export function effectiveness(attacker: Element, defender: Card): number {
  if (defender.weakness === attacker) return 2;
  if (defender.resistance === attacker) return 0.5;
  return 1;
}
