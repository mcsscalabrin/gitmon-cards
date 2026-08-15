import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderYgo } from "@/lib/og/renderYgo";
import { playDuel } from "@/lib/ygo/engine";

const PREVIEW = process.env.PREVIEW;

describe("renderYgo", () => {
  it("compõe o pôster do resultado em PNG", async () => {
    const actions = Array.from({ length: 200 }, () => ({ kind: "pass" as const }));
    const result = playDuel(42, actions, "poster-test", { a: "Você", b: "IA" });

    const image = await renderYgo(result, "en");
    const png = Buffer.from(await image.arrayBuffer());

    if (PREVIEW) {
      const target = join(PREVIEW, "ygo.png");
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, png);
    }

    expect(png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
    expect(png.byteLength).toBeGreaterThan(10_000);
  }, 60_000);
});
