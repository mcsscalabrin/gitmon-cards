import type { Element } from "@/lib/cards/types";

/**
 * Domínio do duelo Speed Duel (estilo Duel Links). Separado do sistema de cartas
 * de perfil: as cartas vêm de um elenco curado de devs do GitHub
 * (`./roster.ts`), não do gerador de cartas de perfil.
 */

export type Side = "a" | "b";
export const SIDES: Side[] = ["a", "b"];

export type MonsterPosition = "attack" | "defense" | "face-down";
export type Phase = "draw" | "main" | "battle" | "end";

export type CardKind = "monster" | "spell" | "trap";

/** Alvo de um efeito, relativo a quem ativa a carta. */
export type SideChoice = "self" | "opponent";

/**
 * Efeitos de magias e armadilhas — o "skill" de cada dev. Todos determinísticos:
 * nenhum consome o PRNG do duelo, então a mesma escolha de IA se reproduz igual
 * no client e no servidor (lockstep).
 */
export type Effect =
  | { kind: "draw"; n: number }
  | { kind: "buff"; target: SideChoice; n: number }
  | { kind: "destroy"; target: SideChoice }
  | { kind: "burn"; target: SideChoice; n: number }
  | { kind: "recover"; target: SideChoice; n: number }
  | { kind: "search" }
  | { kind: "negate" }
  | { kind: "counter" };

export interface YgoCard {
  /** Login do dev. Identidade estável (ex.: `torvalds`). */
  id: string;
  name: string;
  kind: CardKind;
  /** Atributo visual do monstro (nenhum efeito de combate — YGO puro). */
  element?: Element;
  /** Estrelas de nível, 1 a 8. Só monstros. */
  level?: number;
  atk?: number;
  def?: number;
  effect?: Effect;
  /** Descrição do skill (magias/armadilhas) ou flavor. */
  text: string;
  /** Avatar do dev. Monstros usam na arte; skills podem ser vazias. */
  artUrl: string;
}

export interface FieldMonster {
  card: YgoCard;
  position: MonsterPosition;
  /** Já atacou nesta fase de batalha (reset no início da fase do dono). */
  attacked: boolean;
}

export interface FieldST {
  card: YgoCard;
  face: "up" | "down";
}

export interface PlayerField {
  lp: number;
  /** Ordem restante (índice 0 = topo). */
  deck: YgoCard[];
  hand: YgoCard[];
  monsters: (FieldMonster | null)[];
  /** Zonas de magia/armadilha: armadilhas ficam viradas, magias passam direto. */
  st: (FieldST | null)[];
  grave: YgoCard[];
  /** Invocação normal já usada neste turno (1 por turno, como no YGO). */
  summoned: boolean;
}

export interface YgoState {
  seed: number;
  starter: Side;
  actor: Side;
  phase: Phase;
  /** Número do turno (incrementa no Draw de quem começa o turno). */
  turn: number;
  field: Record<Side, PlayerField>;
  /**
   * Bônus de ATK por lado aplicado neste turno (efeito `buff`). O `buffTurn`
   * marca em qual turno foi aplicado — expira sozinho quando o turno avança.
   */
  buff: Record<Side, number>;
  buffTurn: Record<Side, number>;
  /** Ataques de um lado negados até o fim do turno (armadilha `negate`). */
  negateTurn: Record<Side, number>;
  /** Janela de armadilha: antes da Fase de Batalha do atacante, o defensor vira. */
  window: "trap" | null;
  windowFor: Side | null;
  steps: YgoLogStep[];
  over: boolean;
  winner: Side | null;
  decidedBy: "knockout" | "deckout" | "timeout";
}

export type YgoAction =
  /** Invoca monstro da mão numa zona vazia. */
  | { kind: "summon"; handIndex: number; position: MonsterPosition }
  /** Ativa magia da mão (efeito resolve na hora, carta vai ao cemitério). */
  | { kind: "spell"; handIndex: number }
  /** Baixa armadilha virada para baixo numa zona S/T vazia. */
  | { kind: "setTrap"; handIndex: number }
  /** Ativa armadilha virada já em campo. */
  | { kind: "trap"; zone: number }
  /** Vira monstro próprio face-down para defesa. */
  | { kind: "flip"; zone: number }
  /** Ataque a um monstro do oponente. */
  | { kind: "attack"; zone: number; targetZone: number }
  /** Ataque direto ao LP (só com o campo do oponente vazio). */
  | { kind: "directAttack"; zone: number }
  /** Avança de fase, ou encerra a janela de armadilha. */
  | { kind: "pass" };

export interface FieldSnapshot {
  monsters: ({ card: YgoCard; position: MonsterPosition } | null)[];
  st: ({ card: YgoCard; face: "up" | "down" } | null)[];
  grave: YgoCard[];
  hand: YgoCard[];
  deckCount: number;
}

export interface YgoStrike {
  attacker: Side;
  zone: number;
  /** `null` = ataque direto. */
  targetZone: number | null;
  targetPosition: MonsterPosition | null;
  /** Dano causado ao LP (0 se não houve). */
  damage: number;
  destroyed: "attacker" | "defender" | "both" | null;
  /** Nomes na hora do ataque, para narrar sem depender do estado final. */
  attackerName?: string;
  targetName?: string;
}

export interface YgoLogStep {
  turn: number;
  actor: Side;
  phase: Phase;
  action: YgoAction | "start";
  strike: YgoStrike | null;
  /** Carta envolvida (invocação, magia, armadilha ou flip) — só quando existe. */
  cardName?: string;
  lp: Record<Side, number>;
  a: FieldSnapshot;
  b: FieldSnapshot;
}

export interface YgoResult {
  version: 2;
  id: string;
  seed: number;
  starter: Side;
  /** Rótulos escolhidos pelo visitante para os dois lados (ex.: "Você" vs "IA"). */
  players: { a: string; b: string };
  /** As duas cartas de cada lado, para o replay ser autocontido. */
  a: YgoCard[];
  b: YgoCard[];
  log: YgoLogStep[];
  winner: Side | null;
  decidedBy: "knockout" | "deckout" | "timeout";
}
