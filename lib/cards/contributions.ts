import type {
  GitHubCommitActivityWeek,
  GitHubContributionCalendar,
} from "../github/types";

/**
 * A trama de fundo da carta: o contribution graph do GitHub, uma banda por ano.
 *
 * Este módulo só transforma dado em níveis — a geometria mora em
 * `layout.json` (bloco `contributions`) e o desenho em `lib/og/contributionGrid.ts`.
 *
 * As duas fontes chegam aqui em formatos diferentes e saem no mesmo:
 *
 *   perfil        GraphQL, `contributionCalendar`, até 8 anos
 *   repositório   REST, `stats/commit_activity`, sempre 1 ano (52 semanas)
 *
 * A ponte entre elas é a **ordem das linhas**: as duas usam domingo a sábado,
 * que é o eixo vertical do grafo do GitHub. Sem isso, uma banda de repositório
 * ficaria com os dias da semana embaralhados em relação à de perfil.
 */

/** Uma faixa horizontal da grade: um ano de calendário, ou as 52 semanas de um repo. */
export interface ContributionBand {
  /** Rótulo do período. Não é impresso — existe para teste e derivação futura. */
  label: string;
  /** Número de colunas (semanas). 52 ou 53 conforme o ano, nunca fixo. */
  weeks: number;
  /**
   * Intensidade de cada dia, 0..4, em ordem coluna-major: semana a semana, e
   * dentro de cada semana de domingo a sábado. Comprimento sempre `weeks * 7`.
   *
   * As semanas de borda do calendário são **parciais** — ele começa no domingo
   * da semana que contém 1º de janeiro —, então as posições que não correspondem
   * a nenhum dia ficam em 0. Nível 0 não desenha nada, então o buraco não vaza
   * para a imagem.
   */
  levels: number[];
}

/** Quantos níveis de intensidade, contando o zero. É a escada do próprio GitHub. */
export const LEVELS = 5;

/**
 * Contagens diárias → níveis 0..4.
 *
 * Dia sem contribuição é nível 0. Os dias **não-zero** são fatiados pelos
 * próprios quartis, e não por limiares absolutos.
 *
 * É a mesma escolha que `lib/cards/repo.ts` faz ao usar log10 no HP, pelo mesmo
 * motivo: com limiar fixo, quem commita muito sai com oito bandas sólidas e quem
 * commita pouco sai com oito bandas quase vazias — nos dois extremos a trama para
 * de dizer qualquer coisa sobre a forma do ano. Relativo à própria distribuição,
 * toda carta mostra onde **aquela** pessoa se concentrou.
 *
 * O preço, que é consciente: a intensidade não é comparável entre duas cartas.
 * Ela nunca precisou ser — quem compara é o radar e a batalha, com números; esta
 * camada é textura de fundo, e a leitura que ela precisa entregar é o ritmo.
 *
 * Série não-zero uniforme cai toda no nível 1: os quatro quartis coincidem, e um
 * ano sem variação é, corretamente, um ano sem relevo.
 */
export function levelsFromCounts(counts: number[]): number[] {
  const nonZero = counts.filter((count) => count > 0).sort((a, b) => a - b);
  if (!nonZero.length) return counts.map(() => 0);

  const q1 = quantile(nonZero, 0.25);
  const q2 = quantile(nonZero, 0.5);
  const q3 = quantile(nonZero, 0.75);

  return counts.map((count) => {
    if (count <= 0) return 0;
    if (count <= q1) return 1;
    if (count <= q2) return 2;
    if (count <= q3) return 3;
    return 4;
  });
}

/** Quantil por posto mais próximo, sobre um array já ordenado. */
function quantile(sorted: number[], p: number): number {
  const rank = Math.ceil(p * sorted.length) - 1;
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank))];
}

/**
 * Calendários anuais do GraphQL → bandas, do ano mais antigo para o mais recente.
 *
 * **Anos vazios das pontas são aparados; os do meio, nunca.** Uma conta criada em
 * 2021 não deve produzir três bandas invisíveis de 2018–2020 no topo, e um ano
 * corrente ainda sem commit não deve abrir um vão exatamente na âncora do rodapé.
 * Mas um ano parado **no meio** da história é dado: apagá-lo encostaria 2020 em
 * 2022 e mentiria sobre a linha do tempo, que é a única coisa que esta camada
 * tem a dizer.
 */
export function bandsFromCalendar(
  years: { year: number; calendar: GitHubContributionCalendar }[],
): ContributionBand[] {
  const bands = years.map(({ year, calendar }) => {
    const weeks = calendar.weeks.length;
    const counts = new Array<number>(weeks * 7).fill(0);

    calendar.weeks.forEach((week, w) => {
      for (const day of week.contributionDays) {
        // A linha é o dia da semana de verdade, não a posição no array: as
        // semanas de borda vêm parciais e alinhar por índice deslocaria o ano
        // inteiro em relação às outras bandas.
        const row = new Date(`${day.date}T00:00:00Z`).getUTCDay();
        if (Number.isNaN(row)) continue;
        counts[w * 7 + row] = day.contributionCount;
      }
    });

    return { label: String(year), weeks, levels: levelsFromCounts(counts) };
  });

  return trimEmptyEdges(bands);
}

/**
 * `stats/commit_activity` → uma banda.
 *
 * Sempre uma: o endpoint é uma janela móvel de 52 semanas e não existe versão
 * dele com mais história (ver `fetchRepoCommitActivity`). A carta de repositório
 * tem, por construção, um oitavo da trama que uma carta de perfil antiga tem.
 */
export function bandsFromCommitActivity(
  weeks: GitHubCommitActivityWeek[],
): ContributionBand[] {
  const usable = weeks.filter((week) => Array.isArray(week.days) && week.days.length === 7);
  if (!usable.length) return [];

  const counts = usable.flatMap((week) => week.days);
  const levels = levelsFromCounts(counts);
  if (levels.every((level) => level === 0)) return [];

  const first = new Date(usable[0].week * 1000).getUTCFullYear();
  const last = new Date(usable[usable.length - 1].week * 1000).getUTCFullYear();

  return [
    {
      label: first === last ? String(first) : `${first}–${last}`,
      weeks: usable.length,
      levels,
    },
  ];
}

/** Remove bandas totalmente vazias das pontas, preservando as do meio. */
function trimEmptyEdges(bands: ContributionBand[]): ContributionBand[] {
  const filled = (band: ContributionBand) => band.levels.some((level) => level > 0);
  let start = 0;
  let end = bands.length;
  while (start < end && !filled(bands[start])) start++;
  while (end > start && !filled(bands[end - 1])) end--;
  return bands.slice(start, end);
}
