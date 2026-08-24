import { describe, expect, it } from "vitest";
import {
  bandsFromCalendar,
  bandsFromCommitActivity,
  levelsFromCounts,
} from "@/lib/cards/contributions";
import layout from "@/lib/cards/layout.json";
import { contributionGridSvg, gridGeometry } from "@/lib/og/contributionGrid";
import type {
  GitHubCommitActivityWeek,
  GitHubContributionCalendar,
} from "@/lib/github/types";

/** Um ano de calendário como o GraphQL devolve, a partir de contagens por dia. */
function calendar(year: number, counts: number[]): GitHubContributionCalendar {
  const weeks: GitHubContributionCalendar["weeks"] = [];
  // 1º de janeiro em diante, uma semana por bloco de 7 dias corridos. Não
  // reproduz a semana parcial da borda de propósito — quem testa isso é o teste
  // de alinhamento por dia da semana, logo abaixo.
  for (let i = 0; i < counts.length; i += 7) {
    weeks.push({
      contributionDays: counts.slice(i, i + 7).map((contributionCount, d) => ({
        date: isoDay(year, i + d),
        contributionCount,
      })),
    });
  }
  return { weeks };
}

function isoDay(year: number, offset: number): string {
  const date = new Date(Date.UTC(year, 0, 1 + offset));
  return date.toISOString().slice(0, 10);
}

function activityWeek(days: number[], week = 1_700_000_000): GitHubCommitActivityWeek {
  return { days, total: days.reduce((a, b) => a + b, 0), week };
}

describe("levelsFromCounts", () => {
  it("mantém dia sem contribuição no nível 0", () => {
    expect(levelsFromCounts([0, 0, 0])).toEqual([0, 0, 0]);
  });

  it("distribui os não-zero pelos próprios quartis", () => {
    // 1..8: q1 = 2, q2 = 4, q3 = 6.
    expect(levelsFromCounts([1, 2, 3, 4, 5, 6, 7, 8])).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
  });

  it("não deixa o zero contaminar os quartis", () => {
    // Os zeros ficam fora da distribuição: os quatro não-zero se dividem igual.
    expect(levelsFromCounts([0, 1, 0, 2, 0, 3, 0, 4])).toEqual([0, 1, 0, 2, 0, 3, 0, 4]);
  });

  it("põe série não-zero uniforme toda no nível 1", () => {
    // Os quatro quartis coincidem, e um ano sem variação é um ano sem relevo.
    expect(levelsFromCounts([5, 5, 5, 5])).toEqual([1, 1, 1, 1]);
  });
});

describe("bandsFromCalendar", () => {
  it("dá uma banda por ano, em ordem cronológica, com weeks * 7 níveis", () => {
    const bands = bandsFromCalendar([
      { year: 2023, calendar: calendar(2023, Array(364).fill(1)) },
      { year: 2024, calendar: calendar(2024, Array(364).fill(2)) },
    ]);

    expect(bands.map((band) => band.label)).toEqual(["2023", "2024"]);
    for (const band of bands) {
      expect(band.weeks).toBe(52);
      expect(band.levels).toHaveLength(band.weeks * 7);
    }
  });

  it("apara anos vazios das pontas", () => {
    const bands = bandsFromCalendar([
      { year: 2021, calendar: calendar(2021, Array(364).fill(0)) },
      { year: 2022, calendar: calendar(2022, Array(364).fill(3)) },
      { year: 2023, calendar: calendar(2023, Array(364).fill(0)) },
    ]);

    expect(bands.map((band) => band.label)).toEqual(["2022"]);
  });

  it("preserva ano vazio no meio da história", () => {
    // Apagá-lo encostaria 2021 em 2023 e mentiria sobre a linha do tempo.
    const bands = bandsFromCalendar([
      { year: 2021, calendar: calendar(2021, Array(364).fill(1)) },
      { year: 2022, calendar: calendar(2022, Array(364).fill(0)) },
      { year: 2023, calendar: calendar(2023, Array(364).fill(1)) },
    ]);

    expect(bands.map((band) => band.label)).toEqual(["2021", "2022", "2023"]);
  });

  it("alinha o dia pela semana de verdade, não pela posição no array", () => {
    // Uma semana parcial de um dia só: 2024-01-03 é quarta-feira (getUTCDay 3),
    // então o nível tem que cair na linha 3, não na linha 0.
    const bands = bandsFromCalendar([
      {
        year: 2024,
        calendar: {
          weeks: [{ contributionDays: [{ date: "2024-01-03", contributionCount: 9 }] }],
        },
      },
    ]);

    expect(bands[0].levels[3]).toBe(1);
    expect(bands[0].levels[0]).toBe(0);
  });

  it("devolve nada quando não há ano nenhum", () => {
    expect(bandsFromCalendar([])).toEqual([]);
  });
});

describe("bandsFromCommitActivity", () => {
  it("condensa as 52 semanas numa banda só", () => {
    const weeks = Array.from({ length: 52 }, (_, i) =>
      activityWeek([0, i, 0, 0, 0, 0, 0], 1_700_000_000 + i * 604_800),
    );
    const bands = bandsFromCommitActivity(weeks);

    expect(bands).toHaveLength(1);
    expect(bands[0].weeks).toBe(52);
    expect(bands[0].levels).toHaveLength(364);
  });

  it("devolve nada com estatística fria ou repositório parado", () => {
    expect(bandsFromCommitActivity([])).toEqual([]);
    expect(bandsFromCommitActivity([activityWeek([0, 0, 0, 0, 0, 0, 0])])).toEqual([]);
  });

  it("ignora semana malformada", () => {
    expect(bandsFromCommitActivity([{ days: [1, 2], total: 3, week: 1 }])).toEqual([]);
  });
});

describe("contributionGridSvg", () => {
  const full = { label: "2024", weeks: 52, levels: Array(364).fill(4) };

  it("não desenha nada sem banda", () => {
    expect(contributionGridSvg([], "#000")).toBeNull();
  });

  it("não desenha nada quando todos os dias são nível 0", () => {
    expect(
      contributionGridSvg([{ label: "2024", weeks: 52, levels: Array(364).fill(0) }], "#000"),
    ).toBeNull();
  });

  it("cobre a face inteira e ancora a última banda no rodapé", () => {
    const svg = contributionGridSvg([full], "#123456");
    expect(svg).toContain(`width="${layout.width}"`);
    expect(svg).toContain(`height="${layout.height}"`);
    expect(svg).toContain('fill="#123456"');

    // Topo da única banda: âncora menos a altura dela.
    const top = layout.height - layout.contributions.bottom - gridGeometry.BAND_HEIGHT;
    expect(svg).toContain(`v${layout.contributions.cell}`);
    expect(ys(svg!).sort((a, b) => a - b)[0]).toBeCloseTo(top, 1);
  });

  it("não emite célula nenhuma dentro da janela da arte", () => {
    const bands = Array.from({ length: 8 }, (_, i) => ({ ...full, label: String(2017 + i) }));
    const svg = contributionGridSvg(bands, "#000", { exclude: layout.window })!;

    const inside = points(svg).filter(
      ([x, y]) =>
        x < layout.window.x + layout.window.width &&
        x + layout.contributions.cell > layout.window.x &&
        y < layout.window.y + layout.window.height &&
        y + layout.contributions.cell > layout.window.y,
    );
    expect(inside).toHaveLength(0);
  });

  it("descarta banda inteira acima do corte do full-art", () => {
    const bands = Array.from({ length: 8 }, (_, i) => ({ ...full, label: String(2017 + i) }));
    const svg = contributionGridSvg(bands, "#000", {
      clipTop: layout.fullArt.bottomScrimTop,
    })!;

    expect(Math.min(...ys(svg))).toBeGreaterThanOrEqual(layout.fullArt.bottomScrimTop);
  });

  it("guarda no máximo `maxBands` bandas, mantendo as mais recentes", () => {
    const bands = Array.from({ length: 12 }, (_, i) => ({ ...full, label: String(2013 + i) }));
    const svg = contributionGridSvg(bands, "#000")!;

    const rows = new Set(ys(svg));
    // 7 linhas por banda, e nada acima da borda da carta.
    expect(rows.size).toBeLessThanOrEqual(7 * layout.contributions.maxBands);
    expect(Math.min(...rows)).toBeGreaterThanOrEqual(layout.border);
  });

  it("separa os níveis em caminhos de opacidade distinta", () => {
    const svg = contributionGridSvg(
      [{ label: "2024", weeks: 1, levels: [1, 2, 3, 4, 0, 0, 0] }],
      "#000",
    )!;

    expect(svg.match(/fill-opacity/g)).toHaveLength(4);
    expect(svg).toContain('fill-opacity="0.25"');
    expect(svg).toContain('fill-opacity="1"');
  });
});

/** Coordenadas de todo `M x y` do SVG. */
function points(svg: string): [number, number][] {
  return [...svg.matchAll(/M(-?[\d.]+) (-?[\d.]+)/g)].map(
    (match) => [Number(match[1]), Number(match[2])] as [number, number],
  );
}

function ys(svg: string): number[] {
  return points(svg).map(([, y]) => y);
}
