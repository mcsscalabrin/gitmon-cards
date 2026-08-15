import { effectiveness } from "../cards/elements";
import { AXES } from "../cards/ratings";
import type { Card } from "../cards/types";
import type {
  DuelAction,
  DuelMonster,
  DuelResult,
  DuelStrike,
  DuelTurn,
  Position,
  Side,
} from "./types";

/**
 * Motor do duelo (sistema Yu-Gi-Oh, separado do `lib/battle/`).
 *
 * Puro e sem I/O: o client roda o mesmo código para animar o jogo, e o servidor
 * roda de novo na hora de salvar para arbitrar. Nada aqui acredita no que o outro
 * lado falou — a sequência é validada e recalculada.
 *
 * Dois consumidores de aleatoriedade, na ordem fixa: primeiro o sorteio de quem
 * começa, depois as escolhas da IA. A semente viaja no resultado, então um duelo
 * (dadas as ações do visitante) é sempre reproduzível.
 */

/** LP de partida de cada duelista. */
export const STARTING_LP = 8000;

/** Teto de segurança, contando as ações dos dois lados (como no sistema antigo). */
export const MAX_TURNS = 20;

/**
 * ATK/DEF derivados da assinatura do radar — nenhum número novo no domínio.
 *
 * ATK é o alcance + volume (o que o perfil entrega para fora), DEF é a
 * comunidade + veterania + amplitude (o que ele sustenta por dentro). O ×5 leva
 * as somas de eixos (0–99) para uma escala de cartas de verdade.
 */
export function monsterStats(card: Card): { atk: number; def: number } {
  const value = (axis: (typeof AXES)[number]) =>
    card.ratings?.find((r) => r.axis === axis)?.value ?? 0;
  return {
    atk: 5 * (value("reach") + value("volume")),
    def: 5 * (value("community") + value("veterancy") + value("breadth")),
  };
}

/** mulberry32: PRNG pequeno e determinístico. Não precisa ser criptográfico. */
export function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

/**
 * Quem começa, pela semente. Repete a questão Q7 do sistema antigo: revanche
 * entre os mesmos dois perfis não fica presa numa vantagem fixa de quem digitou.
 */
export function decideStarter(seed: number): Side {
  return rng(seed)() < 0.5 ? "a" : "b";
}

/**
 * A sessão do duelo: o PRNG e quem começa, decididos juntos.
 *
 * O starter é o **primeiro** número da sequência — o playDuel e o client usam
 * este mesmo factory para consumir exatamente na mesma ordem (ver playDuel:
 * "Dois consumidores de aleatoriedade"). `decideStarter` existe como atalho
 * isolado para testes, mas quem joga de verdade passa por aqui.
 */
export function duelSession(seed: number): { random: () => number; starter: Side } {
  const random = rng(seed);
  return { random, starter: random() < 0.5 ? "a" : "b" };
}

export interface DuelState {
  seed: number;
  starter: Side;
  turns: DuelTurn[];
  lp: Record<Side, number>;
  monsters: Record<Side, DuelMonster>;
  over: boolean;
  winner: Side | null;
  decidedBy: DuelResult["decidedBy"];
}

/** Campo inicial: os dois Gitmons em posição de ataque, LP cheio. */
export function startDuel(a: Card, b: Card, starter: Side, seed: number): DuelState {
  const monster = (card: Card): DuelMonster => ({
    card,
    position: "attack",
    destroyed: false,
  });
  return {
    seed,
    starter,
    turns: [],
    lp: { a: STARTING_LP, b: STARTING_LP },
    monsters: { a: monster(a), b: monster(b) },
    over: false,
    winner: null,
    decidedBy: "lp",
  };
}

const other = (side: Side): Side => (side === "a" ? "b" : "a");

/** Quem age no próximo turno: alterna a partir do starter. */
export function nextActor(state: DuelState): Side {
  return state.turns.length % 2 === 0 ? state.starter : other(state.starter);
}

/** ATK efetivo de um golpe: ATK da carta + dano do ataque escolhido. */
export function strikeAtk(card: Card, action: DuelAction): number {
  const base = monsterStats(card).atk;
  if (action.kind !== "attack" || action.attackIndex === undefined) return base;
  return base + (card.attacks[action.attackIndex]?.damage ?? 0);
}

function sameAction(a: DuelAction, b: DuelAction): boolean {
  if (a.kind === "attack" && b.kind === "attack") return a.attackIndex === b.attackIndex;
  if (a.kind === "position" && b.kind === "position") return a.to === b.to;
  return a.kind === b.kind;
}

/** As ações que um lado pode escolher no estado atual. O que a UI habilitar. */
export function legalActions(state: DuelState, side: Side): DuelAction[] {
  const monster = state.monsters[side];
  if (monster.destroyed) return [{ kind: "pass" }];

  const actions: DuelAction[] = [];
  if (monster.position === "attack") {
    if (monster.card.attacks.length === 0) {
      actions.push({ kind: "attack" });
    } else {
      monster.card.attacks.forEach((_, i) => actions.push({ kind: "attack", attackIndex: i }));
    }
  }
  for (const to of ["attack", "defense", "face-down"] as Position[]) {
    if (to !== monster.position) actions.push({ kind: "position", to });
  }
  actions.push({ kind: "pass" });
  return actions;
}

/**
 * O dano de batalha em si (Yu-Gi-Oh):
 *
 * - Defensor em ataque: ATK contra ATK. Maior vence e o perdedor toma a
 *   diferença no LP; empate destrói os dois sem dano.
 * - Defensor em defesa (face-up ou face-down revelado): ATK contra DEF. Romper o
 *   DEF destrói o defensor **sem dano ao LP**; não romper destrói o atacante, que
 *   toma a diferença.
 * - Sem monstro na frente: ataque direto, ATK inteiro no LP.
 *
 * A efetividade de tipo (×2/×0.5 da fraqueza impressa) multiplica só o dano.
 */
function resolveStrike(
  state: DuelState,
  attacker: Side,
  action: DuelAction,
): { strike: DuelStrike; monsters: Record<Side, DuelMonster> } {
  const defender = other(attacker);
  const attackerMonster = state.monsters[attacker];
  const defenderMonster = state.monsters[defender];

  const atk = strikeAtk(attackerMonster.card, action);
  const defenderStats = monsterStats(defenderMonster.card);
  const multiplier = effectiveness(attackerMonster.card.element, defenderMonster.card);

  const strike: DuelStrike = {
    attacker,
    attack:
      action.kind === "attack" && action.attackIndex !== undefined
        ? attackerMonster.card.attacks[action.attackIndex].name
        : null,
    atk,
    defendedBy: 0,
    defenderPosition: defenderMonster.position,
    multiplier,
    damageTo: null,
    damage: 0,
    destroyed: null,
    direct: false,
  };

  // Monstros novos; só o que o golpe mexe muda.
  const monsters: Record<Side, DuelMonster> = {
    a: { ...state.monsters.a },
    b: { ...state.monsters.b },
  };

  // Face-down revela ao ser atacado: vira e deita em defesa.
  if (defenderMonster.position === "face-down" && !defenderMonster.destroyed) {
    monsters[defender] = { ...monsters[defender], position: "defense" };
  }

  if (defenderMonster.destroyed) {
    strike.direct = true;
    strike.defendedBy = 0;
    strike.damage = Math.max(1, Math.round(atk * multiplier));
    strike.damageTo = defender;
  } else if (defenderMonster.position === "attack") {
    strike.defendedBy = defenderStats.atk;
    if (atk > defenderStats.atk) {
      strike.destroyed = defender;
      strike.damage = Math.max(1, Math.round((atk - defenderStats.atk) * multiplier));
      strike.damageTo = defender;
    } else if (atk < defenderStats.atk) {
      strike.destroyed = attacker;
      strike.damage = Math.max(1, Math.round((defenderStats.atk - atk) * multiplier));
      strike.damageTo = attacker;
    } else {
      strike.destroyed = "both";
    }
  } else {
    strike.defendedBy = defenderStats.def;
    if (atk > defenderStats.def) {
      strike.destroyed = defender;
      strike.damage = 0;
    } else if (atk < defenderStats.def) {
      strike.destroyed = attacker;
      strike.damage = Math.max(1, Math.round((defenderStats.def - atk) * multiplier));
      strike.damageTo = attacker;
    }
  }

  if (strike.destroyed === "a" || strike.destroyed === "both") {
    monsters.a = { ...monsters.a, destroyed: true };
  }
  if (strike.destroyed === "b" || strike.destroyed === "both") {
    monsters.b = { ...monsters.b, destroyed: true };
  }

  return { strike, monsters };
}

export type ApplyResult = { ok: true; state: DuelState } | { ok: false; reason: string };

/** Valida e aplica uma ação. O servidor depende disto para arbitrar. */
export function applyAction(state: DuelState, side: Side, action: DuelAction): ApplyResult {
  if (state.over) return { ok: false, reason: "duelo acabou" };
  if (nextActor(state) !== side) return { ok: false, reason: "não é o seu turno" };
  if (!legalActions(state, side).some((legal) => sameAction(legal, action))) {
    return { ok: false, reason: "ação ilegal" };
  }

  const monsters: Record<Side, DuelMonster> = {
    a: { ...state.monsters.a },
    b: { ...state.monsters.b },
  };
  const lp = { ...state.lp };
  let strike: DuelStrike | undefined;

  if (action.kind === "position") {
    monsters[side] = { ...monsters[side], position: action.to };
  } else if (action.kind === "attack") {
    const resolved = resolveStrike(state, side, action);
    strike = resolved.strike;
    monsters.a = resolved.monsters.a;
    monsters.b = resolved.monsters.b;
    if (strike.damageTo) {
      lp[strike.damageTo] = Math.max(0, lp[strike.damageTo] - strike.damage);
    }
  }

  const turn: DuelTurn = {
    index: state.turns.length + 1,
    actor: side,
    action,
    strike,
    lpAfter: { ...lp },
    monstersAfter: { a: { ...monsters.a }, b: { ...monsters.b } },
  };
  const turns = [...state.turns, turn];

  let over = false;
  let winner: Side | null = null;
  let decidedBy: DuelResult["decidedBy"] = "lp";
  if (lp.a <= 0) {
    winner = "b";
    decidedBy = "knockout";
    over = true;
  } else if (lp.b <= 0) {
    winner = "a";
    decidedBy = "knockout";
    over = true;
  } else if (turns.length >= MAX_TURNS) {
    winner = byRemainingLp(lp);
    decidedBy = "lp";
    over = true;
  }

  return {
    ok: true,
    state: { ...state, turns, lp, monsters, over, winner, decidedBy },
  };
}

/** Desempate no teto de turnos: maior % de LP restante. */
export function byRemainingLp(lp: Record<Side, number>): Side | null {
  const ratio = (side: Side) => lp[side] / STARTING_LP;
  const a = ratio("a");
  const b = ratio("b");
  if (a === b) return null;
  return a > b ? "a" : "b";
}

/**
 * A IA adversária. Heurística simples, não paranoica: ataca quando a troca vence
 * (ou está na frente de campo limpo), recua para a defesa quando a troca é ruim,
 * e volta a atacar quando a vantagem de LP permite. Consome o mesmo PRNG do duelo
 * para a variante pequena que quebra a leitura de sempre-a-mesma-jogada.
 */
export function aiChoose(state: DuelState, side: Side, random: () => number): DuelAction {
  const monster = state.monsters[side];
  if (monster.destroyed) return { kind: "pass" };

  const opponent = state.monsters[other(side)];
  const threat = opponent.destroyed ? 0 : opponent.position === "attack"
    ? monsterStats(opponent.card).atk
    : monsterStats(opponent.card).def;

  const attacks = legalActions(state, side).filter((a) => a.kind === "attack") as {
    kind: "attack";
    attackIndex?: number;
  }[];

  if (monster.position === "attack" && attacks.length > 0) {
    let best = attacks[0];
    let bestAtk = strikeAtk(monster.card, best);
    for (const candidate of attacks) {
      const atk = strikeAtk(monster.card, candidate);
      if (atk > bestAtk) {
        best = candidate;
        bestAtk = atk;
      }
    }

    const tradeWins = !opponent.destroyed && bestAtk > threat;
    const fieldOpen = opponent.destroyed;
    if (fieldOpen || (tradeWins && random() >= 0.15)) {
      return best;
    }
    // Troca desfavorável (ou a variante de 15%): defenda — de ataque, baixar
    // face-down é sempre legal.
    return { kind: "position", to: "face-down" };
  }

  // Em defesa/face-down: com vantagem de LP e campo aproveitável, volte a atacar.
  if (attacks.length > 0 && state.lp[side] > state.lp[other(side)] && random() < 0.7) {
    return { kind: "position", to: "attack" };
  }
  return { kind: "pass" };
}

/**
 * O duelo inteiro, dado a semente e as ações do visitante.
 *
 * É a função que o servidor roda na hora de salvar: a IA é recomputada na mesma
 * ordem de sorteios, então o resultado é autoritativo independente do que o
 * client mandou além da lista de ações. O client também usa esta função para
 * saber o desfecho antes de salvar — mesmo código, mesmo resultado.
 *
 * Lança se a lista de ações não bater com os turnos do visitante (faltar ou
 * sobrar), ou se alguma ação for ilegal.
 */
export function playDuel(
  a: Card,
  b: Card,
  seed: number,
  playerActions: DuelAction[],
  id: string,
  player: Side = "a",
): DuelResult {
  const { random, starter } = duelSession(seed);
  let state = startDuel(a, b, starter, seed);
  let consumed = 0;

  while (!state.over) {
    const actor = nextActor(state);
    let action: DuelAction;
    if (actor === player) {
      if (consumed >= playerActions.length) {
        throw new Error("duelo: faltou ação do visitante");
      }
      action = playerActions[consumed];
      consumed += 1;
    } else {
      action = aiChoose(state, actor, random);
    }

    const result = applyAction(state, actor, action);
    if (!result.ok) {
      throw new Error(
        `duelo: ação ilegal no turno ${state.turns.length + 1} (${result.reason})`,
      );
    }
    state = result.state;
  }

  if (consumed !== playerActions.length) {
    throw new Error("duelo: ações demais para os turnos jogados");
  }

  return {
    version: 1,
    id,
    seed,
    createdAt: new Date().toISOString(),
    a,
    b,
    starter,
    player,
    lp: state.lp,
    turns: state.turns,
    winner: state.winner,
    decidedBy: state.decidedBy,
  };
}
