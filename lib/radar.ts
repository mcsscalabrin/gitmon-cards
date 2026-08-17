/**
 * Geometria compartilhada do radar.
 *
 * Extraída de `lib/cards/ratings.ts` para servir tanto o RadarChart do perfil
 * quanto visualizações de batalha. Funções puras de geometria SVG — sem
 * dependência de React, i18n ou dados de perfil.
 *
 * O polígono começa em -90° (primeiro eixo aponta para cima) para ler como
 * emblema; rotacionado, lê como erro.
 */

export interface RadarVertex {
  x: number;
  y: number;
}

export interface RadarLabel extends RadarVertex {
  label: string;
  /**
   * `text-anchor` do rótulo.
   *
   * Ancorar tudo em `middle` centraliza o texto **sobre o ponto do eixo**, e o
   * ponto do eixo está a poucos pixels da grade: um rótulo longo num eixo
   * lateral cresce metade para fora e metade para dentro, e a metade de dentro
   * cai em cima do polígono ("COMUNIDADE" encostava na aresta). Com `start` à
   * direita e `end` à esquerda, o texto cresce sempre para fora.
   *
   * `middle` fica só para os eixos perto da vertical, onde não há lado de fora
   * horizontal para onde crescer.
   */
  anchor: "start" | "middle" | "end";
}

export interface RadarGeometry {
  center: number;
  radius: number;
  /** Corners of the data polygon, one per axis. */
  vertices: RadarVertex[];
  /**
   * Outer end of each axis, at the full radius — where the spokes stop.
   *
   * Separate from `vertices` because the grid is structure, not data: a spoke
   * that stops at the data point makes the grid change shape with the profile,
   * and the rings (always drawn full) stop agreeing with it.
   */
  axes: RadarVertex[];
  /** SVG `points` attribute for the data polygon. */
  points: string;
  /** Concentric polygon outlines at the given fractions of the radius. */
  rings: string[];
  /** One polygon wedge per axis: centre → edge-mid → vertex → edge-mid. */
  sectors: string[];
  /** One label per axis, anchored just outside the outer ring. */
  labels: RadarLabel[];
}

const RING_FRACTIONS = [1 / 3, 2 / 3, 1];
const RADIUS_SHARE = 0.72;
const LABEL_GAP_SHARE = 0.1;

/**
 * Folga lateral do `viewBox`, em fração do lado.
 *
 * Os rótulos são posicionados **fora** do raio (`LABEL_GAP_SHARE`) e crescem
 * para fora a partir dali, então o texto sempre termina além da caixa quadrada
 * que o desenho ocupa: medido, "Comunidade" chega a 299,5 num `viewBox` de 240,
 * quase 60 unidades para fora. Enquanto o SVG era `overflow: visible` isso não
 * aparecia na mesa — sobrava coluna ao lado —, mas no telefone a coluna acaba
 * antes do texto e o rótulo era cortado pela borda da tela.
 *
 * A correção é geométrica, e é por isso que mora aqui e não numa media query:
 * com os rótulos **dentro** do `viewBox`, o SVG inteiro escala junto e não
 * existe largura de container em que eles possam vazar. O 0,33 dá 80 unidades
 * de cada lado a 240, o que deixa ~20 de sobra sobre o rótulo mais longo dos
 * dois idiomas — folga para tradução sem encolher o radar à toa.
 *
 * Só na horizontal: na vertical os rótulos do topo e da base ficam a 9,6 e
 * 209,3, confortavelmente dentro da caixa.
 */
const LABEL_PAD_SHARE = 0.33;

/**
 * O `viewBox` que contém o desenho **e** os rótulos.
 *
 * Compartilhado pelo radar da carta e pelo da batalha: os dois usam
 * `radarGeometry` com a mesma colocação de rótulo, logo têm o mesmo transbordo.
 */
export function radarViewBox(size: number): string {
  const pad = size * LABEL_PAD_SHARE;
  return `${-pad} 0 ${size + pad * 2} ${size}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Angle for axis `i`, starting at -90° (top) and going clockwise. */
function angleFor(i: number, sides: number): number {
  return ((-90 + (i * 360) / sides) * Math.PI) / 180;
}

function at(center: number, radius: number, i: number, sides: number): RadarVertex {
  const angle = angleFor(i, sides);
  return {
    x: round2(center + radius * Math.cos(angle)),
    y: round2(center + radius * Math.sin(angle)),
  };
}

/** SVG `points` for a regular polygon with `sides` sides at the given radius. */
export function polygonPoints(sides: number, radius: number, center: number): string {
  return Array.from({ length: sides }, (_, i) => {
    const { x, y } = at(center, radius, i, sides);
    return `${x},${y}`;
  }).join(" ");
}

/** One wedge of the polygon: centre → edge midpoint → vertex → edge midpoint. */
export function radarSector(center: number, radius: number, axis: number, sides: number): string {
  const theta = angleFor(axis, sides);
  const mid = radius * Math.cos(Math.PI / sides);
  const pt = (r: number, a: number) =>
    `${round2(center + r * Math.cos(a))},${round2(center + r * Math.sin(a))}`;
  return [
    `${center},${center}`,
    pt(mid, theta - Math.PI / sides),
    pt(radius, theta),
    pt(mid, theta + Math.PI / sides),
  ].join(" ");
}

/**
 * Full radar geometry for a set of normalized values (0–99).
 *
 * `values` must be in axis order. The number of elements determines the
 * polygon's side count — works for 5 (profile) or any other number.
 */
export function radarGeometry(
  values: number[],
  labels: string[],
  size: number,
): RadarGeometry {
  const sides = values.length;
  const center = size / 2;
  const radius = center * RADIUS_SHARE;

  const vertices = values.map((v, i) =>
    at(center, (radius * Math.min(Math.max(v, 0), 99)) / 99, i, sides),
  );

  return {
    center,
    radius,
    vertices,
    axes: Array.from({ length: sides }, (_, i) => at(center, radius, i, sides)),
    points: vertices.map((v) => `${v.x},${v.y}`).join(" "),
    rings: RING_FRACTIONS.map((f) => polygonPoints(sides, radius * f, center)),
    sectors: Array.from({ length: sides }, (_, i) => radarSector(center, radius, i, sides)),
    labels: labels.map((label, i) => {
      const cos = Math.cos(angleFor(i, sides));
      return {
        label,
        // 0.3 é o mesmo corte que `labelPosition` já usava: abaixo dele o eixo
        // está perto o bastante da vertical para o texto centrado não invadir
        // nada de lado.
        anchor: (Math.abs(cos) < 0.3 ? "middle" : cos > 0 ? "start" : "end") as
          | "start"
          | "middle"
          | "end",
        ...at(center, radius + size * LABEL_GAP_SHARE, i, sides),
      };
    }),
  };
}
