/**
 * As duas assinaturas de radar: a do perfil e a do repositório.
 *
 * **Isto é assinatura, não medição.** O radar existe para dar ao sujeito uma
 * silhueta reconhecível — dois devs diferentes viram polígonos diferentes de
 * relance, e o mesmo vale para dois repositórios —, e não para comparar
 * grandezas.
 *
 * A distinção importa porque um radar de cinco eixos é, na prática, um gráfico
 * de cinco escalas independentes: estrelas, seguidores, repositórios, anos e
 * linguagens não têm unidade comum. A forma do polígono e a área dele são
 * artefato dos tetos escolhidos aqui, não do sujeito. Mudar `CEILINGS.reach`
 * de 250k para 100k desenha outro polígono para o mesmo dev, sem nada ter
 * mudado no GitHub dele.
 *
 * Consequências assumidas no componente que desenha:
 *
 * - Sem marcação numérica nos eixos. Régua numerada promete uma precisão que a
 *   normalização não sustenta.
 * - Os números reais moram na lista de derivações ao lado, com a frase de
 *   motivo. O radar dá a forma; a lista dá o dado.
 */
export const PROFILE_AXES = [
  "reach",
  "community",
  "volume",
  "veterancy",
  "breadth",
] as const;
export type ProfileAxis = (typeof PROFILE_AXES)[number];

/**
 * Eixos da assinatura do repositório. Quatro coincidem com os do perfil; o
 * quinto é **activity** no lugar de **breadth** — um repositório tem uma
 * linguagem dominante, então "amplitude" não significaria nada aqui. Recência
 * do último push é o análogo de "veterania": um eixo que o perfil não tem.
 */
export const REPO_AXES = [
  "reach",
  "community",
  "volume",
  "veterancy",
  "activity",
] as const;
export type RepoAxis = (typeof REPO_AXES)[number];

/** União das duas assinaturas; `AxisRating.axis` aceita qualquer uma. */
export type Axis = ProfileAxis | RepoAxis;

/** Eixos do perfil. Mantido com o nome curto pelos consumidores antigos. */
export const AXES = PROFILE_AXES;

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
export const CEILINGS: Record<ProfileAxis, number> = {
  reach: 250_000,
  community: 320_000,
  volume: 1_200,
  veterancy: 20,
  breadth: 12,
};

/**
 * Teto de cada eixo da assinatura do repositório.
 *
 * `reach` e `veterancy` repetem os do perfil de propósito: estrelas saturavam
 * num número só (torvalds é quem chega perto), e um repo não envelhece mais
 * que um dev. Os outros três são do mundo do repo:
 *
 * - `community` (forks): teto calibrado no maior repo do GitHub. Linux tem
 *   ~90k forks; quem bate 100k empatou com o topo.
 * - `volume` (issues abertas): fila de recuo (Q5). 5000 issues abertas é um
 *   número que nem repositório abandonado de grande porte costuma passar.
 * - `activity` (dias desde o último push): **invertido**. Quem empurrou hoje
 *   satura; quem não empurra há 730 dias (2 anos) zera. É o único eixo em que
 *   um número alto é ruim, e por isso o `value` é `99 - normalize(...)`.
 */
export const REPO_CEILINGS: Record<RepoAxis, number> = {
  reach: 250_000,
  community: 100_000,
  volume: 5_000,
  veterancy: 20,
  activity: 730,
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
 *
 * Exportada porque `./tag.ts` deriva o eixo dominante da mesma normalização.
 * Comparar eixos de unidades diferentes só é honesto se todos passarem pela
 * mesma curva — duplicar a função ali deixaria as duas livres para divergir, que
 * é exatamente o defeito que `foil.json` foi criado para fechar no foil.
 */
export function normalize(value: number, ceiling: number): number {
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
  const raw: Record<ProfileAxis, number> = {
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
 * Entrada da assinatura do repositório. `daysSincePush` é o que GitHubRepo
 * fornece (`pushed_at`); `null` vira `Infinity` aqui para saturar o zero.
 */
export interface RepoRatingInput {
  stars: number;
  forks: number;
  issues: number;
  years: number;
  daysSincePush: number;
}

/**
 * Assinatura do repositório em cinco eixos — ver `REPO_AXES`/`REPO_CEILINGS`.
 *
 * A recência é o único eixo invertido: `daysSincePush` alto é pouco
 * atividade, então o valor sai de `99 - normalize(...)`. O `raw` continua o
 * número cru (dias desde o último push) para a tabela acessível não mentir
 * sobre o que o ponto significa.
 */
export function repoRatingsFor(input: RepoRatingInput): AxisRating[] {
  return [
    { axis: "reach", value: normalize(input.stars, REPO_CEILINGS.reach), raw: input.stars },
    { axis: "community", value: normalize(input.forks, REPO_CEILINGS.community), raw: input.forks },
    { axis: "volume", value: normalize(input.issues, REPO_CEILINGS.volume), raw: input.issues },
    { axis: "veterancy", value: normalize(input.years, REPO_CEILINGS.veterancy), raw: input.years },
    {
      axis: "activity",
      value: 99 - normalize(input.daysSincePush, REPO_CEILINGS.activity),
      raw: input.daysSincePush,
    },
  ];
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
