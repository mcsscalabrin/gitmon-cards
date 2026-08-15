import { describe, expect, it } from "vitest";
import {
  DECK_SIZE,
  HAND_LIMIT,
  MAX_TURNS,
  STARTING_LP,
  actingSide,
  aiAct,
  applyAction,
  buildDeck,
  effectiveAtk,
  legalActions,
  newDuel,
  playDuel,
  rng,
} from "@/lib/ygo/engine";
import type { Effect, PlayerField, YgoCard, YgoState } from "@/lib/ygo/types";
import type { MonsterPosition } from "@/lib/ygo/types";

let seq = 0;
function m(atk: number, def = 1000, over: Partial<YgoCard> = {}): YgoCard {
  seq += 1;
  return {
    id: `m${seq}`,
    name: `m${seq}`,
    kind: "monster",
    level: 4,
    atk,
    def,
    text: "",
    artUrl: "",
    ...over,
  };
}
function spell(effect: Effect): YgoCard {
  seq += 1;
  return { id: `s${seq}`, name: `s${seq}`, kind: "spell", effect, text: "", artUrl: "" };
}
function trap(effect: Effect): YgoCard {
  seq += 1;
  return { id: `t${seq}`, name: `t${seq}`, kind: "trap", effect, text: "", artUrl: "" };
}

const field = (over: Partial<PlayerField> = {}): PlayerField => ({
  lp: STARTING_LP,
  deck: [],
  hand: [],
  monsters: [null, null, null],
  st: [null, null, null],
  grave: [],
  summoned: false,
  ...over,
});

const monsterAt = (atk: number, def = 1000, position: MonsterPosition = "attack") => ({
  card: m(atk, def),
  position,
  attacked: false,
});

/** Estado base controlado: turno 1, lado A na Main, campos vazios. */
function setup(over: Partial<YgoState> = {}): YgoState {
  return {
    seed: 1,
    starter: "a",
    actor: "a",
    phase: "main",
    turn: 1,
    field: { a: field(), b: field() },
    buff: { a: 0, b: 0 },
    buffTurn: { a: 0, b: 0 },
    negateTurn: { a: 0, b: 0 },
    window: null,
    windowFor: null,
    steps: [],
    over: false,
    winner: null,
    decidedBy: "timeout",
    ...over,
  };
}

const ids = (f: PlayerField): string[] => [...f.hand, ...f.deck].map((c) => c.id);

describe("deck e lockstep", () => {
  it("buildDeck devolve 20 cartas: 15 monstros + 5 skills", () => {
    const deck = buildDeck(rng(5));
    expect(deck).toHaveLength(DECK_SIZE);
    expect(deck.filter((c) => c.kind === "monster")).toHaveLength(15);
    expect(deck.filter((c) => c.kind === "spell" || c.kind === "trap")).toHaveLength(5);
  });

  it("buildDeck é determinístico para a mesma semente", () => {
    expect(buildDeck(rng(5))).toEqual(buildDeck(rng(5)));
  });

  it("newDuel: mão de 4, deck de 16, LP 4000, Main do starter", () => {
    const { state, starter } = newDuel(42);
    expect(starter).toBe(state.starter);
    expect(state.actor).toBe(state.starter);
    expect(state.phase).toBe("main");
    expect(state.turn).toBe(1);
    expect(state.field.a.hand).toHaveLength(4);
    expect(state.field.b.hand).toHaveLength(4);
    expect(state.field.a.deck).toHaveLength(DECK_SIZE - 4);
    expect(state.field.b.deck).toHaveLength(DECK_SIZE - 4);
    expect(state.field.a.lp).toBe(STARTING_LP);
    expect(state.field.b.lp).toBe(STARTING_LP);
    expect(state.steps[0].action).toBe("start");
  });

  it("a mesma semente reproduz o mesmo estado (lockstep)", () => {
    const one = newDuel(7);
    const two = newDuel(7);
    expect(one.starter).toBe(two.starter);
    expect(ids(one.state.field.a)).toEqual(ids(two.state.field.a));
    expect(ids(one.state.field.b)).toEqual(ids(two.state.field.b));
  });

  it("quem é o ator: no turno do dono, ou o defensor na janela", () => {
    const st = setup();
    expect(actingSide(st)).toBe("a");
    st.window = "trap";
    st.windowFor = "b";
    expect(actingSide(st)).toBe("b");
  });
});

describe("ações legais", () => {
  it("Main: invocação em 3 posições, magia, setar armadilha e passar", () => {
    const st = setup({
      field: {
        a: field({ hand: [m(1500, 1000), spell({ kind: "draw", n: 1 }), trap({ kind: "negate" })] }),
        b: field(),
      },
    });
    const actions = legalActions(st, "a");
    expect(actions).toContainEqual({ kind: "summon", handIndex: 0, position: "attack" });
    expect(actions).toContainEqual({ kind: "summon", handIndex: 0, position: "defense" });
    expect(actions).toContainEqual({ kind: "summon", handIndex: 0, position: "face-down" });
    expect(actions).toContainEqual({ kind: "spell", handIndex: 1 });
    expect(actions).toContainEqual({ kind: "setTrap", handIndex: 2 });
    expect(actions).toContainEqual({ kind: "pass" });
  });

  it("invocação é única por turno (summoned)", () => {
    const st = setup({
      field: {
        a: field({ summoned: true, hand: [m(1500, 1000)], monsters: [monsterAt(1000), null, null] }),
        b: field(),
      },
    });
    expect(legalActions(st, "a")).not.toContainEqual({ kind: "summon", handIndex: 0, position: "attack" });
  });

  it("monstro face-down pode virar (flip)", () => {
    const st = setup({
      field: {
        a: field({ monsters: [{ card: m(1000, 2000), position: "face-down", attacked: false }, null, null] }),
        b: field({ monsters: [null, null, null] }),
      },
    });
    expect(legalActions(st, "a")).toContainEqual({ kind: "flip", zone: 0 });
  });

  it("Batalha: ataque só de monstro em ataque que ainda não atacou", () => {
    const st = setup({
      phase: "battle",
      field: {
        a: field({
          monsters: [monsterAt(2000), { card: m(1200), position: "defense", attacked: false }, null],
        }),
        b: field({ monsters: [monsterAt(1500), null, null] }),
      },
    });
    const actions = legalActions(st, "a");
    expect(actions).toContainEqual({ kind: "attack", zone: 0, targetZone: 0 });
    expect(actions).not.toContainEqual({ kind: "attack", zone: 1, targetZone: 0 });
    expect(actions).not.toContainEqual({ kind: "directAttack", zone: 0 });
  });

  it("Batalha: monstro que já atacou não pode atacar de novo", () => {
    const st = setup({
      phase: "battle",
      field: {
        a: field({ monsters: [{ card: m(2000), position: "attack", attacked: true }, null, null] }),
        b: field({ monsters: [null, null, null] }),
      },
    });
    const actions = legalActions(st, "a");
    expect(actions.filter((x) => x.kind === "attack" || x.kind === "directAttack")).toEqual([]);
  });

  it("fora do seu turno, ou com duelo acabado, não há ação", () => {
    const st = setup();
    expect(legalActions(st, "b")).toEqual([]);
    st.over = true;
    expect(legalActions(st, "a")).toEqual([]);
  });
});

describe("invocação", () => {
  it("invoca em zona vazia, na posição pedida, e marca summoned", () => {
    const st = setup({ field: { a: field({ hand: [m(1500, 1000)] }), b: field() } });
    const result = applyAction(st, "a", { kind: "summon", handIndex: 0, position: "defense" });
    expect(result.ok).toBe(true);
    const a = st.field.a;
    expect(a.summoned).toBe(true);
    expect(a.hand).toEqual([]);
    expect(a.monsters[0]).toMatchObject({ position: "defense", attacked: false });
    expect(a.monsters[0]!.card.atk).toBe(1500);
  });

  it("invocar com summoned é ilegal", () => {
    const st = setup({
      field: {
        a: field({ summoned: true, hand: [m(1500, 1000)] }),
        b: field(),
      },
    });
    expect(applyAction(st, "a", { kind: "summon", handIndex: 0, position: "attack" }).ok).toBe(false);
  });

  it("flip deita o monstro face-down em defesa", () => {
    const st = setup({
      field: {
        a: field({ monsters: [{ card: m(1000, 2000), position: "face-down", attacked: false }, null, null] }),
        b: field(),
      },
    });
    const result = applyAction(st, "a", { kind: "flip", zone: 0 });
    expect(result.ok).toBe(true);
    expect(st.field.a.monsters[0]).toMatchObject({ position: "defense" });
  });
});

describe("dano de batalha (YGO puro, sem efetividade de tipo)", () => {
  const battle = (a: PlayerField, b: PlayerField): YgoState =>
    setup({ phase: "battle", field: { a, b } });

  it("ATK maior derruba o defensor, que toma a diferença no LP", () => {
    const st = battle(field({ monsters: [monsterAt(2000), null, null] }), field({ monsters: [monsterAt(1500), null, null] }));
    const result = applyAction(st, "a", { kind: "attack", zone: 0, targetZone: 0 });
    expect(result.ok).toBe(true);
    expect(st.steps.at(-1)!.strike).toMatchObject({
      attacker: "a",
      zone: 0,
      targetZone: 0,
      targetPosition: "attack",
      destroyed: "defender",
      damage: 500,
    });
    expect(st.field.b.lp).toBe(STARTING_LP - 500);
    expect(st.field.b.monsters[0]).toBeNull();
    expect(st.field.b.grave).toHaveLength(1);
  });

  it("ATK menor inverte: o atacante é destruído e toma a diferença", () => {
    const st = battle(field({ monsters: [monsterAt(1000), null, null] }), field({ monsters: [monsterAt(2500), null, null] }));
    const result = applyAction(st, "a", { kind: "attack", zone: 0, targetZone: 0 });
    expect(result.ok).toBe(true);
    expect(st.steps.at(-1)!.strike).toMatchObject({ destroyed: "attacker", damage: 1500 });
    expect(st.field.a.lp).toBe(STARTING_LP - 1500);
    expect(st.field.a.monsters[0]).toBeNull();
    expect(st.field.b.monsters[0]).not.toBeNull();
  });

  it("ATK igualado destrói os dois sem dano ao LP", () => {
    const st = battle(field({ monsters: [monsterAt(2000), null, null] }), field({ monsters: [monsterAt(2000), null, null] }));
    const result = applyAction(st, "a", { kind: "attack", zone: 0, targetZone: 0 });
    expect(result.ok).toBe(true);
    expect(st.steps.at(-1)!.strike).toMatchObject({ destroyed: "both", damage: 0 });
    expect(st.field.a.monsters[0]).toBeNull();
    expect(st.field.b.monsters[0]).toBeNull();
    expect(st.field.a.lp).toBe(STARTING_LP);
    expect(st.field.b.lp).toBe(STARTING_LP);
  });

  it("romper a DEF derruba o defensor sem dano ao LP", () => {
    const st = battle(field({ monsters: [monsterAt(2000), null, null] }), field({ monsters: [monsterAt(500, 1500, "defense"), null, null] }));
    const result = applyAction(st, "a", { kind: "attack", zone: 0, targetZone: 0 });
    expect(result.ok).toBe(true);
    expect(st.steps.at(-1)!.strike).toMatchObject({ targetPosition: "defense", destroyed: "defender", damage: 0 });
    expect(st.field.b.monsters[0]).toBeNull();
    expect(st.field.b.lp).toBe(STARTING_LP);
  });

  it("não romper a DEF destrói o atacante sem dano (sem pierce)", () => {
    const st = battle(field({ monsters: [monsterAt(1000), null, null] }), field({ monsters: [monsterAt(500, 1500, "defense"), null, null] }));
    const result = applyAction(st, "a", { kind: "attack", zone: 0, targetZone: 0 });
    expect(result.ok).toBe(true);
    expect(st.steps.at(-1)!.strike).toMatchObject({ destroyed: "attacker", damage: 0 });
    expect(st.field.a.monsters[0]).toBeNull();
    expect(st.field.a.lp).toBe(STARTING_LP);
  });

  it("face-down revela ao ser atacado e defende em modo defesa", () => {
    const st = battle(field({ monsters: [monsterAt(2000), null, null] }), field({ monsters: [monsterAt(500, 1200, "face-down"), null, null] }));
    const result = applyAction(st, "a", { kind: "attack", zone: 0, targetZone: 0 });
    expect(result.ok).toBe(true);
    expect(st.steps.at(-1)!.strike).toMatchObject({ targetPosition: "defense", destroyed: "defender", damage: 0 });
    expect(st.field.b.monsters[0]).toBeNull();
  });

  it("campo vazio do oponente: ataque direto com o ATK inteiro", () => {
    const st = battle(field({ monsters: [monsterAt(1800), null, null] }), field());
    const actions = legalActions(st, "a");
    expect(actions).toContainEqual({ kind: "directAttack", zone: 0 });
    const result = applyAction(st, "a", { kind: "directAttack", zone: 0 });
    expect(result.ok).toBe(true);
    expect(st.steps.at(-1)!.strike).toMatchObject({ targetZone: null, damage: 1800 });
    expect(st.field.b.lp).toBe(STARTING_LP - 1800);
  });

  it("derrubar o LP do oponente a zero termina o duelo por knockout", () => {
    const st = battle(field({ monsters: [monsterAt(3000), null, null] }), field({ lp: 500, monsters: [monsterAt(1000), null, null] }));
    const result = applyAction(st, "a", { kind: "attack", zone: 0, targetZone: 0 });
    expect(result.ok).toBe(true);
    expect(st.over).toBe(true);
    expect(st.winner).toBe("a");
    expect(st.decidedBy).toBe("knockout");
  });
});

describe("magias e efeitos", () => {
  it("buff soma ao ATK efetivo no turno e expira no seguinte", () => {
    const st = setup({ field: { a: field({ hand: [spell({ kind: "buff", target: "self", n: 500 })], monsters: [monsterAt(2000), null, null] }), b: field() } });
    const result = applyAction(st, "a", { kind: "spell", handIndex: 0 });
    expect(result.ok).toBe(true);
    expect(st.buff.a).toBe(500);
    expect(st.buffTurn.a).toBe(1);
    expect(effectiveAtk(st, "a", st.field.a.monsters[0]!.card)).toBe(2500);
    st.turn = 2;
    expect(effectiveAtk(st, "a", st.field.a.monsters[0]!.card)).toBe(2000);
  });

  it("burn causa dano direto ao LP do oponente", () => {
    const st = setup({ field: { a: field({ hand: [spell({ kind: "burn", target: "opponent", n: 400 })] }), b: field({ lp: 1000 }) } });
    const result = applyAction(st, "a", { kind: "spell", handIndex: 0 });
    expect(result.ok).toBe(true);
    expect(st.field.b.lp).toBe(600);
  });

  it("recover recupera até o teto de LP", () => {
    const st = setup({ field: { a: field({ hand: [spell({ kind: "recover", target: "self", n: 800 })], lp: 3800 }), b: field() } });
    const result = applyAction(st, "a", { kind: "spell", handIndex: 0 });
    expect(result.ok).toBe(true);
    expect(st.field.a.lp).toBe(STARTING_LP);
  });

  it("draw compra do deck respeitando a mão máxima", () => {
    const st = setup({
      field: {
        a: field({ hand: [spell({ kind: "draw", n: 3 }), m(1000), m(1000), m(1000), m(1000)], deck: [m(500), m(500), m(500)] }),
        b: field(),
      },
    });
    const result = applyAction(st, "a", { kind: "spell", handIndex: 0 });
    expect(result.ok).toBe(true);
    expect(st.field.a.hand).toHaveLength(HAND_LIMIT);
    expect(st.field.a.grave).toHaveLength(2);
  });

  it("destroy derruba o monstro de maior ATK do oponente", () => {
    const st = setup({
      field: {
        a: field({ hand: [spell({ kind: "destroy", target: "opponent" })] }),
        b: field({ monsters: [monsterAt(1500), monsterAt(2400), null] }),
      },
    });
    const result = applyAction(st, "a", { kind: "spell", handIndex: 0 });
    expect(result.ok).toBe(true);
    expect(st.field.b.monsters[1]).toBeNull();
    expect(st.field.b.monsters[0]).not.toBeNull();
    expect(st.field.b.grave).toHaveLength(1);
  });

  it("search busca um monstro do deck para a mão", () => {
    const st = setup({
      field: {
        a: field({ hand: [spell({ kind: "search" })], deck: [spell({ kind: "draw", n: 1 }), m(900), m(100)] }),
        b: field(),
      },
    });
    const result = applyAction(st, "a", { kind: "spell", handIndex: 0 });
    expect(result.ok).toBe(true);
    expect(st.field.a.hand.map((c) => c.atk)).toContain(900);
    expect(st.field.a.deck).toHaveLength(1);
    expect(st.field.a.grave).toHaveLength(2);
  });
});

describe("armadilhas e janela", () => {
  it("passar da Main abre a janela para o defensor que tem armadilha", () => {
    const st = setup({
      field: {
        a: field({ monsters: [monsterAt(2000), null, null] }),
        b: field({ st: [{ card: trap({ kind: "negate" }), face: "down" }, null, null] }),
      },
    });
    const result = applyAction(st, "a", { kind: "pass" });
    expect(result.ok).toBe(true);
    expect(st.window).toBe("trap");
    expect(st.windowFor).toBe("b");
    expect(actingSide(st)).toBe("b");
    expect(legalActions(st, "b")).toContainEqual({ kind: "trap", zone: 0 });
    expect(applyAction(st, "a", { kind: "pass" }).ok).toBe(false);
  });

  it("negate impede o atacante de atacar no turno", () => {
    const st = setup({
      field: {
        a: field({ monsters: [monsterAt(2000), null, null] }),
        b: field({ st: [{ card: trap({ kind: "negate" }), face: "down" }, null, null] }),
      },
    });
    applyAction(st, "a", { kind: "pass" });
    const ativada = applyAction(st, "b", { kind: "trap", zone: 0 });
    expect(ativada.ok).toBe(true);
    expect(st.negateTurn.a).toBe(1);
    applyAction(st, "b", { kind: "pass" });
    expect(st.phase).toBe("battle");
    const actions = legalActions(st, "a");
    expect(actions.filter((x) => x.kind === "attack" || x.kind === "directAttack")).toEqual([]);
  });

  it("counter destrói o monstro atacante de maior ATK do oponente", () => {
    const st = setup({
      field: {
        a: field({ monsters: [monsterAt(2000), monsterAt(1000), null] }),
        b: field({ st: [{ card: trap({ kind: "counter" }), face: "down" }, null, null] }),
      },
    });
    applyAction(st, "a", { kind: "pass" });
    applyAction(st, "b", { kind: "trap", zone: 0 });
    expect(st.field.a.monsters[0]).toBeNull();
    expect(st.field.a.monsters[1]).not.toBeNull();
    expect(st.field.a.grave).toHaveLength(1);
  });

  it("sem armadilha, passar da Main vai direto para a Batalha", () => {
    const st = setup({ field: { a: field({ monsters: [monsterAt(2000), null, null] }), b: field() } });
    const result = applyAction(st, "a", { kind: "pass" });
    expect(result.ok).toBe(true);
    expect(st.window).toBeNull();
    expect(st.phase).toBe("battle");
  });
});

describe("turnos e fim de jogo", () => {
  it("pass na Batalha → End; pass no End → turno do outro com draw", () => {
    const st = setup({
      field: { a: field({ monsters: [monsterAt(2000), null, null] }), b: field({ deck: [m(500), m(500)] }) },
    });
    applyAction(st, "a", { kind: "pass" });
    expect(st.phase).toBe("battle");
    applyAction(st, "a", { kind: "pass" });
    expect(st.phase).toBe("end");
    const antes = st.field.b.deck.length;
    applyAction(st, "a", { kind: "pass" });
    expect(st.turn).toBe(2);
    expect(st.actor).toBe("b");
    expect(st.phase).toBe("main");
    expect(st.field.b.hand).toHaveLength(1);
    expect(st.field.b.deck.length).toBe(antes - 1);
  });

  it("deckout: quem não tem deck no draw perde", () => {
    const st = setup({ field: { a: field({ hand: [], deck: [m(500)] }), b: field({ hand: [], deck: [] }) } });
    st.phase = "end";
    const result = applyAction(st, "a", { kind: "pass" });
    expect(result.ok).toBe(true);
    expect(st.over).toBe(true);
    expect(st.winner).toBe("a");
    expect(st.decidedBy).toBe("deckout");
  });

  it("o teto de turnos decide por LP (timeout)", () => {
    const st = setup({ turn: MAX_TURNS, field: { a: field({ lp: 2000 }), b: field({ lp: 3000 }) } });
    st.phase = "end";
    applyAction(st, "a", { kind: "pass" });
    expect(st.over).toBe(true);
    expect(st.decidedBy).toBe("timeout");
    expect(st.winner).toBe("b");
  });
});

describe("IA do lado B", () => {
  it("na Main invoca um dos dois monstros mais fortes da mão", () => {
    const st = setup({ field: { a: field({ hand: [m(500), m(1900), m(1000)] }), b: field() } });
    const action = aiAct(st, "a", rng(1));
    expect(action.kind).toBe("summon");
    if (action.kind === "summon") {
      const atks = st.field.a.hand.map((c) => c.atk ?? 0);
      expect(atks[action.handIndex]).toBeGreaterThanOrEqual(1000);
    }
  });

  it("na Batalha ataca direto quando o campo do oponente está vazio", () => {
    const st = setup({
      phase: "battle",
      field: { a: field({ monsters: [monsterAt(2000), null, null] }), b: field() },
    });
    expect(aiAct(st, "a", rng(1))).toEqual({ kind: "directAttack", zone: 0 });
  });

  it("na janela usa armadilha útil e passa sem ela", () => {
    const comAlvo = setup({
      window: "trap",
      windowFor: "b",
      field: {
        a: field({ monsters: [monsterAt(2000), null, null] }),
        b: field({ st: [{ card: trap({ kind: "negate" }), face: "down" }, null, null] }),
      },
    });
    expect(aiAct(comAlvo, "b", rng(1))).toEqual({ kind: "trap", zone: 0 });

    const semAlvo = setup({
      window: "trap",
      windowFor: "b",
      field: {
        a: field(),
        b: field({ st: [{ card: trap({ kind: "negate" }), face: "down" }, null, null] }),
      },
    });
    expect(aiAct(semAlvo, "b", rng(1))).toEqual({ kind: "pass" });
  });

  it("é determinística com o mesmo PRNG", () => {
    const st = setup({ field: { a: field({ hand: [m(1000), m(1500), m(1200)] }), b: field() } });
    expect(aiAct(st, "a", rng(9))).toEqual(aiAct(st, "a", rng(9)));
  });
});

describe("playDuel (árbitro)", () => {
  it("mesma semente + mesmas ações reproduzem o mesmo resultado", () => {
    const actions = Array.from({ length: 200 }, () => ({ kind: "pass" as const }));
    const one = playDuel(42, actions);
    const two = playDuel(42, actions);
    expect(JSON.stringify(one)).toBe(JSON.stringify(two));
  });

  it("só passando, o duelo termina com vencedor decidido", () => {
    const actions = Array.from({ length: 200 }, () => ({ kind: "pass" as const }));
    const result = playDuel(42, actions);
    expect(["knockout", "deckout"]).toContain(result.decidedBy);
    expect(result.winner).not.toBeNull();
    expect(result.a).toHaveLength(DECK_SIZE);
    expect(result.b).toHaveLength(DECK_SIZE);
  });

  it("rejeita ação ilegal do visitante", () => {
    expect(() => playDuel(42, [{ kind: "directAttack", zone: 0 }])).toThrow();
  });

  it("rejeita jogo sem ações suficientes", () => {
    expect(() => playDuel(42, [])).toThrow();
  });

  it("sementes diferentes produzem jogos diferentes", () => {
    const actions = Array.from({ length: 200 }, () => ({ kind: "pass" as const }));
    expect(playDuel(1, actions).log).not.toEqual(playDuel(2, actions).log);
  });
});
