import { describe, expect, it } from "vitest";

/**
 * Testa a lógica de formatação do StatBadge sem renderizar o componente.
 * O projeto não usa @testing-library — testes unitários são dados puros.
 */

/** Espelha a lógica de formatação do StatBadge. */
function formatBadge(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return String(value);
}

describe("formatação do StatBadge", () => {
  it("valores abaixo de 1000 ficam sem sufixo k", () => {
    expect(formatBadge(0)).toBe("0");
    expect(formatBadge(42)).toBe("42");
    expect(formatBadge(999)).toBe("999");
  });

  it("valores entre 1000 e 9999 têm 1 casa decimal", () => {
    expect(formatBadge(1000)).toBe("1.0k");
    expect(formatBadge(1234)).toBe("1.2k");
    expect(formatBadge(9999)).toBe("10.0k");
  });

  it("valores >= 10000 sem casa decimal", () => {
    expect(formatBadge(10000)).toBe("10k");
    expect(formatBadge(15000)).toBe("15k");
    expect(formatBadge(150000)).toBe("150k");
  });
});
