import { describe, expect, it } from "vitest";
import foil from "@/lib/cards/foil.json";
import {
  cardTreatment,
  foilBands,
  foilIntensity,
  hasFoil,
  hasTexture,
  rarityForScore,
  raritySymbol,
  raritySymbolColor,
  raritySymbolSize,
} from "@/lib/cards/rarity";
import { AXES } from "@/lib/cards/ratings";
import { dominantAxisForProfile, dominantAxisForRepo, patternForAxis, tagForAxis } from "@/lib/cards/tag";
import { RARITIES, type Rarity } from "@/lib/cards/types";
/*
 * As listas vivas moram no gerador de arte, e é contra elas que o domínio tem
 * que fechar — não contra uma cópia escrita aqui, e nem contra si mesmo.
 *
 * Importar `FOIL_PATTERNS` de `tag.ts` deixaria o teste tautológico: lá ele é
 * derivado do mesmo `AXIS_PATTERNS` que a asserção verifica. O que pode divergir
 * de verdade é domínio contra build — um padrão no mapa sem SVG correspondente é
 * um `patternUri` apontando para arquivo que não existe, e o erro aparece na
 * imagem, em produção.
 */
import { FOIL_PATTERNS, TEXTURED_TIERS } from "../../scripts/lib/art.mjs";

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

  /*
   * `foilBands` é a ponta ao vivo do mesmo arquivo: o TiltCard monta o gradiente
   * `.tilt-spectral` com as bandas que `foilSvg()` assa no PNG. Devolver outra
   * cor aqui é a mesma divergência que o teste acima pega — uma carta dourada no
   * feed e colorida no site —, só que dessa vez em função que vaza para o React.
   */
  it("devolve ao TiltCard exatamente as bandas que a build assa", () => {
    const baked = foil.bands as Partial<Record<Rarity, string[]>>;
    for (const rarity of RARITIES) {
      const bands = foilBands(rarity);
      if (hasFoil(rarity)) expect(bands, rarity).toEqual(baked[rarity]);
      else expect(bands, rarity).toEqual([]);
    }
  });
});

/*
 * A textura é a camada que separa o topo do resto, e é a única que a build gera
 * por tier em vez de por eixo. Os dois lados podem divergir sem quebrar
 * compilação: um tier em `hasTexture` sem arquivo em `TEXTURED_TIERS` vira um
 * `dataUri` apontando para um PNG que não existe, e o erro aparece na imagem, em
 * produção. Mesma armadilha que `foil.json` já fechou para o foil.
 */
describe("textura gravada", () => {
  it("começa na ultra_rare, como o relevo tátil do TCG", () => {
    expect(hasTexture("illustration_rare")).toBe(false);
    expect(hasTexture("ultra_rare")).toBe(true);
    expect(hasTexture("special_illustration_rare")).toBe(true);
    expect(hasTexture("hyper_rare")).toBe(true);
  });

  it("cobre exatamente os tiers que a build assa", () => {
    expect(RARITIES.filter(hasTexture).sort()).toEqual([...TEXTURED_TIERS].sort());
  });

  it("nunca aparece sem foil por baixo", () => {
    for (const rarity of RARITIES) {
      if (hasTexture(rarity)) expect(hasFoil(rarity), rarity).toBe(true);
    }
  });
});

/*
 * O segundo eixo do sistema. A raridade responde "quão raro"; o eixo responde
 * "de que tipo", e é o que faz duas cartas do mesmo tier deixarem de ser a mesma
 * carta.
 */
describe("eixo, tag e padrão", () => {
  it("dá uma tag e um padrão a cada eixo, sem repetir nenhum", () => {
    const tags = AXES.map(tagForAxis);
    const patterns = AXES.map(patternForAxis);
    expect(new Set(tags).size).toBe(AXES.length);
    expect(new Set(patterns).size).toBe(AXES.length);
  });

  it("só usa padrões que a build gera, e a build não gera padrão órfão", () => {
    for (const axis of AXES) expect(FOIL_PATTERNS, axis).toContain(patternForAxis(axis));
    expect([...FOIL_PATTERNS].sort()).toEqual(AXES.map(patternForAxis).sort());
  });

  /*
   * O ponto da arquitetura de cinco arquivos: o padrão não pode depender do
   * tier, senão voltam a ser 5 × 6 × 2 = 60 PNGs. Se alguém acoplar os dois, é
   * aqui que aparece.
   */
  it("é ortogonal à raridade — o mesmo eixo dá o mesmo padrão em todo tier", () => {
    for (const axis of AXES) {
      const esperado = patternForAxis(axis);
      for (const rarity of RARITIES.filter(hasFoil)) {
        expect(patternForAxis(axis), `${axis}/${rarity}`).toBe(esperado);
      }
    }
  });

  it("é determinístico: a mesma entrada devolve o mesmo eixo", () => {
    const entrada = { stars: 900, followers: 120, repos: 40, years: 7, languages: 5 };
    expect(dominantAxisForProfile(entrada)).toBe(dominantAxisForProfile(entrada));
  });

  /*
   * Sem desempate fixo, dois eixos empatados poderiam sair em ordem diferente
   * entre duas gerações da mesma carta — e a carta trocaria de tag sem nada ter
   * mudado no GitHub. Conta zerada é o caso mais comum de empate que existe.
   */
  it("desempata pela ordem de AXES quando tudo empata em zero", () => {
    const zerado = { stars: 0, followers: 0, repos: 0, years: 0, languages: 0 };
    expect(dominantAxisForProfile(zerado)).toBe(AXES[0]);
  });

  it("aponta o eixo realmente dominante do perfil", () => {
    // Muitos repositórios, pouca tração: volume ganha com folga dos outros.
    expect(
      dominantAxisForProfile({ stars: 50, followers: 20, repos: 800, years: 8, languages: 4 }),
    ).toBe("volume");

    // Conta nova que só escreve numa linguagem: sobra a veterania.
    expect(
      dominantAxisForProfile({ stars: 0, followers: 0, repos: 2, years: 4, languages: 1 }),
    ).toBe("veterancy");
  });

  /*
   * O teto satura, e isso é escolha e não bug: `CEILINGS.reach` é 250.000, e
   * sindresorhus tem 851.000 estrelas. Quem passa do teto empata com quem está
   * nele, então no topo absoluto o eixo tende a `reach` mesmo com 1.141
   * repositórios (que dão 98 contra o 99 saturado). Registrar isto num teste
   * evita que alguém "conserte" o clamp sem perceber que ele é o desenho.
   */
  it("satura no teto em vez de premiar quem passa dele", () => {
    expect(
      dominantAxisForProfile({
        stars: 851_000,
        followers: 81_000,
        repos: 1_141,
        years: 17,
        languages: 6,
      }),
    ).toBe("reach");
  });

  /*
   * `POLY` é exclusiva de perfil. Não é regra especial inventada para criar
   * escassez: um repositório tem uma linguagem dominante por construção, e
   * "amplitude de linguagens" não é pergunta que se faça a ele.
   */
  it("nunca devolve breadth para repositório", () => {
    const casos = [
      { stars: 0, forks: 0, openIssues: 0, years: 0 },
      { stars: 400_000, forks: 80_000, openIssues: 10_000, years: 20 },
      { stars: 1, forks: 99_999, openIssues: 3, years: 1 },
    ];
    for (const caso of casos) expect(dominantAxisForRepo(caso)).not.toBe("breadth");
  });

  it("separa os eixos do repositório pelas métricas próprias dele", () => {
    // Biblioteca muito estrelada e pouco forkada: alcance com folga.
    expect(dominantAxisForRepo({ stars: 200_000, forks: 900, openIssues: 40, years: 6 })).toBe(
      "reach",
    );

    // Monorepo de organização: fila de issues enorme para o que ele tem de estrela.
    expect(dominantAxisForRepo({ stars: 400, forks: 90, openIssues: 9_000, years: 5 })).toBe(
      "volume",
    );

    // Projeto antigo e parado: só a idade sobrou.
    expect(dominantAxisForRepo({ stars: 3, forks: 0, openIssues: 0, years: 15 })).toBe(
      "veterancy",
    );
  });
});
