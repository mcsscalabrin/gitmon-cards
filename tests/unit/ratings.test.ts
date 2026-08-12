import { describe, expect, it } from "vitest";
import { AXES, CEILINGS, polygonPoints, ratingsFor } from "@/lib/cards/ratings";

const zero = { stars: 0, followers: 0, repos: 0, years: 0, languages: 0 };

describe("normalização dos eixos", () => {
  it("devolve um valor por eixo, na ordem declarada", () => {
    const ratings = ratingsFor(zero);
    expect(ratings.map((r) => r.axis)).toEqual([...AXES]);
  });

  it("zera um perfil vazio sem quebrar", () => {
    expect(ratingsFor(zero).every((r) => r.value === 0)).toBe(true);
  });

  it("satura em 99 no teto e não passa disso", () => {
    const noTeto = ratingsFor({
      stars: CEILINGS.reach,
      followers: CEILINGS.community,
      repos: CEILINGS.volume,
      years: CEILINGS.veterancy,
      languages: CEILINGS.breadth,
    });
    expect(noTeto.every((r) => r.value === 99)).toBe(true);

    // Acima do teto continua 99: `torvalds` tem mais estrelas que o teto e não
    // pode desenhar um polígono que vaze para fora da grade.
    const acima = ratingsFor({ ...zero, stars: CEILINGS.reach * 10 });
    expect(acima[0].value).toBe(99);
  });

  it("é monotônica: mais métrica nunca dá nota menor", () => {
    let anterior = -1;
    for (let stars = 0; stars <= CEILINGS.reach; stars += 500) {
      const atual = ratingsFor({ ...zero, stars })[0].value;
      expect(atual).toBeGreaterThanOrEqual(anterior);
      anterior = atual;
    }
  });

  /*
   * O motivo de a escala ser logarítmica. Em linear, 500 estrelas contra um teto
   * de 250.000 daria 0 — o polígono de quase todo mundo colapsaria no centro e o
   * gráfico só serviria para celebridades.
   */
  it("dá espaço visível à faixa em que quase todo mundo vive", () => {
    const modesto = ratingsFor({ ...zero, stars: 500 })[0].value;
    expect(modesto).toBeGreaterThan(20);
    expect(modesto).toBeLessThan(70);
  });

  it("preserva o número cru ao lado da nota, para a tabela acessível", () => {
    const ratings = ratingsFor({ ...zero, stars: 1234 });
    expect(ratings[0].raw).toBe(1234);
  });

  it("trata entrada inválida como zero em vez de propagar NaN", () => {
    const ratings = ratingsFor({ ...zero, stars: Number.NaN, followers: -5 });
    expect(ratings[0].value).toBe(0);
    expect(ratings[1].value).toBe(0);
  });
});

describe("geometria do polígono", () => {
  it("gera um par de coordenadas por eixo", () => {
    const pontos = polygonPoints(ratingsFor(zero), 80, 120).split(" ");
    expect(pontos).toHaveLength(AXES.length);
    expect(pontos.every((p) => /^-?\d+\.\d{2},-?\d+\.\d{2}$/.test(p))).toBe(true);
  });

  it("colapsa no centro quando tudo é zero", () => {
    const pontos = polygonPoints(ratingsFor(zero), 80, 120).split(" ");
    expect(pontos.every((p) => p === "120.00,120.00")).toBe(true);
  });

  /*
   * O primeiro eixo aponta para cima. Um polígono apoiado num vértice superior
   * lê como emblema; rotacionado, lê como defeito de renderização.
   */
  it("põe o primeiro eixo no topo", () => {
    const cheio = ratingsFor({
      stars: CEILINGS.reach,
      followers: CEILINGS.community,
      repos: CEILINGS.volume,
      years: CEILINGS.veterancy,
      languages: CEILINGS.breadth,
    });
    const [primeiro] = polygonPoints(cheio, 80, 120).split(" ");
    const [x, y] = primeiro.split(",").map(Number);
    expect(x).toBeCloseTo(120, 1);
    expect(y).toBeCloseTo(40, 1);
  });
});
