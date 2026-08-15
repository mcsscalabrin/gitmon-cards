/**
 * Gera a arte estática das cartas: `npm run assets`.
 *
 * Roda em build, não em runtime. É a decisão central da RFC 4.3 — a complexidade
 * visual é resolvida antes, e o servidor só compõe. Rasterizar SVG a cada
 * requisição funcionaria, mas pagaria o custo em todo cold start sem ganhar nada.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  edgeSvg,
  EDGE_STYLES,
  foilSvg,
  FOIL_PATTERNS,
  frameSvg,
  metalSvg,
  METAL_TONES,
  patternSvg,
  retreatSvg,
  textureSvg,
  TEXTURED_TIERS,
} from "./lib/art.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (path) => JSON.parse(await readFile(join(root, path), "utf8"));

const layout = await readJson("lib/cards/layout.json");
const palette = await readJson("lib/cards/palette.json");
const foil = await readJson("lib/cards/foil.json");
const elements = Object.keys(palette).filter((key) => !key.startsWith("_"));

/**
 * `palette` quantiza para 256 cores indexadas.
 *
 * É reservado ao foil, e por medição: as quatro camadas de ruído saem em 780 KB
 * por arquivo em cor direta, e o PNG indexado devolve o mesmo desenho em 230 KB
 * sem diferença visível — ruído de baixo contraste é o caso em que a paleta não
 * custa nada. Nas molduras seria o contrário: são gradientes largos e suaves,
 * exatamente onde 256 cores viram faixas.
 */
async function emit(relativePath, svg, { palette = false, width } = {}) {
  const target = join(root, "public/assets", relativePath);
  await mkdir(dirname(target), { recursive: true });
  const pipeline = sharp(Buffer.from(svg));
  // `resize` sobre um SVG não amplia bitmap: o sharp rasteriza de novo no tamanho
  // pedido. É por isso que o lado do ícone de energia pode ser fixado na chamada
  // em vez de depender do `width` que o desenhista escreveu no arquivo.
  if (width) pipeline.resize(width, width);
  const { size } = await pipeline
    .png({ compressionLevel: 9, palette, effort: palette ? 10 : undefined })
    .toFile(target);
  console.log(`  ${relativePath.padEnd(44)} ${(size / 1024).toFixed(1)} KB`);
}

console.log(`\nmolduras (${layout.width}x${layout.height})`);
for (const element of elements) {
  await emit(`frames/${element}.png`, frameSvg(layout, palette[element]));
}

console.log("\nmolduras full-art");
for (const element of elements) {
  await emit(
    `frames/fullart-${element}.png`,
    frameSvg(layout, palette[element], { fullArt: true }),
  );
}

// Duas variantes, como na moldura e no foil: no full-art o lustro tem que parar
// onde o scrim de baixo começa, senão lava justamente o fundo que segura o texto.
console.log("\nmetal");
for (const tone of METAL_TONES) {
  await emit(`frames/metal-${tone}.png`, metalSvg(layout, tone));
  await emit(`frames/fullart-metal-${tone}.png`, metalSvg(layout, tone, { fullArt: true }));
}

// Dois arquivos para os oito tiers, sem elemento: é a RFC 8 caminho C outra vez
// — o que varia por raridade nunca multiplica pelos 18 tipos.
console.log("\nborda");
for (const style of EDGE_STYLES) {
  await emit(`frames/edge-${style}.png`, edgeSvg(layout, style));
}

/*
 * O tier vem de `lib/cards/foil.json`, que também alimenta o `foilIntensity()`
 * do runtime — a mesma escada dos dois lados. Um tier aqui sem par em `hasFoil()`
 * gera um PNG que ninguém compõe, e o contrário quebra ao renderizar; é o que o
 * teste de `foil.json` em tests/unit/rarity.test.ts guarda.
 *
 * Duas variantes por tier, como nas molduras: o foil recua sobre a janela da
 * arte, e a janela do full-art é outra. Gerar as duas para todo tier em vez de
 * só para os tiers que são full-art mantém esta build ignorante de
 * `cardTreatment()`, que é do runtime — mesma escolha já feita em `fullart-`.
 */
console.log("\nfoil");
for (const [tier, bands] of Object.entries(foil.bands)) {
  const profile = { intensity: foil.intensity[tier], bands };
  await emit(`frames/foil-${tier}.png`, foilSvg(layout, profile), { palette: true });
  await emit(`frames/fullart-foil-${tier}.png`, foilSvg(layout, profile, { fullArt: true }), {
    palette: true,
  });
}

/*
 * Padrão do foil, um por eixo (`AXIS_PATTERNS` em lib/cards/tag.ts).
 *
 * **Sem tier no nome, e é o ponto todo.** O padrão é ortogonal à intensidade: a
 * força entra em tempo de composição, com `opacity` no <img> do renderizador.
 * Assar uma cópia por tier daria 5 × 6 × 2 = 60 arquivos para descrever cinco
 * desenhos. Duas variantes por padrão, como na moldura e no foil, porque a janela
 * do full-art é outra e o recuo depende dela.
 */
console.log("\npadrão do foil");
for (const pattern of FOIL_PATTERNS) {
  await emit(`patterns/${pattern}.png`, patternSvg(layout, pattern), { palette: true });
  await emit(`patterns/fullart-${pattern}.png`, patternSvg(layout, pattern, { fullArt: true }), {
    palette: true,
  });
}

/*
 * Textura gravada — só nos três tiers do topo, onde o TCG tem relevo tátil.
 * Aqui a raridade manda mesmo, ao contrário do padrão acima.
 */
console.log("\ntextura gravada");
for (const tier of TEXTURED_TIERS) {
  await emit(`textures/${tier}.png`, textureSvg(layout, tier), { palette: true });
  await emit(`textures/fullart-${tier}.png`, textureSvg(layout, tier, { fullArt: true }), {
    palette: true,
  });
}

/*
 * Ícones de tipo.
 *
 * São os primeiros assets do projeto que **não** são gerados por código: vieram
 * prontos como SVG em `scripts/assets/types/`, um por tipo, já no formato de
 * disco colorido com glifo branco — exatamente o que o ícone de energia precisa
 * ser. O `energySvg` que desenhava esses discos à mão saiu de cena.
 *
 * Cada um vira duas coisas: um PNG para o Satori compor na carta, e uma cópia do
 * SVG em `public/assets/types/` para a interface web usar direto, sem rasterizar.
 *
 * O lado do PNG é fixado aqui, não herdado do SVG. O desenho é vetor e cada
 * revisão dos ícones pode chegar com outro `width` no arquivo — a v2 veio em 64,
 * a v1 vinha em 256. Sem o número fixo, trocar a arte mudaria em silêncio a
 * resolução do que o Satori compõe na carta.
 */
const ENERGY_PX = 256;

console.log(`\nenergia (a partir dos ícones de tipo, ${ENERGY_PX}px)`);
const typesDir = join(root, "scripts/assets/types");
for (const element of elements) {
  const svg = await readFile(join(typesDir, `${element}.svg`), "utf8");
  await emit(`energy/${element}.png`, svg, { width: ENERGY_PX });

  const webTarget = join(root, "public/assets/types", `${element}.svg`);
  await mkdir(dirname(webTarget), { recursive: true });
  await writeFile(webTarget, svg);
}
console.log(`  ${elements.length} SVGs copiados para public/assets/types/`);

console.log("\nícones");
await emit("icons/retreat.png", retreatSvg());

console.log(
  `\n${elements.length} tipos · molduras, foil e metal gerados por código;` +
    ` ícones de tipo a partir dos SVGs em scripts/assets/types/\n`,
);
