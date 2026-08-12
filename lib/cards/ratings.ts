/**
 * Os cinco eixos da assinatura do perfil.
 *
 * **Isto é assinatura, não medição.** O radar existe para dar ao perfil uma
 * silhueta reconhecível — dois devs diferentes viram polígonos diferentes de
 * relance —, e não para comparar grandezas.
 *
 * A distinção importa porque um radar de cinco eixos é, na prática, um gráfico
 * de cinco escalas independentes: estrelas, seguidores, repositórios, anos e
 * linguagens não têm unidade comum. A forma do polígono e a área dele são
 * artefato dos tetos escolhidos aqui, não do perfil. Mudar `CEILINGS.stars` de
 * 250k para 100k desenha outro polígono para o mesmo dev, sem nada ter mudado
 * no GitHub dele.
 *
 * Consequências assumidas no componente que desenha:
 *
 * - Sem marcação numérica nos eixos. Régua numerada promete uma precisão que a
 *   normalização não sustenta.
 * - Os números reais moram na lista de derivações ao lado, com a frase de
 *   motivo. O radar dá a forma; a lista dá o dado.
 */
export const AXES = ["reach", "community", "volume", "veterancy", "breadth"] as const;

export type Axis = (typeof AXES)[number];

/**
 * Teto de cada eixo: o valor que satura em 99.
 *
 * Calibrado contra os mesmos perfis reais que calibraram a raridade — o topo do
 * GitHub, não um número redondo. `torvalds` tem 254k estrelas e 316k seguidores;
 * `sindresorhus`, 1141 repositórios. Um perfil no teto de um eixo é um perfil
 * que empata com o maior que existe naquele eixo.
 *
 * Mexer aqui muda a silhueta de todo mundo de uma vez. É o preço de haver teto.
 */
export const CEILINGS: Record<Axis, number> = {
  reach: 250_000,
  community: 320_000,
  volume: 1_200,
  veterancy: 20,
  breadth: 12,
};

export interface AxisRating {
  axis: Axis;
  /** 0 a 99. */
  value: number;
  /** O número cru de onde saiu, para a legenda e a tabela acessível. */
  raw: number;
}

/**
 * Escala logarítmica, não linear.
 *
 * Numa escala linear, todo perfil que não é celebridade colapsa contra o eixo:
 * 500 estrelas contra um teto de 250.000 dá 0,2 — o polígono de quase todo mundo
 * viraria um ponto no centro. Em log, a diferença entre 5 e 50 estrelas ocupa
 * tanto espaço quanto entre 50k e 250k, que é como as pessoas de fato percebem
 * a diferença.
 */
function normalize(value: number, ceiling: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const ratio = Math.log1p(value) / Math.log1p(ceiling);
  return Math.max(0, Math.min(99, Math.round(ratio * 99)));
}

export interface RatingInput {
  stars: number;
  followers: number;
  repos: number;
  years: number;
  languages: number;
}

export function ratingsFor(input: RatingInput): AxisRating[] {
  const raw: Record<Axis, number> = {
    reach: input.stars,
    community: input.followers,
    volume: input.repos,
    veterancy: input.years,
    breadth: input.languages,
  };

  return AXES.map((axis) => ({
    axis,
    value: normalize(raw[axis], CEILINGS[axis]),
    raw: raw[axis],
  }));
}

/**
 * Pontos do polígono no espaço do SVG.
 *
 * Wrapper que normaliza AxisRating[] e delega para lib/radar.ts.
 */
export function polygonPoints(
  ratings: AxisRating[],
  radius: number,
  center: number,
): string {
  return ratings
    .map((rating, index) => {
      const angle = (index / ratings.length) * Math.PI * 2 - Math.PI / 2;
      const distance = (rating.value / 99) * radius;
      const x = center + Math.cos(angle) * distance;
      const y = center + Math.sin(angle) * distance;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

/** Vértices da grade de fundo, num anel de raio proporcional. */
export function gridPoints(sides: number, radius: number, center: number): string {
  return Array.from({ length: sides }, (_, index) => {
    const angle = (index / sides) * Math.PI * 2 - Math.PI / 2;
    const x = center + Math.cos(angle) * radius;
    const y = center + Math.sin(angle) * radius;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
}

/** Posição do rótulo de um eixo, afastado do vértice. */
export function labelPosition(
  index: number,
  total: number,
  radius: number,
  center: number,
): { x: number; y: number; anchor: "start" | "middle" | "end" } {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  const x = center + Math.cos(angle) * radius;
  const y = center + Math.sin(angle) * radius;
  const cos = Math.cos(angle);
  return {
    x,
    y,
    anchor: Math.abs(cos) < 0.3 ? "middle" : cos > 0 ? "start" : "end",
  };
}
