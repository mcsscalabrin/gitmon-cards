import type { ContributionBand } from "../cards/contributions";
import layout from "../cards/layout.json";

/**
 * A grade de contribuições como **um** data URI de SVG.
 *
 * Um `<img>` e não ~3.000 `<div>`s: com a grade em nós do Satori, cada render
 * passaria a montar milhares de caixas de flexbox por requisição. É o princípio
 * 4 do `PRODUCT.md` — complexidade resolvida antes, não em runtime — aplicado no
 * único ponto do projeto onde a arte não pode ser arquivo estático, porque ela é
 * por-usuário e muda todo dia.
 *
 * Dentro do SVG, os dias viram **quatro `<path>`, um por nível**, e não um
 * `<rect>` por dia. São ~1.800 células numa carta cheia; quatro paths cortam o
 * arquivo para um terço e dão ao rasterizador quatro elementos em vez de dois mil.
 *
 * O recorte da janela de arte é feito **na origem, célula a célula**: o Satori não
 * implementa `mask-image` (`PRODUCT.md`, restrições travadas), então a única
 * máscara possível é não emitir o que não deve aparecer. Sai de graça — é um
 * teste de interseção por célula.
 */

const c = layout.contributions;

/** Passo entre células, nos dois eixos. */
const STEP = c.cell + c.gap;
/** Altura de uma banda: sete linhas, sem o gap depois da última. */
const BAND_HEIGHT = 7 * STEP - c.gap;
/** Distância entre os topos de duas bandas vizinhas. */
const BAND_STEP = BAND_HEIGHT + c.bandGap;

/** Opacidade de cada nível 1..4, relativa à cor base. Nível 0 não desenha nada. */
const LEVEL_ALPHA = [0, 0.25, 0.5, 0.75, 1];

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GridOptions {
  /** Região onde a grade não entra — a janela da arte. */
  exclude?: Rect | null;
  /**
   * Corte superior: bandas cujo topo fique acima disto são descartadas inteiras.
   *
   * Banda inteira e não meia banda de propósito: uma faixa de dias cortada no
   * meio da altura lê como erro de impressão, e a grade é fundo — ela não pode
   * chamar atenção para si nem para onde termina.
   */
  clipTop?: number;
}

/**
 * `data:image/svg+xml;base64,...` com a grade, ou `null` quando não há nada a
 * desenhar — sem banda, todas vazias, ou tudo caindo dentro da exclusão.
 *
 * `null` e não um SVG vazio: quem compõe pula a camada inteira em vez de colar um
 * `<img>` transparente sobre a carta.
 */
export function contributionGridUri(
  bands: ContributionBand[],
  color: string,
  options: GridOptions = {},
): string | null {
  const svg = contributionGridSvg(bands, color, options);
  if (!svg) return null;
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

/** O SVG cru. Separado do data URI para o teste poder ler o desenho. */
export function contributionGridSvg(
  bands: ContributionBand[],
  color: string,
  { exclude = null, clipTop = layout.border }: GridOptions = {},
): string | null {
  // As mais recentes são as que ficam: a âncora é o rodapé, e o que não cabe
  // transborda pelo topo, ou seja, pelo passado.
  const visible = bands.slice(-c.maxBands);
  if (!visible.length) return null;

  // Um caminho por nível. Índice 0 fica sempre vazio — dia sem contribuição não
  // vira tinta, e um retângulo por dia vazio dobraria o arquivo para desenhar nada.
  const paths: string[][] = [[], [], [], [], []];

  visible.forEach((band, index) => {
    // A última banda encosta na âncora; as anteriores sobem uma a uma.
    const fromBottom = visible.length - 1 - index;
    const top = layout.height - c.bottom - BAND_HEIGHT - fromBottom * BAND_STEP;
    if (top < clipTop) return;

    const bandWidth = band.weeks * STEP - c.gap;
    const left = (layout.width - bandWidth) / 2;

    for (let week = 0; week < band.weeks; week++) {
      for (let day = 0; day < 7; day++) {
        const level = band.levels[week * 7 + day];
        if (!level) continue;

        const x = left + week * STEP;
        const y = top + day * STEP;
        if (exclude && intersects(x, y, exclude)) continue;

        paths[level].push(cell(x, y));
      }
    }
  });

  const groups = paths
    .map((cells, level) =>
      cells.length
        ? `<path fill-opacity="${LEVEL_ALPHA[level]}" d="${cells.join("")}"/>`
        : "",
    )
    .join("");

  if (!groups) return null;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" ` +
    `viewBox="0 0 ${layout.width} ${layout.height}">` +
    `<g fill="${color}">${groups}</g></svg>`
  );
}

/**
 * Uma célula como sub-caminho.
 *
 * Quadrado seco, sem o `radius` de `layout.json`: a célula tem 8px e sai da
 * composição a 10% de opacidade, escala em que um canto arredondado custa quatro
 * curvas de Bézier por dia e não se distingue de um canto reto. O raio fica
 * declarado no layout para quem um dia aumentar a célula.
 */
function cell(x: number, y: number): string {
  const size = c.cell;
  return `M${round(x)} ${round(y)}h${size}v${size}h-${size}z`;
}

/** Uma casa decimal basta a 8px e corta ~15% do arquivo. */
function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function intersects(x: number, y: number, rect: Rect): boolean {
  return (
    x < rect.x + rect.width &&
    x + c.cell > rect.x &&
    y < rect.y + rect.height &&
    y + c.cell > rect.y
  );
}

export const gridGeometry = { STEP, BAND_HEIGHT, BAND_STEP, maxBands: c.maxBands };
