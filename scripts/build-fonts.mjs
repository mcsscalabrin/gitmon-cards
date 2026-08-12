/**
 * Baixa e subseta as fontes da carta: `npm run fonts`.
 *
 * Roda sob demanda, não em todo build — o resultado é versionado em
 * `public/assets/fonts/`, junto com a licença.
 *
 * Por que subsetar: M PLUS Rounded 1c é uma fonte japonesa completa, 3,4 MB por
 * peso. Três pesos seriam 10 MB dentro da função serverless, pagos em parsing a
 * cada cold start, para desenhar nomes de repositório em latim. O subset derruba
 * isso para dezenas de KB sem perder nada que a carta use — incluindo os símbolos
 * de raridade (⬤ ◆ ★), que fontes só-latinas normalmente não têm.
 *
 * **Dois formatos por peso, e os dois são necessários.** O Satori carrega o
 * arquivo do disco e só entende TrueType; o navegador entende WOFF2 e paga
 * metade dos bytes pelo mesmo desenho, porque WOFF2 é o mesmo TTF comprimido com
 * Brotli. Servir o TTF ao navegador funcionaria e custaria o dobro à toa; mandar
 * WOFF2 ao Satori não funcionaria de jeito nenhum.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import subsetFont from "subset-font";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dest = join(root, "public/assets/fonts");

const SOURCE = "https://raw.githubusercontent.com/google/fonts/main/ofl/mplusrounded1c";

/**
 * `web` marca os pesos que o **site** também usa.
 *
 * A carta usa os três; o site usa a face só em display e título, e display é
 * sempre pesado — não há texto de 400 na face da carta dentro do site. Gerar o
 * WOFF2 do Regular seria versionar 14 KB que nenhum `@font-face` referencia.
 */
const WEIGHTS = [
  { file: "MPLUSRounded1c-Regular.ttf", out: "Rounded-Regular.ttf", web: false },
  { file: "MPLUSRounded1c-Bold.ttf", out: "Rounded-Bold.ttf", web: true },
  { file: "MPLUSRounded1c-Black.ttf", out: "Rounded-Black.ttf", web: true },
];

/**
 * Repertório do subset. Latim básico + Latin-1 (acentos de PT e de nomes
 * próprios) + a pontuação e os símbolos que a carta desenha.
 */
const CHARS = [
  // ASCII imprimível
  ...Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)),
  // Latin-1 suplementar: acentuação de português, espanhol, francês, alemão
  ...Array.from({ length: 96 }, (_, i) => String.fromCharCode(0xa0 + i)),
  // Usados pelo layout: multiplicação, menos, reticências, meia-risca, aspas,
  // marcador, e os três símbolos de raridade da RFC 4.4
  "×−–—…‘’“”·•●◆★☆■□▲△",
].join("");

async function download(name) {
  const response = await fetch(`${SOURCE}/${name}`);
  if (!response.ok) {
    throw new Error(`falhou ao baixar ${name}: HTTP ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

await mkdir(dest, { recursive: true });

console.log(`\nsubset (${CHARS.length} caracteres)`);
for (const { file, out, web } of WEIGHTS) {
  const original = await download(file);

  // TrueType para o Satori, WOFF2 para o navegador. Mesmo subset, mesmo desenho.
  const ttf = await subsetFont(original, CHARS, { targetFormat: "truetype" });
  await writeFile(join(dest, out), ttf);

  let note = "";
  if (web) {
    const woff2 = await subsetFont(original, CHARS, { targetFormat: "woff2" });
    await writeFile(join(dest, out.replace(/\.ttf$/, ".woff2")), woff2);
    note = ` · ${(woff2.length / 1024).toFixed(1)} KB woff2`;
  }

  console.log(
    `  ${out.replace(/\.ttf$/, "").padEnd(18)} ${(original.length / 1024 / 1024).toFixed(2)} MB → ` +
      `${(ttf.length / 1024).toFixed(1)} KB ttf${note}`,
  );
}

// google/fonts não guarda a licença junto do binário desta família; ela vem do
// repositório do projeto M+. Redistribuir a fonte sem o texto da OFL violaria a
// própria licença, então isto não é opcional.
const license = await fetch(
  "https://raw.githubusercontent.com/coz-m/MPLUS_FONTS/master/OFL.txt",
);
if (!license.ok) throw new Error(`falhou ao baixar a licença: HTTP ${license.status}`);
await writeFile(join(dest, "OFL.txt"), Buffer.from(await license.arrayBuffer()));
console.log("\n  OFL.txt — M PLUS Rounded 1c, SIL Open Font License 1.1\n");
