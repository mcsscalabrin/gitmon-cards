import type { Element } from "@/lib/cards/types";
import type { Effect, YgoCard } from "./types";

/**
 * Elenco curado do Speed Duel. Separado do sistema de cartas de perfil: nada aqui
 * vem da API do GitHub em tempo real — stats e skills são balanceados à mão, e a
 * única dependência externa é o avatar (`https://github.com/<login>.png`), que é
 * a mesma natureza de `avatar_url` usado pelas cartas de perfil.
 *
 * Cada dev contribui com duas cartas: o **monstro** (o próprio dev) e a **skill**
 * (magia/armadilha com o efeito dele). O deck de cada lado é montado pelo motor:
 * 15 monstros + 5 skills sorteados desses dois pools.
 *
 * Balanceamento por camada: monstros fortes (Torvalds, Ryan Dahl, VoidZero)
 * existem para ser a fantasia do jogo, mas aparecem com pouca frequência porque
 * cada deck sorteia só 15 de 20.
 */

export interface RosterDev {
  login: string;
  name: string;
  element: Element;
  level: number;
  atk: number;
  def: number;
  skill: {
    name: string;
    kind: "spell" | "trap";
    effect: Effect;
    text: string;
  };
}

export const ROSTER: RosterDev[] = [
  {
    login: "torvalds",
    name: "Linus Torvalds",
    element: "fire",
    level: 7,
    atk: 3000,
    def: 2200,
    skill: {
      name: "Kernel Panic",
      kind: "spell",
      effect: { kind: "destroy", target: "opponent" },
      text: "Estoura o processo do oponente: destrua o monstro dele de maior ATK.",
    },
  },
  {
    login: "ry",
    name: "Ryan Dahl",
    element: "fire",
    level: 7,
    atk: 2800,
    def: 1900,
    skill: {
      name: "Event Loop",
      kind: "spell",
      effect: { kind: "draw", n: 2 },
      text: "Puxa tarefas da fila: compre 2 cartas.",
    },
  },
  {
    login: "voidzero",
    name: "VoidZero",
    element: "dragon",
    level: 6,
    atk: 2600,
    def: 1800,
    skill: {
      name: "Bundle Splitting",
      kind: "spell",
      effect: { kind: "search" },
      text: "Divide o bundle: busque um monstro do seu deck.",
    },
  },
  {
    login: "rauchg",
    name: "Guillermo Rauch",
    element: "steel",
    level: 6,
    atk: 2400,
    def: 2400,
    skill: {
      name: "Edge Network",
      kind: "spell",
      effect: { kind: "buff", target: "self", n: 500 },
      text: "Serve de perto: +500 ATK aos seus monstros neste turno.",
    },
  },
  {
    login: "gaearon",
    name: "Dan Abramov",
    element: "electric",
    level: 5,
    atk: 2300,
    def: 1700,
    skill: {
      name: "Hooks",
      kind: "spell",
      effect: { kind: "buff", target: "self", n: 300 },
      text: "Reutiliza estado: +300 ATK aos seus monstros neste turno.",
    },
  },
  {
    login: "sindresorhus",
    name: "Sindre Sorhus",
    element: "grass",
    level: 5,
    atk: 2200,
    def: 2000,
    skill: {
      name: "Awesome List",
      kind: "spell",
      effect: { kind: "draw", n: 1 },
      text: "Curadoria de verdade: compre 1 carta.",
    },
  },
  {
    login: "yyx990803",
    name: "Evan You",
    element: "electric",
    level: 5,
    atk: 2100,
    def: 1900,
    skill: {
      name: "Reactivity",
      kind: "spell",
      effect: { kind: "buff", target: "self", n: 300 },
      text: "Rastreia mudanças: +300 ATK aos seus monstros neste turno.",
    },
  },
  {
    login: "douglascrockford",
    name: "Douglas Crockford",
    element: "psychic",
    level: 5,
    atk: 2000,
    def: 2000,
    skill: {
      name: "JSON.stringify",
      kind: "spell",
      effect: { kind: "destroy", target: "opponent" },
      text: "Serializa e desmonta: destrua o monstro de maior ATK do oponente.",
    },
  },
  {
    login: "tj",
    name: "TJ Holowaychuk",
    element: "bug",
    level: 4,
    atk: 1900,
    def: 1500,
    skill: {
      name: "Middleware",
      kind: "spell",
      effect: { kind: "buff", target: "self", n: 200 },
      text: "Empilha camadas: +200 ATK aos seus monstros neste turno.",
    },
  },
  {
    login: "tannerlinsley",
    name: "Tanner Linsley",
    element: "electric",
    level: 4,
    atk: 1900,
    def: 1700,
    skill: {
      name: "TanStack Query",
      kind: "spell",
      effect: { kind: "draw", n: 1 },
      text: "Cacheia a resposta: compre 1 carta.",
    },
  },
  {
    login: "adamwathan",
    name: "Adam Wathan",
    element: "normal",
    level: 4,
    atk: 1800,
    def: 2000,
    skill: {
      name: "Utility Classes",
      kind: "spell",
      effect: { kind: "buff", target: "self", n: 300 },
      text: "Composição de classes: +300 ATK aos seus monstros neste turno.",
    },
  },
  {
    login: "fabpot",
    name: "Fabien Potencier",
    element: "poison",
    level: 4,
    atk: 1800,
    def: 1800,
    skill: {
      name: "Dependency Injection",
      kind: "spell",
      effect: { kind: "recover", target: "self", n: 800 },
      text: "Injeta dependências: recupere 800 LP.",
    },
  },
  {
    login: "kentcdodds",
    name: "Kent C. Dodds",
    element: "electric",
    level: 4,
    atk: 1700,
    def: 2100,
    skill: {
      name: "Testing Library",
      kind: "trap",
      effect: { kind: "counter" },
      text: "Quando seu monstro for atacado, o teste derruba o atacante.",
    },
  },
  {
    login: "pamelafox",
    name: "Pamela Fox",
    element: "water",
    level: 4,
    atk: 1700,
    def: 1900,
    skill: {
      name: "Python Modules",
      kind: "spell",
      effect: { kind: "burn", target: "opponent", n: 500 },
      text: "Importa tudo: cause 500 de dano ao oponente.",
    },
  },
  {
    login: "paulirish",
    name: "Paul Irish",
    element: "electric",
    level: 4,
    atk: 1600,
    def: 1800,
    skill: {
      name: "DevTools",
      kind: "trap",
      effect: { kind: "counter" },
      text: "Inspeciona o atacante e o remove: destrua o monstro que atacou.",
    },
  },
  {
    login: "addyosmani",
    name: "Addy Osmani",
    element: "electric",
    level: 4,
    atk: 1500,
    def: 2000,
    skill: {
      name: "Performance Audit",
      kind: "trap",
      effect: { kind: "negate" },
      text: "Audita o plano de batalha: neste turno, o oponente não pode atacar.",
    },
  },
  {
    login: "shadcn",
    name: "shadcn",
    element: "normal",
    level: 3,
    atk: 1500,
    def: 1500,
    skill: {
      name: "Copy-Paste",
      kind: "spell",
      effect: { kind: "buff", target: "self", n: 200 },
      text: "Cola direto no projeto: +200 ATK aos seus monstros neste turno.",
    },
  },
  {
    login: "jaredpalmer",
    name: "Jared Palmer",
    element: "electric",
    level: 3,
    atk: 1400,
    def: 1600,
    skill: {
      name: "Form Validation",
      kind: "trap",
      effect: { kind: "negate" },
      text: "Valida o ataque: neste turno, o oponente não pode atacar.",
    },
  },
  {
    login: "pewdiepie",
    name: "PewDiePie",
    element: "normal",
    level: 3,
    atk: 1300,
    def: 1300,
    skill: {
      name: "Subscribe",
      kind: "spell",
      effect: { kind: "recover", target: "self", n: 500 },
      text: "Milhões acompanham: recupere 500 LP.",
    },
  },
  {
    login: "bradtraversy",
    name: "Brad Traversy",
    element: "water",
    level: 3,
    atk: 1200,
    def: 1400,
    skill: {
      name: "Crash Course",
      kind: "spell",
      effect: { kind: "burn", target: "opponent", n: 400 },
      text: "Aula rápida: cause 400 de dano ao oponente.",
    },
  },
];

export const ROSTER_LOGINS: string[] = ROSTER.map((dev) => dev.login);

export function avatarUrl(login: string): string {
  return `https://github.com/${login}.png`;
}

export function monsterCard(dev: RosterDev): YgoCard {
  return {
    id: dev.login,
    name: dev.name,
    kind: "monster",
    element: dev.element,
    level: dev.level,
    atk: dev.atk,
    def: dev.def,
    text: `Level ${dev.level} · ${dev.atk} ATK · ${dev.def} DEF`,
    artUrl: avatarUrl(dev.login),
  };
}

export function skillCard(dev: RosterDev): YgoCard {
  return {
    id: `skill:${dev.login}`,
    name: dev.skill.name,
    kind: dev.skill.kind,
    effect: dev.skill.effect,
    text: dev.skill.text,
    artUrl: avatarUrl(dev.login),
  };
}

/** Pool de monstros e pool de skills — o motor sorteia 15 + 5 por lado. */
export const MONSTER_POOL: YgoCard[] = ROSTER.map(monsterCard);
export const SKILL_POOL: YgoCard[] = ROSTER.map(skillCard);
