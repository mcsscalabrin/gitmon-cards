import { describe, expect, it } from "vitest";
import { cardClassFor } from "@/lib/cards/cardClass";
import type { Axis, AxisRating } from "@/lib/cards/ratings";

function rating(axis: Axis, value: number, raw = value): AxisRating {
  return { axis, value, raw };
}

/** Assinatura de perfil; só alcance/comunidade importam para a classe. */
function profile(reach: number, community: number): AxisRating[] {
  return [
    rating("reach", reach),
    rating("community", community),
    rating("volume", 0),
    rating("veterancy", 0),
    rating("breadth", 0),
  ];
}

describe("classe da carta", () => {
  it("é standard abaixo do piso de escala", () => {
    // conta nova: 10★ → alcance ~19, 5 seguidores → comunidade ~14.
    expect(cardClassFor(profile(19, 14))).toBe("standard");
    expect(cardClassFor(profile(0, 0))).toBe("standard");
  });

  it("corta no piso de 80: 79 é standard, 80 é ex", () => {
    expect(cardClassFor(profile(79, 0))).toBe("standard");
    expect(cardClassFor(profile(80, 0))).toBe("ex");
    expect(cardClassFor(profile(0, 98))).toBe("ex");
  });

  it("vira ex com pico de escala externa entre 80 e 98", () => {
    // kentcdodds 45k★/35k seg → ~85/~70; gaearon 30k★/91k seg → ~82/~89.
    expect(cardClassFor(profile(85, 70))).toBe("ex");
    expect(cardClassFor(profile(82, 89))).toBe("ex");
  });

  it("é mega ex só quando o pico satura em 99", () => {
    // torvalds 254k★ → alcance 99; sindresorhus satura volume, mas é o
    // alcance que o coloca aqui.
    expect(cardClassFor(profile(99, 99))).toBe("mega_ex");
    expect(cardClassFor(profile(99, 0))).toBe("mega_ex");
    expect(cardClassFor(profile(98, 99))).toBe("mega_ex");
  });

  it("eixos internos não conferem classe sozinhos", () => {
    // Dev de 12 linguagens (amplitude 99), repo criado ontem (atividade 99)
    // e contas veteranas com muito repositório saturariam o topo da escada
    // sem ter escala externa — são standard.
    expect(
      cardClassFor([rating("reach", 0), rating("community", 0), rating("breadth", 99)]),
    ).toBe("standard");
    expect(
      cardClassFor([rating("reach", 0), rating("community", 0), rating("volume", 99)]),
    ).toBe("standard");
    expect(
      cardClassFor([rating("reach", 0), rating("community", 0), rating("veterancy", 99)]),
    ).toBe("standard");
    expect(
      cardClassFor([rating("reach", 0), rating("community", 0), rating("activity", 99)]),
    ).toBe("standard");
  });

  it("trata eixo ausente como zero — assinatura sem alcance é standard", () => {
    expect(cardClassFor([])).toBe("standard");
    expect(cardClassFor([rating("breadth", 99)])).toBe("standard");
  });
});
