import { describe, expect, it } from "vitest";
import { AXES, type Axis, type AxisRating } from "@/lib/cards/ratings";
import type { Card } from "@/lib/cards/types";
import {
  STARTING_LP,
  aiChoose,
  applyAction,
  byRemainingLp,
  decideStarter,
  duelSession,
  legalActions,
  MAX_TURNS,
  monsterStats,
  nextActor,
  playDuel,
  startDuel,
  strikeAtk,
  type DuelState,
} from "@/lib/duel/engine";
import type { DuelAction, Side } from "@/lib/duel/types";

function ratings(values: Partial<Record<Axis, number>>): AxisRating[] {
  return AXES.map((axis) => ({ axis, value: values[axis] ?? 50, raw: 0 }));
}

function card(overrides: Partial<Card> = {}): Card {
  return {
    kind: "profile",
    id: "dev",
    name: "dev",
    element: "normal",
    hp: 100,
    attacks: [{ name: "golpe", cost: 1, damage: 30, text: "" }],
    weakness: null,
    resistance: null,
    retreat: 1,
    rarity: "common",
    axis: "reach",
    serial: null,
    artUrl: "",
    footer: "",
    stats: [],
    sourceUrl: "",
    ratings: ratings({}),
    ...overrides,
  };
}

/** Ataque de um perfil com alcance+volume definidos e dano de ataque opcional. */
function attacker(overrides: Partial<Card> = {}): Card {
  return card({
    id: "atacante",
    element: "fire",
    ratings: ratings({ reach: 50, volume: 50 }),
    attacks: [{ name: "golpe", cost: 1, damage: 30, text: "" }],
    ...overrides,
  });
}

/** Defensor com ATK baixo e DEF alta. */
function defender(overrides: Partial<Card> = {}): Card {
  return card({
    id: "defensor",
    ratings: ratings({ reach: 10, volume: 10, community: 40, veterancy: 40, breadth: 40 }),
    ...overrides,
  });
}

describe("derivação de ATK/DEF", () => {
  it("ATK = 5 × (reach + volume) e DEF = 5 × (community + veterancy + breadth)", () => {
    expect(monsterStats(attacker())).toEqual({ atk: 500, def: 750 });
  });

  it("sem ratings a carta cai em zero, não quebra", () => {
    const semRadar = card({ ratings: undefined });
    expect(monsterStats(semRadar)).toEqual({ atk: 0, def: 0 });
  });

  it("ATK efetivo soma o dano do ataque escolhido; golpe cru usa só o ATK", () => {
    const a = attacker();
    expect(strikeAtk(a, { kind: "attack", attackIndex: 0 })).toBe(530);
    expect(strikeAtk(a, { kind: "attack" })).toBe(500);
  });
});

describe("quem começa (sorteio da semente)", () => {
  it("a mesma semente devolve o mesmo lado", () => {
    expect(decideStarter(123)).toBe(decideStarter(123));
  });

  it("alterna as ações a partir do starter", () => {
    const a = attacker();
    const b = defender();
    const state = startDuel(a, b, "a", 1);
    expect(nextActor(state)).toBe("a");
    const next = applyAction(state, "a", { kind: "pass" });
    expect(next.ok && nextActor(next.state)).toBe("b");
  });
});

describe("ações legais", () => {
  it("em posição de ataque: cada ataque da carta, posições e passar", () => {
    const a = card({
      attacks: [
        { name: "um", cost: 1, damage: 20, text: "" },
        { name: "dois", cost: 2, damage: 60, text: "" },
      ],
    });
    const actions = legalActions(startDuel(a, defender(), "a", 1), "a");
    expect(actions).toContainEqual({ kind: "attack", attackIndex: 0 });
    expect(actions).toContainEqual({ kind: "attack", attackIndex: 1 });
    expect(actions).toContainEqual({ kind: "position", to: "defense" });
    expect(actions).toContainEqual({ kind: "position", to: "face-down" });
    expect(actions).toContainEqual({ kind: "pass" });
  });

  it("carta sem ataques ganha golpe cru", () => {
    const a = card({ attacks: [] });
    expect(legalActions(startDuel(a, defender(), "a", 1), "a")).toContainEqual({
      kind: "attack",
    });
  });

  it("em defesa não dá para atacar", () => {
    const a = attacker();
    const state = startDuel(a, defender(), "a", 1);
    const turned = applyAction(state, "a", { kind: "position", to: "defense" });
    if (!turned.ok) throw new Error("deveria virar para defesa");
    expect(legalActions(turned.state, "a").filter((x) => x.kind === "attack")).toEqual([]);
  });

  it("monstro destruído só pode passar", () => {
    const a = attacker();
    const state = startDuel(a, defender(), "a", 1);
    const destroyed = {
      ...state,
      monsters: {
        ...state.monsters,
        a: { ...state.monsters.a, destroyed: true },
      },
    };
    expect(legalActions(destroyed, "a")).toEqual([{ kind: "pass" }]);
  });

  it("trocar para a posição atual é ilegal", () => {
    const state = startDuel(attacker(), defender(), "a", 1);
    const result = applyAction(state, "a", { kind: "position", to: "attack" });
    expect(result.ok).toBe(false);
  });

  it("fora do seu turno é ilegal", () => {
    const state = startDuel(attacker(), defender(), "b", 1);
    expect(applyAction(state, "a", { kind: "pass" }).ok).toBe(false);
  });
});

describe("dano de batalha", () => {
  it("ATK maior derruba o defensor e ele toma a diferença no LP", () => {
    const a = attacker(); // ATK 500, golpe 30 → 530
    const b = defender(); // posição de ataque, ATK 100
    const state = startDuel(a, b, "a", 1);
    const result = applyAction(state, "a", { kind: "attack", attackIndex: 0 });
    if (!result.ok) throw new Error("deveria atacar");

    expect(result.state.turns[0].strike).toMatchObject({
      destroyed: "b",
      damageTo: "b",
      damage: 430,
      direct: false,
    });
    expect(result.state.lp.b).toBe(STARTING_LP - 430);
    expect(result.state.monsters.b.destroyed).toBe(true);
  });

  it("ATK menor inverte: o atacante é destruído e toma a diferença", () => {
    const a = attacker(); // fraco: ATK 500, golpe 30 → 530
    const b = attacker({ id: "forte", ratings: ratings({ reach: 99, volume: 99 }) }); // ATK 990, golpe 30 → 1020
    const state = startDuel(a, b, "a", 1);
    const result = applyAction(state, "a", { kind: "attack", attackIndex: 0 });
    if (!result.ok) throw new Error("deveria atacar");

    expect(result.state.turns[0].strike).toMatchObject({
      destroyed: "a",
      damageTo: "a",
      damage: 460, // 990 (ATK do defensor) - 530
    });
    expect(result.state.monsters.a.destroyed).toBe(true);
  });

  it("ATK igualado destrói os dois sem dano", () => {
    const a = card({
      id: "a",
      ratings: ratings({ reach: 50, volume: 50 }),
      attacks: [],
    });
    const b = card({
      id: "b",
      ratings: ratings({ reach: 50, volume: 50 }),
      attacks: [],
    });
    const state = startDuel(a, b, "a", 1);
    const result = applyAction(state, "a", { kind: "attack" });
    if (!result.ok) throw new Error("deveria atacar");

    expect(result.state.turns[0].strike).toMatchObject({ destroyed: "both", damage: 0 });
    expect(result.state.monsters.a.destroyed).toBe(true);
    expect(result.state.monsters.b.destroyed).toBe(true);
    expect(result.state.lp).toEqual({ a: STARTING_LP, b: STARTING_LP });
  });

  it("romper a DEF derruba o defensor sem dano ao LP", () => {
    const a = attacker({ attacks: [{ name: "golpe", cost: 1, damage: 200, text: "" }] }); // 700
    const b = defender(); // DEF 600
    const state = startDuel(a, b, "b", 1); // b vira primeiro
    const turned = applyAction(state, "b", { kind: "position", to: "defense" });
    if (!turned.ok) throw new Error("deveria virar");
    const result = applyAction(turned.state, "a", { kind: "attack", attackIndex: 0 });
    if (!result.ok) throw new Error("deveria atacar");

    expect(result.state.turns[1].strike).toMatchObject({
      destroyed: "b",
      damageTo: null,
      damage: 0,
      defendedBy: 600,
    });
    expect(result.state.lp).toEqual({ a: STARTING_LP, b: STARTING_LP });
    expect(result.state.monsters.b.destroyed).toBe(true);
  });

  it("não romper a DEF destrói o atacante, que toma a diferença", () => {
    const a = attacker({ attacks: [{ name: "golpe", cost: 1, damage: 30, text: "" }] }); // 530
    const b = defender(); // DEF 600
    const state = startDuel(a, b, "b", 1);
    const turned = applyAction(state, "b", { kind: "position", to: "defense" });
    if (!turned.ok) throw new Error("deveria virar");
    const result = applyAction(turned.state, "a", { kind: "attack", attackIndex: 0 });
    if (!result.ok) throw new Error("deveria atacar");

    expect(result.state.turns[1].strike).toMatchObject({
      destroyed: "a",
      damageTo: "a",
      damage: 70, // 600 - 530
    });
    expect(result.state.monsters.a.destroyed).toBe(true);
    expect(result.state.monsters.b.destroyed).toBe(false);
    expect(result.state.lp.a).toBe(STARTING_LP - 70);
  });

  it("face-down revela ao ser atacado e deita em defesa", () => {
    const a = attacker();
    const b = defender();
    const state = startDuel(a, b, "b", 1);
    const set = applyAction(state, "b", { kind: "position", to: "face-down" });
    if (!set.ok) throw new Error("deveria baixar");
    const result = applyAction(set.state, "a", { kind: "attack", attackIndex: 0 });
    if (!result.ok) throw new Error("deveria atacar");

    expect(result.state.turns[1].strike).toMatchObject({
      defenderPosition: "face-down",
      defendedBy: 600,
    });
    expect(result.state.monsters.b.position).toBe("defense");
  });

  it("sem monstro na frente, o golpe vai direto ao LP", () => {
    const a = attacker();
    const b = defender();
    const state = startDuel(a, b, "a", 1);
    const noMonster = {
      ...state,
      monsters: {
        a: { ...state.monsters.a },
        b: { ...state.monsters.b, destroyed: true },
      },
    };
    const result = applyAction(noMonster, "a", { kind: "attack", attackIndex: 0 });
    if (!result.ok) throw new Error("deveria atacar");

    expect(result.state.turns[0].strike).toMatchObject({
      direct: true,
      damage: 530,
      damageTo: "b",
    });
    expect(result.state.lp.b).toBe(STARTING_LP - 530);
  });

  it("efetividade de tipo multiplica o dano (×2 fraqueza, ×0.5 resistência)", () => {
    const a = attacker(); // fire
    const fraca = defender({ weakness: "fire" });
    const resistente = defender({ resistance: "fire" });

    const ataqueFracas = applyAction(startDuel(a, fraca, "a", 1), "a", {
      kind: "attack",
      attackIndex: 0,
    });
    if (!ataqueFracas.ok) throw new Error("deveria atacar");
    expect(ataqueFracas.state.turns[0].strike?.damage).toBe(860); // 430 × 2

    const ataqueResistentes = applyAction(startDuel(a, resistente, "a", 1), "a", {
      kind: "attack",
      attackIndex: 0,
    });
    if (!ataqueResistentes.ok) throw new Error("deveria atacar");
    expect(ataqueResistentes.state.turns[0].strike?.damage).toBe(215); // 430 × 0.5
  });

  it("dano mínimo de 1 quando há dano a aplicar", () => {
    const a = card({ id: "a", ratings: ratings({ reach: 0, volume: 0 }), attacks: [] });
    const b = defender();
    const state = startDuel(a, b, "a", 1);
    const noMonster = {
      ...state,
      monsters: {
        a: { ...state.monsters.a },
        b: { ...state.monsters.b, destroyed: true },
      },
    };
    const result = applyAction(noMonster, "a", { kind: "attack" });
    if (!result.ok) throw new Error("deveria atacar");
    expect(result.state.turns[0].strike?.damage).toBe(1);
  });
});

describe("fim de duelo", () => {
  it("LP zerado decide por nocaute", () => {
    const a = attacker({ attacks: [{ name: "golpe", cost: 1, damage: 200, text: "" }] }); // 700
    const b = defender();
    const state = { ...startDuel(a, b, "a", 1), lp: { a: STARTING_LP, b: 300 } };
    const result = applyAction(state, "a", { kind: "attack", attackIndex: 0 });
    if (!result.ok) throw new Error("deveria atacar");

    expect(result.state.over).toBe(true);
    expect(result.state.winner).toBe("a");
    expect(result.state.decidedBy).toBe("knockout");
    expect(result.state.lp.b).toBe(0);
  });

  it("o teto de turnos decide por maior % de LP", () => {
    const a = attacker();
    const b = defender();
    let state = startDuel(a, b, "a", 1);
    // Os dois sem monstro em campo: só passam, e o duelo esgota o teto.
    state = {
      ...state,
      monsters: {
        a: { ...state.monsters.a, destroyed: true },
        b: { ...state.monsters.b, destroyed: true },
      },
    };
    for (let i = 0; i < MAX_TURNS; i += 1) {
      const result = applyAction(state, nextActor(state), { kind: "pass" });
      if (!result.ok) throw new Error("pass deveria ser legal");
      state = result.state;
    }
    expect(state.over).toBe(true);
    expect(state.decidedBy).toBe("lp");
    expect(state.winner).toBeNull();
  });

  it("desempate do teto escolhe o lado com mais LP", () => {
    expect(byRemainingLp({ a: STARTING_LP, b: STARTING_LP - 1 })).toBe("a");
    expect(byRemainingLp({ a: STARTING_LP, b: STARTING_LP })).toBeNull();
  });
});

describe("IA adversária", () => {
  it("monstro destruído só passa", () => {
    const state = {
      ...startDuel(attacker(), defender(), "a", 1),
      monsters: {
        a: { card: attacker(), position: "attack" as const, destroyed: true },
        b: { card: defender(), position: "attack" as const, destroyed: false },
      },
    };
    expect(aiChoose(state, "a", () => 0.5)).toEqual({ kind: "pass" });
  });

  it("troca desfavorável recua para face-down", () => {
    const b = defender(); // ATK 100, DEF 600
    const state = startDuel(attacker(), b, "b", 1);
    expect(aiChoose(state, "b", () => 0)).toEqual({ kind: "position", to: "face-down" });
  });

  it("troca favorável ataca", () => {
    const a = attacker(); // ATK 500 + 30
    const b = defender(); // ATK 100
    const state = startDuel(a, b, "a", 1);
    const action = aiChoose(state, "a", () => 0.5);
    expect(action.kind).toBe("attack");
  });

  it("campo limpo ataca direto", () => {
    const a = attacker();
    const state = {
      ...startDuel(a, defender(), "a", 1),
      monsters: {
        a: { card: a, position: "attack" as const, destroyed: false },
        b: { card: defender(), position: "attack" as const, destroyed: true },
      },
    };
    expect(aiChoose(state, "a", () => 0).kind).toBe("attack");
  });
});

describe("playDuel — o árbitro do servidor", () => {
  function montarCenario() {
    // Forte: ataca de verdade. Fraco: cai de primeira, depois só passa.
    const forte = card({
      id: "forte",
      ratings: ratings({ reach: 99, volume: 99 }),
      attacks: [{ name: "golpe", cost: 1, damage: 300, text: "" }],
    });
    const fraco = card({
      id: "fraco",
      ratings: ratings({ reach: 0, volume: 0 }),
      attacks: [],
    });
    return { forte, fraco };
  }

  // Referee manual que coleta as ações exatas do visitante. A IA aqui é
  // determinística (recua de troca ruim e depois passa), então qualquer função
  // de sorteio chega ao mesmo jogo — o que permite comparar com o playDuel.
  function acoesDoVisitante(seed: number): DuelAction[] {
    const { forte, fraco } = montarCenario();
    let state = startDuel(forte, fraco, decideStarter(seed), seed);
    const actions: DuelAction[] = [];
    while (!state.over) {
      const actor = nextActor(state);
      const action: DuelAction =
        actor === "a" ? { kind: "attack", attackIndex: 0 } : aiChoose(state, actor, () => 0.5);
      if (actor === "a") actions.push(action);
      const result = applyAction(state, actor, action);
      if (!result.ok) throw new Error("jogo manual deveria ser legal");
      state = result.state;
    }
    return actions;
  }

  it("reproduz o mesmo duelo com a mesma semente", () => {
    const { forte, fraco } = montarCenario();
    const seed = 42;
    const primeiro = playDuel(forte, fraco, seed, acoesDoVisitante(seed), "x");
    const segundo = playDuel(forte, fraco, seed, acoesDoVisitante(seed), "x");
    expect(segundo.turns).toEqual(primeiro.turns);
  });

  it("joga o duelo inteiro a partir das ações do visitante e decide", () => {
    const { forte, fraco } = montarCenario();
    const seed = 42;
    const actions = acoesDoVisitante(seed);

    const resultado = playDuel(forte, fraco, seed, actions, "id");
    expect(resultado.winner).toBe("a");
    expect(resultado.decidedBy).toBe("knockout");
    expect(resultado.lp.b).toBe(0);
    expect(resultado.player).toBe("a");
    expect(resultado.version).toBe(1);
  });

  it("recusa lista de ações curta demais", () => {
    const { forte, fraco } = montarCenario();
    expect(() => playDuel(forte, fraco, 42, [], "x")).toThrow(/faltou ação/);
  });

  it("recusa lista de ações longa demais", () => {
    const { forte, fraco } = montarCenario();
    const seed = 42;
    const actions = acoesDoVisitante(seed);
    expect(() =>
      playDuel(forte, fraco, seed, [...actions, { kind: "pass" }], "x"),
    ).toThrow(/ações demais/);
  });

  it("recusa ação ilegal no meio do duelo", () => {
    const { forte, fraco } = montarCenario();
    // O forte ataca o fraco e o fraco cai destruído; aí o visitante (fraco)
    // tenta atacar mesmo destruído — ilegal.
    const seed = 1;
    expect(() =>
      playDuel(fraco, forte, seed, [{ kind: "attack", attackIndex: 0 }], "x"),
    ).toThrow(/ação ilegal/);
  });

  // Simula exatamente o fluxo do client (DuelBoard): sessão compartilhada,
  // PRNG real, IA consumindo o mesmo stream, ações do visitante coletadas
  // conforme ele joga. O resultado precisa ser idêntico ao do playDuel com
  // essas ações — é o contrato "client anima, servidor arbitra" (ver engine).
  function simularComoOClient(
    a: Card,
    b: Card,
    seed: number,
    strategy: (state: DuelState, side: Side) => DuelAction,
  ): { state: DuelState; actions: DuelAction[] } {
    const { random, starter } = duelSession(seed);
    let state = startDuel(a, b, starter, seed);
    const actions: DuelAction[] = [];
    while (!state.over) {
      const actor = nextActor(state);
      const action =
        actor === "a" ? strategy(state, actor) : aiChoose(state, actor, random);
      if (actor === "a") actions.push(action);
      const result = applyAction(state, actor, action);
      if (!result.ok) throw new Error(`simulação do client: ${result.reason}`);
      state = result.state;
    }
    return { state, actions };
  }

  it("o client incremental e o playDuel consomem o PRNG na mesma ordem", () => {
    const { forte, fraco } = montarCenario();
    const semprePassa = () => ({ kind: "pass" as const });
    // Várias sementes: ora a IA ataca de cara (consome o stream), ora recua.
    for (const seed of [0, 1, 7, 42, 999]) {
      const { state, actions } = simularComoOClient(fraco, forte, seed, semprePassa);
      const resultado = playDuel(fraco, forte, seed, actions, "id");
      expect(resultado.turns).toEqual(state.turns);
      expect(resultado.lp).toEqual(state.lp);
      expect(resultado.winner).toBe(state.winner);
      expect(resultado.decidedBy).toBe(state.decidedBy);
    }
  });
});
