import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderCard } from "@/lib/og/renderCard";
import { ELEMENTS, type Card } from "@/lib/cards/types";

/**
 * Smoke test do renderizador. Não compara pixels — compara que a composição
 * inteira (fontes, moldura, ícones, Satori) roda de ponta a ponta e sai um PNG.
 *
 * `PREVIEW=<dir>` grava os PNGs em disco para inspeção visual, que é como a arte
 * é conferida na prática.
 */

const PREVIEW = process.env.PREVIEW;

const BASE: Card = {
  kind: "profile",
  id: "torvalds",
  name: "Linus Torvalds",
  element: "fire",
  hp: 250,
  attacks: [
    { name: "linux", cost: 4, damage: 300, text: "Linux kernel source tree" },
    { name: "subsurface", cost: 2, damage: 120, text: "Subsurface divelog program" },
  ],
  weakness: "water",
  resistance: "grass",
  retreat: 3,
  rarity: "hyper_rare",
  // Fixado, não nulo: é o único caminho que exercita a renderização do serial.
  serial: 42,
  artUrl: "https://avatars.githubusercontent.com/u/1024025",
  footer: "Creator of Linux and Git · 2011",
  stats: [
    { labelKey: "stat.stars", value: 214_000 },
    { labelKey: "stat.followers", value: 238_000 },
  ],
  sourceUrl: "https://github.com/torvalds",
};

async function toPng(card: Card, locale: "pt" | "en", filename: string): Promise<Buffer> {
  const image = await renderCard(card, locale);
  const buffer = Buffer.from(await image.arrayBuffer());

  if (PREVIEW) {
    const target = join(PREVIEW, filename);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, buffer);
  }

  return buffer;
}

/** Assinatura de arquivo PNG. */
function isPng(buffer: Buffer): boolean {
  return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
}

describe("renderCard", () => {
  it("compõe uma carta completa em PNG", async () => {
    const png = await toPng(BASE, "en", "secret-fire.png");
    expect(isPng(png)).toBe(true);
    expect(png.byteLength).toBeGreaterThan(20_000);
  }, 60_000);

  /*
   * Deriva de `ELEMENTS` em vez de listar à mão: um tipo novo entra no teste
   * sozinho. A lista fixa anterior teria continuado verde com 7 dos 18 tipos
   * cobertos, e a moldura faltante só apareceria em produção.
   */
  it("renderiza todos os tipos sem quebrar", async () => {
    for (const element of ELEMENTS) {
      const png = await toPng(
        { ...BASE, element, rarity: "rare", name: element },
        "en",
        `element-${element}.png`,
      );
      expect(isPng(png)).toBe(true);
    }
  }, 120_000);

  it("aguenta uma carta mínima: sem ataques, sem resistência, sem avatar", async () => {
    const png = await toPng(
      {
        ...BASE,
        name: "conta-nova",
        element: "normal",
        hp: 30,
        attacks: [],
        weakness: "fighting",
        resistance: null,
        retreat: 1,
        rarity: "common",
        artUrl: "https://exemplo.invalido/nao-existe.png",
        footer: "2026",
        stats: [{ labelKey: "stat.stars", value: 0 }],
      },
      "pt",
      "minima.png",
    );
    expect(isPng(png)).toBe(true);
  }, 60_000);

  /*
   * Regressão: descrição longa de repositório empurrava o dano para fora da
   * linha do ataque, e a carta saía com o número mais importante ausente.
   * Reproduzido ao vivo em /gaearon, cuja descrição bate o limite de 64
   * caracteres. Ver o `minWidth: 0` em AttackRow.
   */
  it("mantém o dano visível quando a descrição do ataque é longa", async () => {
    const png = await toPng(
      {
        ...BASE,
        name: "ataque-longo",
        attacks: [
          {
            name: "react-hot-loader",
            cost: 4,
            damage: 300,
            text: "Tweak React components in real time. (Deprecated: use Fast…",
          },
          { name: "curto", cost: 1, damage: 40, text: "ok" },
        ],
      },
      "en",
      "ataque-longo.png",
    );
    expect(isPng(png)).toBe(true);
  }, 60_000);

  /*
   * Um por tratamento visual: full-art puro, full-art prata, full-art ouro e
   * folheada sobre layout padrão. Se a moldura full-art recortar errado ou a
   * camada de metal cobrir o texto, quebra aqui.
   */
  it.each([
    ["illustration_rare", "trato-illustration.png"],
    ["ultra_rare", "trato-ultra.png"],
    ["special_illustration_rare", "trato-special.png"],
    ["hyper_rare", "trato-hyper.png"],
  ] as const)("renderiza o tratamento de %s", async (rarity, filename) => {
    const png = await toPng({ ...BASE, rarity, serial: 7 }, "en", filename);
    expect(isPng(png)).toBe(true);
  }, 60_000);

  /*
   * Pior caso tipográfico do rodapé: o tier de nome mais longo ("Rara Ilustrada
   * Especial") no idioma mais verboso, ao lado de duas estrelas e do serial de
   * quatro dígitos. Se algum rótulo estoura a faixa de `layout.footer`, estoura
   * aqui primeiro.
   */
  it("acomoda o rótulo de raridade mais longo sem estourar o rodapé", async () => {
    const png = await toPng(
      {
        ...BASE,
        name: "carta-longa",
        element: "fighting",
        rarity: "special_illustration_rare",
        serial: 9999,
      },
      "pt",
      "rodape-longo.png",
    );
    expect(isPng(png)).toBe(true);
  }, 60_000);

  it("renderiza a carta de repositório em português", async () => {
    const png = await toPng(
      {
        ...BASE,
        kind: "repo",
        id: "facebook/react",
        name: "react",
        element: "electric",
        hp: 230,
        attacks: [
          { name: "gaearon", cost: 3, damage: 200, text: "1.640 commits" },
          { name: "sebmarkbage", cost: 2, damage: 118, text: "959 commits" },
        ],
        weakness: "fighting",
        resistance: null,
        retreat: 4,
        rarity: "ultra_rare",
        // Sem serial: cobre o caminho em que o store durável não respondeu e a
        // carta precisa sair sem número em vez de com número errado.
        serial: null,
        footer: "The library for web and native user interfaces · facebook · 2013",
      },
      "pt",
      "repo-ultra-rare.png",
    );
    expect(isPng(png)).toBe(true);
  }, 60_000);
});
