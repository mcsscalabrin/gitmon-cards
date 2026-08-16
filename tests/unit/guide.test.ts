import { describe, expect, it } from "vitest";
import { GUIDE_STEP_IDS, GUIDE_STEPS } from "@/lib/guide/steps";
import { LOCALES, t } from "@/lib/i18n/dictionaries";

/**
 * O config do tour é dado puro, sem React — dá para provar invariantes sem
 * montar nada. A existência das chaves de i18n já é garantida pelo tipo
 * (`MessageKey`), mas o teste roda `t()` para pegar chave vazia, que o tipo
 * não vê.
 */
describe("config do tour guiado", () => {
  it("tem ids únicos", () => {
    const ids = GUIDE_STEPS.map((step) => step.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("expõe GUIDE_STEP_IDS espelhando a lista", () => {
    expect(GUIDE_STEP_IDS).toEqual(GUIDE_STEPS.map((step) => step.id));
  });

  it("tem pelo menos o conceito, o principal e o fim", () => {
    expect(GUIDE_STEP_IDS[0]).toBe("concept");
    expect(GUIDE_STEP_IDS[GUIDE_STEP_IDS.length - 1]).toBe("end");
    // O caso de uso principal do produto não pode ficar de fora.
    expect(GUIDE_STEP_IDS).toContain("embed");
  });

  it("rotas de navegação começam com barra", () => {
    for (const step of GUIDE_STEPS) {
      if (step.to) expect(step.to.startsWith("/")).toBe(true);
    }
  });

  it("seletores de alvo parecem seletores", () => {
    for (const step of GUIDE_STEPS) {
      if (step.target) expect(step.target.startsWith(".")).toBe(true);
    }
  });

  it("todas as chaves de título e corpo existem e não são vazias", () => {
    for (const locale of LOCALES) {
      for (const step of GUIDE_STEPS) {
        expect(t(locale, step.titleKey).trim().length).toBeGreaterThan(0);
        expect(t(locale, step.bodyKey).trim().length).toBeGreaterThan(0);
      }
    }
  });
});
