import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { simulate } from "@/lib/battle/engine";
import type { Card } from "@/lib/cards/types";
import { renderBattle } from "@/lib/og/renderBattle";

const PREVIEW = process.env.PREVIEW;

function card(overrides: Partial<Card>): Card {
  return {
    kind: "profile",
    id: "dev",
    name: "dev",
    element: "normal",
    hp: 150,
    attacks: [{ name: "golpe", cost: 2, damage: 60, text: "" }],
    weakness: null,
    resistance: null,
    retreat: 2,
    rarity: "rare",
    axis: "reach",
    serial: null,
    artUrl: "https://avatars.githubusercontent.com/u/1024025",
    footer: "",
    stats: [],
    sourceUrl: "",
    ...overrides,
  };
}

describe("renderBattle", () => {
  it("compõe o pôster do resultado em PNG", async () => {
    const a = card({
      id: "torvalds",
      name: "Linus Torvalds",
      element: "fire",
      hp: 250,
      attacks: [{ name: "linux", cost: 4, damage: 300, text: "" }],
    });
    const b = card({
      id: "gaearon",
      name: "Dan Abramov",
      element: "electric",
      hp: 200,
      weakness: "fire",
      attacks: [{ name: "redux", cost: 3, damage: 180, text: "" }],
    });

    const battle = simulate(a, b, "0123456789abcdef", 42);
    const image = await renderBattle(battle, "en");
    const png = Buffer.from(await image.arrayBuffer());

    if (PREVIEW) {
      const target = join(PREVIEW, "battle.png");
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, png);
    }

    expect(png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
    expect(png.byteLength).toBeGreaterThan(10_000);
  }, 60_000);
});
