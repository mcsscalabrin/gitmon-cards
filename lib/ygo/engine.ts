import { MONSTER_POOL, SKILL_POOL } from "./roster";
import type {
  Effect,
  FieldMonster,
  FieldSnapshot,
  MonsterPosition,
  PlayerField,
  Side,
  YgoAction,
  YgoCard,
  YgoResult,
  YgoState,
  YgoStrike,
} from "./types";

/**
 * Motor do Speed Duel (estilo Duel Links), separado do sistema de cartas de
 * perfil. Puro e sem I/O: o client roda o mesmo código para animar, e o servidor
 * re-executa na hora de arbitrar. Nada aqui acredita no que o outro lado falou.
 *
 * Aleatoriedade na ordem fixa: quem começa, shuffle dos dois decks, e as decisões
 * da IA (só em desempates). As ações do visitante nunca consomem o PRNG, então
 * client e servidor consomem exatamente a mesma sequência — o mesmo lockstep do
 * sistema anterior.
 */

export const STARTING_LP = 4000;
export const DECK_SIZE = 20;
export const OPENING_HAND = 4;
export const HAND_LIMIT = 6;
export const MONSTER_ZONES = 3;
export const ST_ZONES = 3;
export const MAX_TURNS = 40;
const MAX_STEPS = 2000;
/**
 * Teto do que o visitante pode mandar num duelo inteiro: 16 ações por turno é
 * mais que o máximo real (invocar, magias, armadilhas, ataques, passes), e o
 * corpo da API não precisa aceitar mais que isso.
 */
export const MAX_ACTIONS = MAX_TURNS * 16;

/** mulberry32: o mesmo PRNG pequeno e determinístico do duelo anterior. */
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

/** A sessão: quem começa é o primeiro número do PRNG, como nos sistemas anteriores. */
export function duelSession(seed: number): { random: () => number; starter: Side } {
  const random = rng(seed);
  return { random, starter: random() < 0.5 ? "a" : "b" };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

/** Deck de 20: 15 monstros + 5 skills sorteados dos pools do elenco. */
export function buildDeck(random: () => number): YgoCard[] {
  const monsters = shuffle(MONSTER_POOL, random).slice(0, 15);
  const skills = shuffle(SKILL_POOL, random).slice(0, DECK_SIZE - 15);
  return shuffle([...monsters, ...skills], random);
}

const emptyField = (): PlayerField => ({
  lp: STARTING_LP,
  deck: [],
  hand: [],
  monsters: [null, null, null],
  st: [null, null, null],
  grave: [],
  summoned: false,
});

export function snapshot(field: PlayerField): FieldSnapshot {
  return {
    monsters: field.monsters.map((m) =>
      m ? { card: m.card, position: m.position } : null,
    ),
    st: field.st.map((s) => (s ? { card: s.card, face: s.face } : null)),
    grave: field.grave,
    hand: field.hand,
    deckCount: field.deck.length,
  };
}

export function newDuel(seed: number): { state: YgoState; random: () => number; starter: Side } {
  const { random, starter } = duelSession(seed);

  const deal = (): PlayerField => {
    const field = emptyField();
    field.deck = buildDeck(random);
    field.hand = field.deck.splice(0, OPENING_HAND);
    return field;
  };

  const field = { a: deal(), b: deal() };
  const state: YgoState = {
    seed,
    starter,
    actor: starter,
    phase: "main",
    turn: 1,
    field,
    buff: { a: 0, b: 0 },
    buffTurn: { a: 0, b: 0 },
    negateTurn: { a: 0, b: 0 },
    window: null,
    windowFor: null,
    steps: [],
    over: false,
    winner: null,
    decidedBy: "timeout",
  };
  pushStep(state, "start");
  return { state, random, starter };
}

const other = (side: Side): Side => (side === "a" ? "b" : "a");

/** Quem pode agir agora: no turno do dono, ou o defensor na janela de armadilha. */
export function actingSide(state: YgoState): Side {
  return state.window ? (state.windowFor ?? state.actor) : state.actor;
}

export function effectiveAtk(state: YgoState, side: Side, card: YgoCard): number {
  const buff = state.buffTurn[side] === state.turn ? state.buff[side] : 0;
  return (card.atk ?? 0) + buff;
}

function pushStep(
  state: YgoState,
  action: YgoAction | "start",
  strike: YgoStrike | null = null,
  cardName?: string,
) {
  state.steps.push({
    turn: state.turn,
    actor: actingSide(state),
    phase: state.phase,
    action,
    strike,
    cardName,
    lp: { a: state.field.a.lp, b: state.field.b.lp },
    a: snapshot(state.field.a),
    b: snapshot(state.field.b),
  });
}

function finish(state: YgoState, winner: Side | null, decidedBy: YgoResult["decidedBy"]) {
  state.over = true;
  state.winner = winner;
  state.decidedBy = decidedBy;
  pushStep(state, { kind: "pass" });
}

/**
 * O dano de um ataque — YGO puro, sem efetividade de tipo (D25).
 *
 * - Defensor em ataque: ATK contra ATK. Maior vence, o perdedor toma a diferença
 *   no LP; empate destrói os dois sem dano.
 * - Defensor em defesa (face-up ou face-down revelado): ATK contra DEF. Romper
 *   destrói o defensor sem dano de LP; não romper destrói o atacante, também sem
 *   dano (sem pierce na v1).
 * - Campo vazio: ataque direto, ATK inteiro no LP.
 */
function strike(state: YgoState, attacker: Side, zone: number, targetZone: number | null): YgoStrike {
  const attackerCard = state.field[attacker].monsters[zone]!.card;
  const atk = effectiveAtk(state, attacker, attackerCard);
  const defender = other(attacker);
  const target = targetZone !== null ? state.field[defender].monsters[targetZone] : null;

  const result: YgoStrike = {
    attacker,
    zone,
    targetZone,
    targetPosition: target ? target.position : null,
    damage: 0,
    destroyed: null,
    attackerName: attackerCard.name,
    targetName: target ? target.card.name : undefined,
  };

  if (!target) {
    result.damage = atk;
    return result;
  }

  // Face-down revela ao ser atacado: vira para a defesa antes do cálculo.
  if (target.position === "face-down") {
    state.field[defender].monsters[targetZone!] = { ...target, position: "defense" };
    result.targetPosition = "defense";
  }

  if (target.position === "attack") {
    const tAtk = effectiveAtk(state, defender, target.card);
    if (atk > tAtk) {
      result.destroyed = "defender";
      result.damage = atk - tAtk;
    } else if (atk < tAtk) {
      result.destroyed = "attacker";
      result.damage = tAtk - atk;
    } else {
      result.destroyed = "both";
    }
  } else {
    const tDef = target.card.def ?? 0;
    if (atk > tDef) result.destroyed = "defender";
    else if (atk < tDef) result.destroyed = "attacker";
  }
  return result;
}

function applyStrike(state: YgoState, attacker: Side, info: YgoStrike) {
  const defender = other(attacker);
  const attackerMonster = state.field[attacker].monsters[info.zone];
  if (attackerMonster) attackerMonster.attacked = true;

  const remove = (side: Side, zone: number) => {
    const m = state.field[side].monsters[zone];
    if (m) {
      state.field[side].grave.push(m.card);
      state.field[side].monsters[zone] = null;
    }
  };

  if (info.targetZone !== null && info.destroyed !== null) {
    if (info.destroyed === "defender" || info.destroyed === "both") {
      remove(defender, info.targetZone);
    }
    if (info.destroyed === "attacker" || info.destroyed === "both") {
      remove(attacker, info.zone);
    }
  }

  if (info.damage > 0) {
    const victim = info.destroyed === "attacker" ? attacker : defender;
    state.field[victim].lp = Math.max(0, state.field[victim].lp - info.damage);
  }
}

export type ApplyResult = { ok: true; state: YgoState } | { ok: false; reason: string };

const err = (reason: string): ApplyResult => ({ ok: false, reason });

export function legalActions(state: YgoState, side: Side): YgoAction[] {
  if (state.over) return [];
  if (side !== actingSide(state)) return [];

  if (state.window) {
    const actions: YgoAction[] = [];
    state.field[side].st.forEach((s, i) => {
      if (s && s.face === "down" && s.card.kind === "trap") actions.push({ kind: "trap", zone: i });
    });
    actions.push({ kind: "pass" });
    return actions;
  }

  if (state.phase === "main") {
    const actions: YgoAction[] = [];
    const field = state.field[side];
    const freeZone = field.monsters.some((m) => !m);
    if (!field.summoned && freeZone) {
      field.hand.forEach((card, handIndex) => {
        if (card.kind !== "monster") return;
        actions.push({ kind: "summon", handIndex, position: "attack" });
        actions.push({ kind: "summon", handIndex, position: "defense" });
        actions.push({ kind: "summon", handIndex, position: "face-down" });
      });
    }
    field.hand.forEach((card, handIndex) => {
      if (card.kind === "spell") actions.push({ kind: "spell", handIndex });
      if (card.kind === "trap" && field.st.some((s) => !s)) {
        actions.push({ kind: "setTrap", handIndex });
      }
    });
    field.st.forEach((s, i) => {
      if (s && s.face === "down" && s.card.kind === "trap") actions.push({ kind: "trap", zone: i });
    });
    field.monsters.forEach((m, i) => {
      if (m && m.position === "face-down") actions.push({ kind: "flip", zone: i });
    });
    actions.push({ kind: "pass" });
    return actions;
  }

  if (state.phase === "battle") {
    const actions: YgoAction[] = [];
    const field = state.field[side];
    const negated = state.negateTurn[side] === state.turn;
    field.monsters.forEach((m, i) => {
      if (!m || m.position !== "attack" || m.attacked || negated) return;
      const enemyZones = state.field[other(side)].monsters;
      if (enemyZones.every((o) => !o)) {
        actions.push({ kind: "directAttack", zone: i });
      } else {
        enemyZones.forEach((o, j) => {
          if (o) actions.push({ kind: "attack", zone: i, targetZone: j });
        });
      }
    });
    actions.push({ kind: "pass" });
    return actions;
  }

  return [{ kind: "pass" }];
}

function sameAction(a: YgoAction, b: YgoAction): boolean {
  switch (a.kind) {
    case "summon":
      return b.kind === "summon" && a.handIndex === b.handIndex && a.position === b.position;
    case "spell":
      return b.kind === "spell" && a.handIndex === b.handIndex;
    case "setTrap":
      return b.kind === "setTrap" && a.handIndex === b.handIndex;
    case "trap":
      return b.kind === "trap" && a.zone === b.zone;
    case "flip":
      return b.kind === "flip" && a.zone === b.zone;
    case "attack":
      return b.kind === "attack" && a.zone === b.zone && a.targetZone === b.targetZone;
    case "directAttack":
      return b.kind === "directAttack" && a.zone === b.zone;
    case "pass":
      return b.kind === "pass";
  }
}

function resolveEffect(state: YgoState, caster: Side, effect: Effect) {
  const self = state.field[caster];
  const targetSide = "target" in effect && effect.target === "self" ? caster : other(caster);
  const target = state.field[targetSide];

  switch (effect.kind) {
    case "draw":
      for (let i = 0; i < effect.n; i++) drawOne(state, caster);
      break;
    case "buff":
      state.buff[targetSide] += effect.n;
      state.buffTurn[targetSide] = state.turn;
      break;
    case "destroy": {
      const m = strongestMonster(target);
      if (m) {
        target.grave.push(m.m.card);
        target.monsters[m.i] = null;
      }
      break;
    }
    case "burn":
      target.lp = Math.max(0, target.lp - effect.n);
      break;
    case "recover":
      target.lp = Math.min(STARTING_LP, target.lp + effect.n);
      break;
    case "search": {
      const found = self.deck.findIndex((c) => c.kind === "monster");
      if (found === -1) break;
      const [card] = self.deck.splice(found, 1);
      if (self.hand.length >= HAND_LIMIT) self.grave.push(card);
      else self.hand.push(card);
      self.grave.push(...self.deck.splice(0, found));
      break;
    }
    case "negate":
      state.negateTurn[targetSide] = state.turn;
      break;
    case "counter": {
      const m = strongestMonster(target, "attack");
      if (m) {
        target.grave.push(m.m.card);
        target.monsters[m.i] = null;
      }
      break;
    }
  }
}

function strongestMonster(
  field: PlayerField,
  onlyAttack?: MonsterPosition,
): { m: FieldMonster; i: number } | null {
  const candidates = field.monsters
    .map((m, i) => (m ? { m, i } : null))
    .filter((x): x is { m: FieldMonster; i: number } => x !== null)
    .filter((x) => !onlyAttack || x.m.position === onlyAttack);
  candidates.sort((a, b) => b.m.card.atk! - a.m.card.atk! || a.i - b.i);
  return candidates[0] ?? null;
}

function drawOne(state: YgoState, side: Side) {
  const field = state.field[side];
  const card = field.deck.shift();
  if (!card) return;
  if (field.hand.length >= HAND_LIMIT) field.grave.push(card);
  else field.hand.push(card);
}

/** Nenhum monstro em pé, ou ataques negados → sem Fase de Batalha útil. */
function canBattle(state: YgoState, side: Side): boolean {
  if (state.negateTurn[side] === state.turn) return false;
  return state.field[side].monsters.some((m) => m && m.position === "attack");
}

function startNextTurn(state: YgoState) {
  if (state.turn >= MAX_TURNS) {
    const a = state.field.a.lp / STARTING_LP;
    const b = state.field.b.lp / STARTING_LP;
    finish(state, a === b ? null : a > b ? "a" : "b", "timeout");
    return;
  }
  state.turn += 1;
  state.actor = other(state.actor);
  state.window = null;
  state.windowFor = null;
  state.phase = "draw";

  const side = state.actor;
  const field = state.field[side];
  field.summoned = false;
  field.monsters.forEach((m) => {
    if (m) m.attacked = false;
  });

  if (field.deck.length === 0) {
    finish(state, other(side), "deckout");
    return;
  }
  drawOne(state, side);
  state.phase = "main";
  pushStep(state, "start");
}

export function applyAction(state: YgoState, side: Side, action: YgoAction): ApplyResult {
  if (state.over) return err("duelo já acabou");
  if (actingSide(state) !== side) return err("não é a sua vez");
  if (!legalActions(state, side).some((legal) => sameAction(legal, action))) {
    return err("ação ilegal");
  }

  const field = state.field[side];

  if (state.window) {
    if (action.kind === "trap") {
      const st = field.st[action.zone];
      const card = st!.card;
      resolveEffect(state, side, card.effect!);
      field.st[action.zone] = null;
      field.grave.push(card);
      pushStep(state, action, null, card.name);
    } else {
      state.window = null;
      state.windowFor = null;
      state.phase = "battle";
      pushStep(state, action);
    }
    return { ok: true, state };
  }

  if (state.phase === "main") {
    if (action.kind === "summon") {
      const card = field.hand.splice(action.handIndex, 1)[0];
      const zone = field.monsters.findIndex((m) => !m);
      field.monsters[zone] = { card, position: action.position, attacked: false };
      field.summoned = true;
      pushStep(state, action, null, card.name);
    } else if (action.kind === "spell") {
      const card = field.hand.splice(action.handIndex, 1)[0];
      resolveEffect(state, side, card.effect!);
      field.grave.push(card);
      pushStep(state, action, null, card.name);
    } else if (action.kind === "setTrap") {
      const card = field.hand.splice(action.handIndex, 1)[0];
      const zone = field.st.findIndex((s) => !s);
      field.st[zone] = { card, face: "down" };
      pushStep(state, action, null, card.name);
    } else if (action.kind === "trap") {
      const st = field.st[action.zone];
      const card = st!.card;
      resolveEffect(state, side, card.effect!);
      field.st[action.zone] = null;
      field.grave.push(card);
      pushStep(state, action, null, card.name);
    } else if (action.kind === "flip") {
      const m = field.monsters[action.zone]!;
      field.monsters[action.zone] = { ...m, position: "defense" };
      pushStep(state, action, null, m.card.name);
    } else {
      // pass: main → batalha (se houver como atacar) ou fim do turno.
      const defender = other(side);
      if (canBattle(state, side)) {
        const defenderHasTraps = state.field[defender].st.some(
          (s) => s && s.face === "down" && s.card.kind === "trap",
        );
        if (defenderHasTraps) {
          state.window = "trap";
          state.windowFor = defender;
        } else {
          state.phase = "battle";
        }
      } else {
        state.phase = "end";
      }
      pushStep(state, action);
    }
    return { ok: true, state };
  }

  if (state.phase === "battle") {
    if (action.kind === "attack" || action.kind === "directAttack") {
      const targetZone = action.kind === "attack" ? action.targetZone : null;
      const info = strike(state, side, action.zone, targetZone);
      applyStrike(state, side, info);
      pushStep(state, action, info);
      if (state.field[other(side)].lp <= 0) {
        finish(state, side, "knockout");
      } else if (state.field[side].lp <= 0) {
        finish(state, other(side), "knockout");
      }
      return { ok: true, state };
    }
    state.phase = "end";
    pushStep(state, action);
    return { ok: true, state };
  }

  startNextTurn(state);
  return { ok: true, state };
}

/**
 * A IA do lado B. Heurística simples: invoca o monstro mais forte, ativa magias
 * úteis, arma armadilhas, ataca o alvo que destrói (ou direto), e não se sacrifica
 * em troca ruim. Desempates consomem o PRNG — client e servidor na mesma ordem.
 */
export function aiAct(state: YgoState, side: Side, random: () => number): YgoAction {
  const field = state.field[side];
  const enemy = state.field[other(side)];

  if (state.window) {
    const traps = field.st
      .map((s, i) => (s && s.face === "down" && s.card.kind === "trap" ? i : -1))
      .filter((i) => i >= 0);
    const useful = traps.find((i) => {
      const effect = field.st[i]!.card.effect!;
      if (effect.kind === "negate") return canBattle(state, other(side));
      if (effect.kind === "counter") return enemy.monsters.some((m) => m && m.position === "attack");
      return false;
    });
    if (useful !== undefined) return { kind: "trap", zone: useful };
    return { kind: "pass" };
  }

  if (state.phase === "main") {
    if (!field.summoned && field.monsters.some((m) => !m)) {
      const monsters = field.hand
        .map((card, handIndex) => ({ card, handIndex }))
        .filter((x) => x.card.kind === "monster");
      if (monsters.length) {
        const sorted = [...monsters].sort(
          (a, b) => (b.card.atk ?? 0) - (a.card.atk ?? 0) || a.handIndex - b.handIndex,
        );
        const pick = Math.min(sorted.length - 1, Math.floor(random() * 2));
        const chosen = sorted[pick];
        return { kind: "summon", handIndex: chosen.handIndex, position: "attack" };
      }
    }
    for (let i = 0; i < field.hand.length; i++) {
      const card = field.hand[i];
      if (card.kind !== "spell") continue;
      const effect = card.effect!;
      if (
        effect.kind === "buff" ||
        effect.kind === "draw" ||
        effect.kind === "search" ||
        effect.kind === "recover" ||
        effect.kind === "burn"
      ) {
        return { kind: "spell", handIndex: i };
      }
      if (effect.kind === "destroy" && enemy.monsters.some((m) => m)) {
        return { kind: "spell", handIndex: i };
      }
    }
    for (let i = 0; i < field.hand.length; i++) {
      if (field.hand[i].kind === "trap" && field.st.some((s) => !s)) {
        return { kind: "setTrap", handIndex: i };
      }
    }
    return { kind: "pass" };
  }

  if (state.phase === "battle") {
    const negated = state.negateTurn[side] === state.turn;
    const zones = field.monsters
      .map((m, i) => (m && m.position === "attack" && !m.attacked && !negated ? i : -1))
      .filter((i) => i >= 0);
    if (zones.length === 0) return { kind: "pass" };

    if (enemy.monsters.every((m) => !m)) return { kind: "directAttack", zone: zones[0] };

    let best: { target: number; score: number } | null = null;
    for (const zone of zones) {
      const atk = effectiveAtk(state, side, field.monsters[zone]!.card);
      for (let j = 0; j < MONSTER_ZONES; j++) {
        const target = enemy.monsters[j];
        if (!target) continue;
        if (target.position === "attack") {
          const tAtk = effectiveAtk(state, other(side), target.card);
          if (atk > tAtk) {
            const score = tAtk;
            if (!best || score > best.score) best = { target: j, score };
          }
        } else {
          const tDef = target.card.def ?? 0;
          if (atk > tDef) {
            const score = tDef;
            if (!best || score > best.score) best = { target: j, score };
          }
        }
      }
    }
    if (best) return { kind: "attack", zone: zones[0], targetZone: best.target };
    return { kind: "pass" };
  }

  return { kind: "pass" };
}

/**
 * O duelo inteiro, do começo ao fim — o árbitro. O visitante (lado A) envia as
 * ações na ordem; o lado B é jogado pela IA com o mesmo PRNG da sessão.
 * Determinístico dado `seed` e `actions`, então o resultado é reproduzível.
 */
export function playDuel(
  seed: number,
  actionsA: YgoAction[],
  id = "",
  players: { a: string; b: string } = { a: "A", b: "B" },
): YgoResult {
  const { state, starter, random } = newDuel(seed);

  const deckA = [...state.field.a.hand, ...state.field.a.deck];
  const deckB = [...state.field.b.hand, ...state.field.b.deck];

  let nextAction = 0;
  let guard = 0;
  while (!state.over && guard++ < MAX_STEPS) {
    const side = actingSide(state);
    let action: YgoAction;
    if (side === "a") {
      if (nextAction >= actionsA.length) {
        throw new Error("a ação do visitante não chegou ao árbitro");
      }
      action = actionsA[nextAction++];
    } else {
      action = aiAct(state, side, random);
    }
    const result = applyAction(state, side, action);
    if (!result.ok) {
      throw new Error(`ação ilegal do árbitro: ${result.reason}`);
    }
  }

  if (!state.over) {
    const a = state.field.a.lp / STARTING_LP;
    const b = state.field.b.lp / STARTING_LP;
    state.over = true;
    state.winner = a === b ? null : a > b ? "a" : "b";
    state.decidedBy = "timeout";
  }

  return {
    version: 2,
    id,
    seed,
    starter,
    players,
    a: deckA,
    b: deckB,
    log: state.steps,
    winner: state.winner,
    decidedBy: state.decidedBy,
  };
}
