import { describe, expect, it } from "vitest";
import { GUIDE_STEP_IDS, GUIDE_STEPS } from "@/lib/guide/steps";
import { PAGE_STEP_IDS, stepsForPath } from "@/lib/guide/pages";
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

  it("cobre os casos de uso do site", () => {
    expect(GUIDE_STEP_IDS).toContain("generate");
    expect(GUIDE_STEP_IDS).toContain("pack");
    expect(GUIDE_STEP_IDS).toContain("embed");
    expect(GUIDE_STEP_IDS).toContain("posters");
    expect(GUIDE_STEP_IDS).toContain("battle-board");
    expect(GUIDE_STEP_IDS).toContain("battle-lp");
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

/**
 * O tour por página: o "Guia" do cabeçalho roda os passos cujos alvos existem
 * na rota atual, e cada página tem um tour não vazio.
 */
describe("tour por página", () => {
  it("resolve a home para a busca", () => {
    expect(stepsForPath("/").map((s) => s.id)).toEqual(["generate"]);
  });

  it("resolve um perfil para o tour inteiro da carta", () => {
    expect(stepsForPath("/torvalds").map((s) => s.id)).toEqual(PAGE_STEP_IDS.profile);
  });

  it("resolve um repositório sem o seletor de modos", () => {
    expect(stepsForPath("/torvalds/linux").map((s) => s.id)).toEqual(PAGE_STEP_IDS.repo);
  });

  it("resolve resultados (batalha, duelo, Speed Duel) para o pôster", () => {
    for (const path of ["/battle/abc", "/duel/abc", "/ygo/abc"]) {
      expect(stepsForPath(path).map((s) => s.id)).toEqual(["posters"]);
    }
  });

  it("resolve duelos ao vivo para o tour do board", () => {
    for (const path of ["/duel/a/vs/b", "/ygo/a/vs/b"]) {
      expect(stepsForPath(path).map((s) => s.id)).toEqual(PAGE_STEP_IDS.duel);
    }
  });

  it("todo id de página existe no tour", () => {
    for (const ids of Object.values(PAGE_STEP_IDS)) {
      for (const id of ids) expect(GUIDE_STEP_IDS).toContain(id);
    }
  });

  it("nenhuma página fica sem passos", () => {
    for (const path of [
      "/",
      "/torvalds",
      "/torvalds/linux",
      "/battle/abc",
      "/duel/abc",
      "/ygo/abc",
      "/duel/a/vs/b",
      "/ygo/a/vs/b",
    ]) {
      expect(stepsForPath(path).length).toBeGreaterThan(0);
    }
  });
});
