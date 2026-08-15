import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import layout from "../cards/layout.json";
import type { CardEdge, MetalTone } from "../cards/rarity";
import type { FoilPattern } from "../cards/tag";
import type { Element, Rarity } from "../cards/types";

/**
 * Carregamento dos assets estáticos para dentro do Satori.
 *
 * Tudo vira data URI: o Satori só aceita data URI ou URL absoluta, e URL absoluta
 * significaria uma ida à rede por elemento em cada render.
 *
 * Os arquivos vivem em `public/`, que a Vercel serve estaticamente e **não**
 * empacota na função serverless — por isso o `outputFileTracingIncludes` em
 * `next.config.ts`. Sem ele isto funciona em dev e quebra em produção.
 */

const ASSETS = join(process.cwd(), "public", "assets");

/** Um asset é lido do disco uma vez por instância e fica no módulo. */
const cache = new Map<string, Promise<Buffer>>();

function read(relativePath: string): Promise<Buffer> {
  let hit = cache.get(relativePath);
  if (!hit) {
    hit = readFile(join(ASSETS, relativePath));
    cache.set(relativePath, hit);
  }
  return hit;
}

async function dataUri(relativePath: string, mime = "image/png"): Promise<string> {
  const buffer = await read(relativePath);
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

export interface SatoriFont {
  name: string;
  data: Buffer;
  weight: 400 | 700 | 900;
  style: "normal";
}

export const CARD_FONT = "Rounded";

/**
 * M PLUS Rounded 1c (SIL OFL 1.1), subsetada para latim pelo `npm run fonts`.
 * Ver public/assets/fonts/OFL.txt. Terminais arredondados e um peso Black de
 * verdade são o que dá a leitura de TCG; o subset cobre os símbolos de raridade
 * (⬤ ◆ ★), que fontes só-latinas costumam não ter.
 */
export async function loadFonts(): Promise<SatoriFont[]> {
  const [regular, bold, black] = await Promise.all([
    read("fonts/Rounded-Regular.ttf"),
    read("fonts/Rounded-Bold.ttf"),
    read("fonts/Rounded-Black.ttf"),
  ]);
  return [
    { name: CARD_FONT, data: regular, weight: 400, style: "normal" },
    { name: CARD_FONT, data: bold, weight: 700, style: "normal" },
    { name: CARD_FONT, data: black, weight: 900, style: "normal" },
  ];
}

export const frameUri = (element: Element, fullArt = false) =>
  dataUri(`frames/${fullArt ? "fullart-" : ""}${element}.png`);
export const metalUri = (tone: MetalTone, fullArt = false) =>
  dataUri(`frames/${fullArt ? "fullart-" : ""}metal-${tone}.png`);
export const edgeUri = (edge: CardEdge) => dataUri(`frames/edge-${edge}.png`);
export const energyUri = (element: Element) => dataUri(`energy/${element}.png`);
export const retreatUri = () => dataUri("icons/retreat.png");
/**
 * O foil vem em duas variantes pelo mesmo motivo que a moldura: ele recua sobre
 * a janela da arte para não apagar o avatar, e a janela do full-art é outra.
 */
export const foilUri = (rarity: Rarity, fullArt = false) =>
  dataUri(`frames/${fullArt ? "fullart-" : ""}foil-${rarity}.png`);

/**
 * Padrão do foil, escolhido pelo **eixo** e não pela raridade.
 *
 * Não há tier no nome do arquivo de propósito: o padrão é a geometria, e a força
 * dela vem de `foilIntensity()` aplicada como `opacity` na composição. Ver
 * `AXIS_PATTERNS` em `lib/cards/tag.ts` e `patternSvg` em `scripts/lib/art.mjs`.
 */
export const patternUri = (pattern: FoilPattern, fullArt = false) =>
  dataUri(`patterns/${fullArt ? "fullart-" : ""}${pattern}.png`);

/** Textura gravada. Só os três tiers do topo têm arquivo — ver `hasTexture`. */
export const textureUri = (rarity: Rarity, fullArt = false) =>
  dataUri(`textures/${fullArt ? "fullart-" : ""}${rarity}.png`);

/**
 * Avatar do GitHub, redimensionado no servidor.
 *
 * Sem máscara: a janela da moldura tem borda dura e é colada por cima, então ela
 * mesma faz o recorte (RFC 4.4, item 3). O `sharp` aqui resolve outra coisa —
 * avatares vêm em WebP/JPEG de tamanhos variados, e entregar um PNG do tamanho
 * exato evita que o Satori faça esse trabalho a cada requisição.
 *
 * Falha vira `null`: uma carta sem avatar ainda é uma carta.
 */
export async function avatarUri(
  url: string,
  size: number = layout.art.width,
): Promise<string | null> {
  try {
    const response = await fetch(sourceAtLeast(url, size), {
      headers: { "User-Agent": "gitmon-cards" },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;

    const source = Buffer.from(await response.arrayBuffer());
    const png = await sharp(source)
      .resize(size, size, { fit: "cover", position: "attention" })
      .png()
      .toBuffer();

    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Pede ao GitHub um avatar grande o bastante para o destino.
 *
 * Passou a importar quando o full-art virou face inteira: a janela ficou 472×672
 * e a arte é quadrada, então o lado tem que ser 672. O avatar padrão vem em
 * ~460px, e deixar o `sharp` ampliar 1,46× entrega justo o tier mais caro da
 * escada com a arte mais borrada da carta — o oposto do que ele deveria ser.
 *
 * `?s=` é parâmetro do próprio `avatars.githubusercontent.com` e devolve o
 * original reamostrado no servidor deles. Fora desse host a URL não é tocada:
 * inventar query em domínio alheio é caminho para 404.
 */
function sourceAtLeast(url: string, size: number): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "avatars.githubusercontent.com") return url;
    parsed.searchParams.set("s", String(size));
    return parsed.toString();
  } catch {
    return url;
  }
}
