import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SupportBand } from "@/components/ui/SupportBand";
import { PROJECT_REPO_URL, SPONSOR_URL } from "@/lib/config";
import { formatCount } from "@/lib/cards/format";
import { LOCALES, t } from "@/lib/i18n/dictionaries";

function html(locale: "pt" | "en", stars: number | null, compact = false): string {
  return renderToStaticMarkup(
    createElement(SupportBand, { locale, stars, compact }),
  );
}

describe("SupportBand (gap 2.3)", () => {
  it("mostra o contador formatado quando o número existe", () => {
    for (const locale of LOCALES) {
      const markup = html(locale, 1234);
      expect(markup).toContain(formatCount(1234));
      expect(markup).toContain(t(locale, "support.stars"));
      expect(markup).toContain(t(locale, "support.title"));
    }
  });

  it("omite o contador sem inventar número quando stars é null", () => {
    for (const locale of LOCALES) {
      const markup = html(locale, null);
      expect(markup).not.toContain("<b>");
      expect(markup).not.toContain(t(locale, "support.stars"));
      // A ação continua disponível: o link não depende do número.
      expect(markup).toContain(PROJECT_REPO_URL);
    }
  });

  it("liga os dois destinos: favoritar e patrocinar", () => {
    const markup = html("pt", 500);
    expect(markup).toContain(PROJECT_REPO_URL);
    expect(markup).toContain(SPONSOR_URL);
    // Ambos abrem em aba nova com a proteção de referrer correta.
    expect(markup.match(/target="_blank"/g)?.length).toBe(2);
    expect(markup).toContain('rel="noreferrer noopener"');
  });

  it("compact só remove o parágrafo, mantendo título e ação", () => {
    const comParagrafo = html("pt", null, false);
    const compacto = html("pt", null, true);
    expect(comParagrafo).toContain(t("pt", "support.description"));
    expect(compacto).not.toContain(t("pt", "support.description"));
    expect(compacto).toContain(t("pt", "support.title"));
    expect(compacto).toContain(t("pt", "support.star"));
    // `data-compact` só existe no formato compacto.
    expect(compacto).toContain("data-compact");
    expect(comParagrafo).not.toContain("data-compact");
  });
});
