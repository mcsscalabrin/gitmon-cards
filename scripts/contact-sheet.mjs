/**
 * Folha de contato das prévias: `npm run sheet`.
 *
 * Existe por causa da regra mais cara do projeto — **o que quebra em layout só
 * quebra olhando** — e da forma específica que ela tem aqui: o alvo declarado é
 * ler em um segundo num thumbnail de feed, não no monitor inteiro. Conferir isso
 * abrindo 40 PNGs a 100% verifica o oposto do que se quer verificar.
 *
 * Monta a matriz num grid, na largura em que a carta de fato vive num feed:
 *
 *   $env:PREVIEW="out/preview"; npm test        gera os PNGs
 *   npm run sheet                               monta out/folha-150.png
 *   npm run sheet -- out/preview/matriz out/folha-300.png 300
 *
 * O agrupamento é por prefixo antes de `--`: `tier--eixo.png` vira uma linha por
 * tier e uma coluna por eixo. Nomes fora desse formato caem numa linha só, que é
 * o comportamento útil para inspecionar qualquer pasta de prévia.
 */
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const [, , dir = "out/preview/matriz", outFile = "out/folha-150.png", width = "150"] =
  process.argv;

const W = Number(width);
/* A carta é 5:7. Derivar a altura em vez de aceitar dois números evita a folha
   sair com a proporção errada, que é o jeito mais fácil de olhar e concluir a
   coisa errada. */
const H = Math.round((W / 500) * 700);

const files = (await readdir(dir)).filter((file) => file.endsWith(".png")).sort();
if (files.length === 0) {
  console.error(`Nenhum PNG em ${dir}. Gere as prévias antes: PREVIEW=<dir> npm test`);
  process.exit(1);
}

const rows = new Map();
for (const file of files) {
  const group = file.includes("--") ? file.split("--")[0] : "";
  if (!rows.has(group)) rows.set(group, []);
  rows.get(group).push(file);
}

/* Ordem da escada, não alfabética: `common` depois de `hyper_rare` faria a folha
   mentir sobre a progressão que ela existe para mostrar. */
const LADDER = [
  "common",
  "uncommon",
  "rare",
  "double_rare",
  "illustration_rare",
  "ultra_rare",
  "special_illustration_rare",
  "hyper_rare",
];
const known = LADDER.filter((tier) => rows.has(tier));
const groups = [...known, ...[...rows.keys()].filter((key) => !LADDER.includes(key))];

const cols = Math.max(...groups.map((group) => rows.get(group).length));
const gap = 8;

const composites = [];
for (const [row, group] of groups.entries()) {
  for (const [col, file] of rows.get(group).entries()) {
    composites.push({
      input: await sharp(join(dir, file)).resize(W, H).png().toBuffer(),
      left: col * (W + gap),
      top: row * (H + gap),
    });
  }
}

await sharp({
  create: {
    width: cols * (W + gap) - gap,
    height: groups.length * (H + gap) - gap,
    channels: 4,
    background: { r: 24, g: 22, b: 20, alpha: 1 },
  },
})
  .composite(composites)
  .png()
  .toFile(outFile);

console.log(`\n${outFile}  —  ${groups.length} linhas × ${cols} colunas a ${W}px`);
if (groups[0]) {
  const colunas = rows
    .get(groups[0])
    .map((file) => file.split("--")[1]?.replace(".png", "") ?? file.replace(".png", ""));
  console.log(`colunas: ${colunas.join(" · ")}\n`);
}
