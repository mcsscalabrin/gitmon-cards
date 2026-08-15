import type { Card } from "../cards/types";

/**
 * Domínio do duelo — o sistema novo de batalha estilo Yu-Gi-Oh, separado do
 * `lib/battle/` (RFC 7.3). Aqui o visitante **joga**: escolhe posição e ataque a
 * cada turno, e a IA adversária responde. O resultado completo (com as escolhas)
 * vira um link compartilhável, como no sistema antigo.
 */
export type Side = "a" | "b";

/**
 * Posição do Gitmon no campo. Ataque usa ATK e pode atacar; defesa usa DEF como
 * escudo e não ataca; `face-down` é defesa com o verso para cima, que **vira**
 * (revela, deitando em defesa) quando é atacado.
 */
export type Position = "attack" | "defense" | "face-down";

export interface DuelMonster {
  card: Card;
  position: Position;
  /** Destruído sai de campo: o LP do dono fica exposto a ataque direto. */
  destroyed: boolean;
}

/**
 * Ação de um turno. O ataque pode escolher um dos ataques da carta (por índice)
 * ou ir no golpe cru (carta sem ataques). Trocar de posição custa o turno.
 */
export type DuelAction =
  | { kind: "attack"; attackIndex?: number }
  | { kind: "position"; to: Position }
  | { kind: "pass" };

/** Resolução de um golpe — o dano de batalha à la Yu-Gi-Oh. */
export interface DuelStrike {
  /** Quem bateu. */
  attacker: Side;
  /** Nome do ataque usado; `null` para golpe cru (carta sem ataques). */
  attack: string | null;
  /** ATK efetivo do atacante: ATK da carta + dano do ataque escolhido. */
  atk: number;
  /** O que o defensor usou na troca: ATK (posição de ataque) ou DEF. */
  defendedBy: number;
  /** Posição do defensor no momento do golpe (`face-down` revelou ao ser atacado). */
  defenderPosition: Position;
  /** 2 super efetivo, 0.5 resistido, 1 normal — da fraqueza impressa na carta. */
  multiplier: number;
  /** Quem perdeu LP com o dano; `null` quando ninguém perde (rompeu DEF, empate). */
  damageTo: Side | null;
  /** Dano final aplicado ao LP. `0` quando o golpe não arranha ninguém. */
  damage: number;
  /** Quem foi destruído: o atacante, o defensor, ambos, ou ninguém. */
  destroyed: Side | "both" | null;
  /** Golpe direto no LP — o defensor estava sem monstro em campo. */
  direct: boolean;
}

export interface DuelTurn {
  /** 1-based, contando as ações dos dois lados. */
  index: number;
  actor: Side;
  action: DuelAction;
  strike?: DuelStrike;
  lpAfter: Record<Side, number>;
  monstersAfter: Record<Side, DuelMonster>;
}

export interface DuelResult {
  version: 1;
  id: string;
  /**
   * Semente do sorteio. Com ela e a lista de ações do visitante o duelo é
   * reproduzível — a IA consome o mesmo PRNG na mesma ordem.
   */
  seed: number;
  createdAt: string;
  a: Card;
  b: Card;
  /** Quem deu o primeiro passo, sorteado pela semente. */
  starter: Side;
  /** Quem jogou do lado "a": sempre o visitante. */
  player: Side;
  /** LP final, com o perdedor em 0. */
  lp: Record<Side, number>;
  turns: DuelTurn[];
  winner: Side | null;
  /** `knockout` = LP zerou; `lp` = teto de turnos, maior % de LP restante. */
  decidedBy: "knockout" | "lp";
}
