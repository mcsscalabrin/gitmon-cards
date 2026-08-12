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
}

export interface RadarGeometry {
  center: number;
  radius: number;
  /** Corners of the data polygon, one per axis. */
  vertices: RadarVertex[];
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
    points: vertices.map((v) => `${v.x},${v.y}`).join(" "),
    rings: RING_FRACTIONS.map((f) => polygonPoints(sides, radius * f, center)),
    sectors: Array.from({ length: sides }, (_, i) => radarSector(center, radius, i, sides)),
    labels: labels.map((label, i) => ({
      label,
      ...at(center, radius + size * LABEL_GAP_SHARE, i, sides),
    })),
  };
}
