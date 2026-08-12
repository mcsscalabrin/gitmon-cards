import { describe, expect, it } from "vitest";
import foil from "@/lib/cards/foil.json";
import {
  cardTreatment,
  foilIntensity,
  hasFoil,
  rarityForScore,
  raritySymbol,
  raritySymbolColor,
  raritySymbolSize,
} from "@/lib/cards/rarity";
import { RARITIES } from "@/lib/cards/types";

describe("escada de raridade", () => {
  it("mapeia cada faixa para o tier correspondente", () => {
    expect(rarityForScore(0)).toBe("common");
    expect(rarityForScore(74)).toBe("common");
    expect(rarityForScore(75)).toBe("uncommon");
    expect(rarityForScore(349)).toBe("uncommon");
    expect(rarityForScore(350)).toBe("rare");
    expect(rarityForScore(1499)).toBe("rare");
    expect(rarityForScore(1500)).toBe("double_rare");
    expect(rarityForScore(7999)).toBe("double_rare");
    expect(rarityForScore(8000)).toBe("illustration_rare");
    expect(rarityForScore(39_999)).toBe("illustration_rare");
    expect(rarityForScore(40_000)).toBe("ultra_rare");
    expect(rarityForScore(199_999)).toBe("ultra_rare");
    expect(rarityForScore(200_000)).toBe("special_illustration_rare");
    expect(rarityForScore(799_999)).toBe("special_illustration_rare");
    expect(rarityForScore(800_000)).toBe("hyper_rare");
  });

  /*
   * Regressão da calibração. A primeira escada colocava seis dos sete perfis
   * notáveis medidos em `hyper_rare`, esvaziando o tier. Estes são os scores
   * reais desses perfis; se alguém mexer nos limiares e o topo voltar a inchar,
   * quebra aqui em vez de só na carta.
   */
  it("mantém o topo raro contra perfis reais medidos", () => {
    expect(rarityForScore(134)).toBe("uncommon"); // mcsscalabrin
    expect(rarityForScore(142_566)).toBe("ultra_rare"); // defunkt
    expect(rarityForScore(196_983)).toBe("ultra_rare"); // kentcdodds
    expect(rarityForScore(334_805)).toBe("special_illustration_rare"); // gaearon
    expect(rarityForScore(426_514)).toBe("special_illustration_rare"); // tj
    expect(rarityForScore(1_456_179)).toBe("hyper_rare"); // torvalds
    expect(rarityForScore(1_945_490)).toBe("hyper_rare"); // sindresorhus
  });

  it("é monotônica: score maior nunca devolve tier mais baixo", () => {
    const order = RARITIES.map((r) => RARITIES.indexOf(r));
    let previous = -1;
    for (let score = 0; score <= 30_000; score += 25) {
      const index = RARITIES.indexOf(rarityForScore(score));
      expect(index).toBeGreaterThanOrEqual(previous);
      previous = index;
    }
    expect(order.length).toBe(8);
  });

  it("trata score negativo como common em vez de estourar", () => {
    expect(rarityForScore(-1)).toBe("common");
  });
});

describe("símbolo", () => {
  /*
   * Exaustividade importa mais que o valor em si: um `switch` sem o case novo
   * devolve `undefined` silenciosamente, e o sintoma só aparece como buraco no
   * rodapé da carta renderizada.
   */
  it("define glifo, cor e tamanho para todos os tiers", () => {
    for (const rarity of RARITIES) {
      expect(raritySymbol(rarity), rarity).toBeTruthy();
      expect(raritySymbolColor(rarity), rarity).toMatch(/^#[0-9A-F]{6}$/i);
      expect(raritySymbolSize(rarity), rarity).toBeGreaterThan(0);
    }
  });

  it("usa contagem de estrelas crescente nos tiers altos", () => {
    expect(raritySymbol("rare")).toBe("★");
    expect(raritySymbol("double_rare")).toBe("★★");
    expect(raritySymbol("hyper_rare")).toBe("★★★");
  });

  it("separa por cor os tiers que têm a mesma contagem de estrelas", () => {
    const duasEstrelas = ["double_rare", "ultra_rare", "special_illustration_rare"] as const;
    for (const rarity of duasEstrelas) {
      expect(raritySymbol(rarity)).toBe("★★");
    }
    const cores = new Set(duasEstrelas.map(raritySymbolColor));
    expect(cores.size).toBe(duasEstrelas.length);
  });
});

describe("tratamento visual", () => {
  it("dá full-art só aos três tiers de ilustração", () => {
    const fullArt = RARITIES.filter((r) => cardTreatment(r).fullArt);
    expect(fullArt).toEqual([
      "illustration_rare",
      "ultra_rare",
      "special_illustration_rare",
    ]);
  });

  it("mantém a hyper_rare no layout padrão, distinguindo-a da special", () => {
    expect(cardTreatment("hyper_rare")).toEqual({
      fullArt: false,
      metal: "gold",
      edge: null,
    });
    expect(cardTreatment("special_illustration_rare")).toEqual({
      fullArt: true,
      metal: "gold",
      edge: null,
    });
  });

  /*
   * O anel folheado já é o tratamento de borda dos tiers que o têm. Somar os
   * dois não faz um tier mais raro — apaga o folheado, que é o sinal mais caro
   * da carta.
   */
  it("nunca põe metal e borda no mesmo tier", () => {
    for (const rarity of RARITIES) {
      const { metal, edge } = cardTreatment(rarity);
      expect(metal !== null && edge !== null, rarity).toBe(false);
    }
  });

  /*
   * O que o thumbnail de feed enxerga é a combinação de layout, metal e borda —
   * não a contagem de estrelas, ilegível a 150px. Se dois tiers colapsarem na
   * mesma combinação, a escada volta a morrer no tamanho em que a carta mais
   * vive, e nada mais quebra.
   */
  it("dá combinação própria a cada tier a partir da rare", () => {
    const combos = RARITIES.filter(hasFoil).map((r) => {
      const { fullArt, metal, edge } = cardTreatment(r);
      return `${fullArt}:${metal}:${edge}`;
    });
    expect(new Set(combos).size).toBe(combos.length);
  });

  /*
   * O ponto do tratamento: os três tiers que antes eram indistinguíveis agora
   * têm combinações diferentes de (full-art, metal). Se alguém colapsar duas
   * delas, o problema volta em silêncio.
   */
  it("não repete a mesma combinação entre tiers com foil", () => {
    const combos = RARITIES.filter(hasFoil).map((r) => {
      const { fullArt, metal } = cardTreatment(r);
      return `${fullArt}:${metal}`;
    });
    expect(new Set(combos).size).toBeGreaterThanOrEqual(4);
  });

  it("só usa tons metálicos que a build gera", () => {
    for (const rarity of RARITIES) {
      const { metal } = cardTreatment(rarity);
      if (metal !== null) expect(["silver", "gold"]).toContain(metal);
    }
  });
});

describe("foil", () => {
  it("começa na rare, como no TCG", () => {
    expect(hasFoil("common")).toBe(false);
    expect(hasFoil("uncommon")).toBe(false);
    expect(hasFoil("rare")).toBe(true);
  });

  it("cobre seis tiers — um PNG por tier em public/assets/frames", () => {
    expect(RARITIES.filter(hasFoil)).toHaveLength(6);
  });
});

describe("intensidade do foil ao vivo", () => {
  it("é zero exatamente onde não há foil", () => {
    for (const rarity of RARITIES) {
      if (hasFoil(rarity)) expect(foilIntensity(rarity)).toBeGreaterThan(0);
      else expect(foilIntensity(rarity)).toBe(0);
    }
  });

  /*
   * O ponto da função. Se dois tiers empatarem, a escada de raridade morre no
   * efeito mais visível que a carta tem — que foi o estado anterior, com um
   * booleano decidindo o brilho de seis tiers.
   */
  it("cresce estritamente entre os tiers com foil", () => {
    const valores = RARITIES.filter(hasFoil).map(foilIntensity);
    for (let i = 1; i < valores.length; i += 1) {
      expect(valores[i]).toBeGreaterThan(valores[i - 1]);
    }
  });

  it("fica no intervalo que o CSS multiplica, sem estourar as opacidades", () => {
    for (const rarity of RARITIES) {
      expect(foilIntensity(rarity)).toBeGreaterThanOrEqual(0);
      expect(foilIntensity(rarity)).toBeLessThanOrEqual(1);
    }
  });

  /*
   * `foil.json` é a fonte única das duas pontas: o `foilIntensity()` que o
   * TiltCard multiplica no CSS e o `foilSvg()` que a build assa em PNG. As duas
   * pontas divergirem não quebra compilação nenhuma — dá carta sem foil de um
   * lado ou arquivo órfão do outro, e o sintoma só aparece na imagem. Daí o
   * teste ser sobre o arquivo, e não sobre a função.
   */
  it("tem uma banda espectral por tier com foil, e só por esses", () => {
    expect(Object.keys(foil.bands).sort()).toEqual(RARITIES.filter(hasFoil).sort());
  });

  it("dá quatro cores a cada banda — é o ciclo que o gradiente repete", () => {
    for (const [tier, bands] of Object.entries(foil.bands)) {
      expect(bands, tier).toHaveLength(4);
      for (const color of bands) expect(color, tier).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });
});
