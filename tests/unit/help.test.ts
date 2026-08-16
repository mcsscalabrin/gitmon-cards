import { describe, expect, it } from "vitest";
import { HELP, HELP_IDS } from "@/lib/guide/help";
import { GUIDE_STEPS } from "@/lib/guide/steps";
import { LOCALES, t } from "@/lib/i18n/dictionaries";

/**
 * A ajuda por seção é config pura, como o tour: dá para provar invariantes sem
 * montar React. O conteúdo reaproveita os passos do tour — o teste garante que
 * cada seção aponta para um passo que existe e que nenhum texto nasce vazio.
 */
describe("ajuda por seção (?)", () => {
  it("cobre as seções principais do site", () => {
    for (const id of ["search", "card", "radar", "why", "embed", "battle", "poster"]) {
      expect(HELP_IDS).toContain(id);
    }
  });

  it("cada seção reusa um passo do tour guiado que existe", () => {
    const stepKeys = GUIDE_STEPS.flatMap((step) => [step.titleKey, step.bodyKey]);
    for (const section of Object.values(HELP)) {
      expect(stepKeys).toContain(section.titleKey);
      expect(stepKeys).toContain(section.bodyKey);
    }
  });

  it("títulos e corpos não são vazios nos dois idiomas", () => {
    for (const locale of LOCALES) {
      for (const section of Object.values(HELP)) {
        expect(t(locale, section.titleKey).trim().length).toBeGreaterThan(0);
        expect(t(locale, section.bodyKey).trim().length).toBeGreaterThan(0);
      }
    }
  });
});
