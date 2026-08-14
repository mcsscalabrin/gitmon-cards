/**
 * Cor de **série** dos gráficos comparativos. Não é a cor do tipo.
 *
 * A distinção é a correção mais importante deste módulo, então vale escrever por
 * inteiro por que ela existe.
 *
 * `lib/cards/palette.json` dá a cada tipo uma cor extraída do ícone dele. Isso é
 * ótimo como **identidade de carta** — a moldura, a auréola, o disco do tipo — e
 * inútil como **identidade de série** num gráfico de dois oponentes, porque as 18
 * cores nunca foram escolhidas para serem distinguíveis entre si. Rodando
 * `scripts/validate_palette.js` da skill de dataviz contra a superfície escura
 * (`--bg-raised`, #161a22), confrontos reais falham assim:
 *
 * | Confronto              | ΔE visão normal | ΔE pior CVD |
 * |------------------------|-----------------|-------------|
 * | electric × electric    | **0,0**         | **0,0**     |
 * | steel × flying         | **2,0**         | **1,9**     |
 * | electric × bug         | **12,9**        | 10,7        |
 * | fire × grass           | 26,5            | **6,1**     |
 *
 * O piso é ΔE ≥ 15 na visão normal e ≥ 8 sob daltonismo. Três dos quatro casos
 * acima são reprovação dura, e o primeiro é o mais comum de todos: dois devs de
 * JavaScript são os dois `electric`, e o radar desenhava dois polígonos da
 * **mesma cor**, com duas bolinhas idênticas na legenda. Não há encoding
 * secundário que conserte ΔE 0 — a única saída é não pintar série por tipo.
 *
 * Então a batalha ganha dois slots fixos, azul e laranja, validados nas duas
 * superfícies do site (#161a22 e #0d0f14): ΔE 29,2 na visão normal e 23,9 no pior
 * caso de daltonismo, dentro da faixa de luminosidade e acima de 3:1 de
 * contraste. Azul e laranja são o par quente/frio clássico justamente porque
 * sobrevive a protanopia e deuteranopia, onde vermelho×verde colapsa.
 *
 * O tipo não some da tela: ele continua no `TypeIcon` ao lado de cada nome, que
 * é onde ele é identidade e não codificação. E a cor segue o **lado**, nunca o
 * ranking — quem está em `a` é azul do começo ao fim da página, ganhando ou
 * perdendo.
 */

import type { Side } from "@/lib/battle/types";

export const SIDE_COLORS: Record<Side, string> = {
  a: "#3A8AD8",
  b: "#D96E2C",
};

/**
 * Forma do marcador de cada lado — o encoding secundário.
 *
 * Cor validada resolve o caso de daltonismo, mas não o de impressão em cinza nem
 * o de `forced-colors`. Duas formas diferentes de vértice resolvem os três de uma
 * vez e não custam nada: identidade nunca depende só de matiz.
 *
 * Círculo e losango, e não círculo e quadrado: no radar os vértices caem em
 * ângulos arbitrários, e um quadrado de lado reto lê como círculo mal desenhado
 * quando é pequeno. O losango tem ponta, que se reconhece a 8px.
 */
export type MarkerShape = "circle" | "diamond";

export const SIDE_MARKERS: Record<Side, MarkerShape> = {
  a: "circle",
  b: "diamond",
};

/**
 * Caminho SVG de um marcador centrado em (x, y).
 *
 * `r` é o raio do círculo circunscrito, para as duas formas ocuparem a mesma
 * área ótica — um losango inscrito no mesmo raio parece menor que o círculo, e
 * por isso ele ganha 15% a mais.
 */
export function markerPath(shape: MarkerShape, x: number, y: number, r: number): string {
  if (shape === "circle") {
    return `M ${x - r} ${y} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0 Z`;
  }
  const d = r * 1.15;
  return `M ${x} ${y - d} L ${x + d} ${y} L ${x} ${y + d} L ${x - d} ${y} Z`;
}
