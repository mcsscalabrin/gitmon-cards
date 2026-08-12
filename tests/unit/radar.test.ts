import { describe, expect, it } from "vitest";
import { polygonPoints, radarGeometry, radarSector } from "@/lib/radar";

const LABELS = ["reach", "community", "volume", "veterancy", "breadth"];
const SIZE = 240;
const CENTER = SIZE / 2;
const RADIUS = CENTER * 0.72;

describe("polygonPoints", () => {
  it("gera N pontos para N lados", () => {
    const pts = polygonPoints(5, 80, 120).split(" ");
    expect(pts).toHaveLength(5);
    expect(pts.every((p) => /^-?\d+\.?\d*,-?\d+\.?\d*$/.test(p))).toBe(true);
  });

  it("colapsa no centro quando raio é zero", () => {
    const pts = polygonPoints(5, 0, 120).split(" ");
    expect(pts.every((p) => p === "120,120")).toBe(true);
  });

  it("põe o primeiro eixo no topo", () => {
    const [first] = polygonPoints(5, 80, 120).split(" ");
    const [x, y] = first.split(",").map(Number);
    expect(x).toBeCloseTo(120, 0);
    expect(y).toBeCloseTo(40, 0);
  });
});

describe("radarSector", () => {
  it("gera wedge com 4 pontos", () => {
    const pts = radarSector(120, 80, 0, 5).split(" ");
    expect(pts).toHaveLength(4);
  });

  it("primeiro ponto é sempre o centro", () => {
    const pts = radarSector(120, 80, 0, 5).split(" ");
    expect(pts[0]).toBe("120,120");
  });

  it("funciona para qualquer eixo", () => {
    for (let i = 0; i < 5; i++) {
      const pts = radarSector(120, 80, i, 5).split(" ");
      expect(pts).toHaveLength(4);
    }
  });
});

describe("radarGeometry", () => {
  const full = Array(5).fill(99);
  const zero = Array(5).fill(0);

  it("retorna todos os campos", () => {
    const geo = radarGeometry(full, LABELS, SIZE);
    expect(geo).toHaveProperty("center");
    expect(geo).toHaveProperty("radius");
    expect(geo).toHaveProperty("vertices");
    expect(geo).toHaveProperty("points");
    expect(geo).toHaveProperty("rings");
    expect(geo).toHaveProperty("sectors");
    expect(geo).toHaveProperty("labels");
  });

  it("5 eixos → 5 vértices, 3 anéis, 5 setores, 5 labels", () => {
    const geo = radarGeometry(full, LABELS, SIZE);
    expect(geo.vertices).toHaveLength(5);
    expect(geo.rings).toHaveLength(3);
    expect(geo.sectors).toHaveLength(5);
    expect(geo.labels).toHaveLength(5);
  });

  it("valores满额 → vértices no anel externo", () => {
    const geo = radarGeometry(full, LABELS, SIZE);
    geo.vertices.forEach((v) => {
      const dist = Math.hypot(v.x - CENTER, v.y - CENTER);
      expect(dist).toBeCloseTo(RADIUS, 0);
    });
  });

  it("valores zero → todos os pontos no centro", () => {
    const geo = radarGeometry(zero, LABELS, SIZE);
    geo.vertices.forEach((v) => {
      expect(v.x).toBeCloseTo(CENTER, 0);
      expect(v.y).toBeCloseTo(CENTER, 0);
    });
  });

  it("labels ficam além do anel externo", () => {
    const geo = radarGeometry(full, LABELS, SIZE);
    geo.labels.forEach((l) => {
      const dist = Math.hypot(l.x - CENTER, l.y - CENTER);
      expect(dist).toBeGreaterThan(RADIUS);
    });
  });

  it("primeiro label aponta para cima", () => {
    const geo = radarGeometry(full, LABELS, SIZE);
    expect(geo.labels[0].y).toBeLessThan(CENTER);
  });

  it("funciona para qualquer número de eixos", () => {
    const values6 = Array(6).fill(50);
    const labels6 = ["a", "b", "c", "d", "e", "f"];
    const geo = radarGeometry(values6, labels6, SIZE);
    expect(geo.vertices).toHaveLength(6);
    expect(geo.sectors).toHaveLength(6);
    expect(geo.labels).toHaveLength(6);
  });

  it("clampa valores acima de 99", () => {
    const over = [150, 99, 0, 50, 80];
    const geo = radarGeometry(over, LABELS, SIZE);
    const at99 = radarGeometry([99, 99, 99, 99, 99], LABELS, SIZE);
    // primeiro vértice deve estar no mesmo raio que 99
    const dist = Math.hypot(geo.vertices[0].x - CENTER, geo.vertices[0].y - CENTER);
    const dist99 = Math.hypot(at99.vertices[0].x - CENTER, at99.vertices[0].y - CENTER);
    expect(dist).toBeCloseTo(dist99, 0);
  });
});
