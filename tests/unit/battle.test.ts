import { describe, expect, it } from "vitest";
import { MAX_TURNS, simulate } from "@/lib/battle/engine";
import { ELEMENTS, type Card } from "@/lib/cards/types";

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
    ...overrides,
  };
}

describe("determinismo", () => {
  it("a mesma semente reproduz a batalha inteira", () => {
    const a = card({
      id: "a",
      attacks: [
        { name: "um", cost: 1, damage: 20, text: "" },
        { name: "dois", cost: 2, damage: 60, text: "" },
      ],
    });
    const b = card({ id: "b" });

    const primeira = simulate(a, b, "x", 123456);
    const segunda = simulate(a, b, "x", 123456);

    expect(segunda.turns).toEqual(primeira.turns);
    expect(segunda.winner).toBe(primeira.winner);
    expect(segunda.starter).toBe(primeira.starter);
  });

  it("sementes diferentes produzem batalhas diferentes", () => {
    const a = card({
      id: "a",
      hp: 250,
      attacks: [
        { name: "um", cost: 1, damage: 20, text: "" },
        { name: "dois", cost: 2, damage: 60, text: "" },
      ],
    });
    const b = card({ id: "b", hp: 250 });

    const resultados = new Set(
      Array.from({ length: 40 }, (_, seed) =>
        JSON.stringify(simulate(a, b, "x", seed).turns),
      ),
    );
    // É exatamente o motivo de a batalha não poder ter cache duro (RFC 7.3).
    expect(resultados.size).toBeGreaterThan(1);
  });
});

describe("efetividade de tipo", () => {
  it("dobra o dano contra a fraqueza impressa na carta defensora", () => {
    const fogo = card({
      id: "a",
      element: "fire",
      attacks: [{ name: "x", cost: 1, damage: 50, text: "" }],
    });
    const fraco = card({ id: "b", hp: 250, weakness: "fire" });

    const turno = simulate(fogo, fraco, "x", 7).turns.find((t) => t.attacker === "a");
    expect(turno?.multiplier).toBe(2);
    // 50 × 1/3 × 2 × [0,85, 1,15]
    expect(turno!.damage).toBeGreaterThanOrEqual(28);
    expect(turno!.damage).toBeLessThanOrEqual(39);
  });

  it("reduz pela metade contra a resistência", () => {
    const agua = card({
      id: "a",
      element: "water",
      attacks: [{ name: "x", cost: 1, damage: 50, text: "" }],
    });
    const resistente = card({ id: "b", hp: 250, resistance: "water" });

    const turno = simulate(agua, resistente, "x", 7).turns.find((t) => t.attacker === "a");
    expect(turno?.multiplier).toBe(0.5);
    expect(turno!.damage).toBeLessThanOrEqual(10);
  });

  it("mantém a variância dentro de ±15% em qualquer semente", () => {
    const atacante = card({ id: "a", attacks: [{ name: "x", cost: 1, damage: 100, text: "" }] });
    const defensor = card({ id: "b", hp: 250 });

    for (let seed = 0; seed < 200; seed += 1) {
      // Só os golpes do lado A: o defensor tem o ataque padrão, de outro dano.
      for (const turn of simulate(atacante, defensor, "x", seed).turns) {
        if (turn.attacker !== "a") continue;
        expect(turn.damage).toBeGreaterThanOrEqual(28);
        expect(turn.damage).toBeLessThanOrEqual(39);
      }
    }
  });
});

describe("fim de batalha", () => {
  it("termina por nocaute assim que o HP zera", () => {
    const forte = card({ id: "a", attacks: [{ name: "x", cost: 4, damage: 300, text: "" }] });
    const fraco = card({ id: "b", hp: 30 });

    const resultado = simulate(forte, fraco, "x", 1);
    expect(resultado.decidedBy).toBe("knockout");
    // Ninguém joga depois do nocaute.
    expect(resultado.turns.at(-1)!.attacker).toBe(resultado.winner);
  });

  it("respeita o teto de turnos e decide por % de HP restante", () => {
    const a = card({ id: "a", hp: 250, attacks: [{ name: "x", cost: 1, damage: 10, text: "" }] });
    const b = card({ id: "b", hp: 250, attacks: [{ name: "y", cost: 1, damage: 1, text: "" }] });

    const resultado = simulate(a, b, "x", 3);
    expect(resultado.turns).toHaveLength(MAX_TURNS);
    expect(resultado.decidedBy).toBe("hp");
    expect(resultado.winner).toBe("a");
  });

  it("não termina no primeiro golpe entre duas cartas no teto", () => {
    // Motivo do DAMAGE_SCALE: com dano cru, 300 contra 250 de HP nocauteia de
    // primeira e a batalha inteira vira "quem começou, ganhou".
    const a = card({ id: "a", hp: 250, attacks: [{ name: "x", cost: 4, damage: 300, text: "" }] });
    const b = card({ id: "b", hp: 250, attacks: [{ name: "y", cost: 4, damage: 300, text: "" }] });

    for (let seed = 0; seed < 50; seed += 1) {
      expect(simulate(a, b, "x", seed).turns.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("nunca deixa o HP final negativo", () => {
    const forte = card({ id: "a", attacks: [{ name: "x", cost: 4, damage: 300, text: "" }] });
    const fraco = card({ id: "b", hp: 30 });

    const resultado = simulate(forte, fraco, "x", 9);
    expect(resultado.finalHp.a).toBeGreaterThanOrEqual(0);
    expect(resultado.finalHp.b).toBe(0);
  });
});

describe("carta sem ataques", () => {
  it("passa o turno em vez de inventar um golpe", () => {
    const vazio = card({ id: "a", attacks: [] });
    const normal = card({ id: "b" });

    const resultado = simulate(vazio, normal, "x", 5);
    const passes = resultado.turns.filter((t) => t.attacker === "a");
    expect(passes.length).toBeGreaterThan(0);
    expect(passes.every((t) => t.attack === null && t.damage === 0)).toBe(true);
    expect(resultado.winner).toBe("b");
  });

  it("empata quando nenhum dos dois lados tem ataque", () => {
    const resultado = simulate(
      card({ id: "a", attacks: [] }),
      card({ id: "b", attacks: [] }),
      "x",
      5,
    );
    expect(resultado.winner).toBeNull();
    expect(resultado.decidedBy).toBe("hp");
  });
});

describe("sorteio de quem começa (Q7)", () => {
  it("alterna entre os dois lados ao longo das sementes", () => {
    const a = card({ id: "a" });
    const b = card({ id: "b" });
    const starters = new Set(
      Array.from({ length: 30 }, (_, seed) => simulate(a, b, "x", seed).starter),
    );
    expect(starters).toEqual(new Set(["a", "b"]));
  });

  it("alterna os turnos entre os lados", () => {
    const resultado = simulate(card({ id: "a", hp: 250 }), card({ id: "b", hp: 250 }), "x", 11);
    for (let i = 1; i < resultado.turns.length; i += 1) {
      expect(resultado.turns[i].attacker).not.toBe(resultado.turns[i - 1].attacker);
    }
  });
});

describe("cadeia de elementos", () => {
  // Deriva de `ELEMENTS`: tipo novo entra sozinho, sem lista para esquecer.
  it("cobre todos os tipos sem quebrar", () => {
    for (const element of ELEMENTS) {
      const resultado = simulate(
        card({ id: "a", element }),
        card({ id: "b", element, weakness: element }),
        "x",
        element.length,
      );
      expect(resultado.turns.length).toBeGreaterThan(0);
    }
  });
});
