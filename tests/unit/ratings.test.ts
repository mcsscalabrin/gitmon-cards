import { describe, expect, it } from "vitest";
import {
  AXES,
  CEILINGS,
  polygonPoints,
  ratingsFor,
  REPO_AXES,
  REPO_CEILINGS,
  repoRatingsFor,
} from "@/lib/cards/ratings";

const zero = { stars: 0, followers: 0, repos: 0, years: 0, languages: 0 };
const zeroRepo = { stars: 0, forks: 0, issues: 0, years: 0, daysSincePush: 0 };

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

describe("assinatura do repositório", () => {
  const activity = (r: ReturnType<typeof repoRatingsFor>) =>
    r.find((item) => item.axis === "activity");

  it("assina em cinco eixos próprios, com activity no lugar de breadth", () => {
    const ratings = repoRatingsFor(zeroRepo);
    expect(ratings.map((r) => r.axis)).toEqual([...REPO_AXES]);
    expect(ratings.map((r) => r.axis)).not.toContain("breadth");
  });

  it("inverte a recência: push hoje satura, 2 anos zera", () => {
    const hoje = repoRatingsFor({ ...zeroRepo, daysSincePush: 0 });
    const parado = repoRatingsFor({ ...zeroRepo, daysSincePush: REPO_CEILINGS.activity });
    expect(activity(hoje)?.value).toBe(99);
    expect(activity(parado)?.value).toBe(0);
  });

  it("satura em 99 no teto dos quatro eixos diretos", () => {
    const noTeto = repoRatingsFor({
      stars: REPO_CEILINGS.reach,
      forks: REPO_CEILINGS.community,
      issues: REPO_CEILINGS.volume,
      years: REPO_CEILINGS.veterancy,
      daysSincePush: 0,
    });
    expect(noTeto.map((r) => r.value)).toEqual([99, 99, 99, 99, 99]);
  });

  it("preserva os dias desde o último push no raw, sem mentir que é nota", () => {
    const ratings = repoRatingsFor({ ...zeroRepo, daysSincePush: 123 });
    expect(activity(ratings)?.raw).toBe(123);
  });

  it("dá espaço visível à faixa comum de estrelas — mesma escala log do perfil", () => {
    const modesto = repoRatingsFor({ ...zeroRepo, stars: 500 });
    expect(modesto[0].value).toBeGreaterThan(20);
    expect(modesto[0].value).toBeLessThan(70);
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
