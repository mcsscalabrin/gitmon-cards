import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ELEMENT_CHAIN,
  ELEMENT_COLORS,
  LANGUAGE_ELEMENTS,
  elementForLanguage,
} from "@/lib/cards/elements";
import { ELEMENTS } from "@/lib/cards/types";

const root = process.cwd();

describe("cobertura dos 18 tipos", () => {
  /*
   * O ponto do sistema de 18 tipos é que todos apareçam. Um tipo sem nenhuma
   * linguagem é um ícone que nunca sai na carta — trabalho de arte morto e uma
   * promessa quebrada para quem procura o próprio tipo.
   */
  it("todo tipo é alcançável por pelo menos uma linguagem", () => {
    const alcancados = new Set(Object.values(LANGUAGE_ELEMENTS));
    const orfaos = ELEMENTS.filter((element) => !alcancados.has(element));
    expect(orfaos).toEqual([]);
  });

  it("toda linguagem mapeia para um tipo que existe", () => {
    for (const [language, element] of Object.entries(LANGUAGE_ELEMENTS)) {
      expect(ELEMENTS, language).toContain(element);
    }
  });

  it("tem cor para todo tipo, e nenhuma cor sobrando", () => {
    const naPaleta = Object.keys(ELEMENT_COLORS).filter((k) => !k.startsWith("_"));
    expect(new Set(naPaleta)).toEqual(new Set(ELEMENTS));

    for (const element of ELEMENTS) {
      const cores = ELEMENT_COLORS[element];
      for (const tom of ["base", "dark", "light", "ink"] as const) {
        expect(cores[tom], `${element}.${tom}`).toMatch(/^#[0-9A-F]{6}$/i);
      }
    }
  });

  /*
   * A moldura e o ícone são carregados por caminho montado a partir do nome do
   * tipo (`lib/og/assets.ts`). Tipo sem asset não quebra o typecheck — quebra em
   * runtime, na hora de renderizar a carta de alguém.
   */
  it("tem os assets de todo tipo no disco", () => {
    for (const element of ELEMENTS) {
      for (const caminho of [
        `public/assets/frames/${element}.png`,
        `public/assets/frames/fullart-${element}.png`,
        `public/assets/energy/${element}.png`,
        `public/assets/types/${element}.svg`,
      ]) {
        /*
         * `existsSync`, não `readFileSync` que não lança: o ponto é a
         * existência, e ler o arquivo inteiro só para provar que existe é
         * custo sem pergunta.
         */
        expect(existsSync(join(root, caminho)), caminho).toBe(true);
      }
    }
  });
});

describe("cadeia de fraqueza e resistência", () => {
  it("define fraqueza e resistência para todo tipo", () => {
    expect(new Set(Object.keys(ELEMENT_CHAIN))).toEqual(new Set(ELEMENTS));
  });

  it("só aponta para tipos que existem", () => {
    for (const [element, { weakTo, resists }] of Object.entries(ELEMENT_CHAIN)) {
      if (weakTo !== null) expect(ELEMENTS, `${element}.weakTo`).toContain(weakTo);
      if (resists !== null) expect(ELEMENTS, `${element}.resists`).toContain(resists);
    }
  });

  /*
   * Uma carta fraca e resistente ao mesmo tipo se anula: o multiplicador viraria
   * 2 e 0,5 ao mesmo tempo, e `effectiveness` resolve pela ordem do código, não
   * por regra. Melhor não deixar acontecer.
   */
  it("nunca é fraco e resistente ao mesmo tipo", () => {
    for (const [element, { weakTo, resists }] of Object.entries(ELEMENT_CHAIN)) {
      if (weakTo === null || resists === null) continue;
      expect(weakTo, element).not.toBe(resists);
    }
  });

  it("nunca resiste ao próprio tipo", () => {
    for (const [element, { resists }] of Object.entries(ELEMENT_CHAIN)) {
      expect(resists, element).not.toBe(element);
    }
  });
});

describe("elementForLanguage", () => {
  it("é indiferente a caixa", () => {
    expect(elementForLanguage("TypeScript")).toBe("electric");
    expect(elementForLanguage("typescript")).toBe("electric");
  });

  it("cai em normal para linguagem ausente ou desconhecida", () => {
    expect(elementForLanguage(null)).toBe("normal");
    expect(elementForLanguage(undefined)).toBe("normal");
    expect(elementForLanguage("")).toBe("normal");
    expect(elementForLanguage("Befunge")).toBe("normal");
  });
});
