import type { Metadata } from "next";
import { StartGuideButton } from "@/components/guide/StartGuideButton";
import { CopyField } from "@/components/ui/CopyField";
import { Shell } from "@/components/ui/Shell";
import { GUIDE_STEPS } from "@/lib/guide/steps";
import { absoluteUrl } from "@/lib/config";
import { translator } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Guia",
  description:
    "Como o Gitmon Cards funciona: gerar cartas, ler os números, embutir no README, batalhar e compartilhar.",
};

/**
 * Página do guia: o mesmo conteúdo dos passos do tour, em texto que rola e fica
 * indexável. O tour é a visita guiada; esta página é o material de referência —
 * quem quer uma consulta rápida não precisa de spotlight.
 */
export default async function DocsPage() {
  const locale = await getLocale();
  const t = translator(locale);

  const embedExample = `[![torvalds](${absoluteUrl("/torvalds.png")})](https://github.com/torvalds)`;

  return (
    <Shell locale={locale}>
      <section className="docs">
        <header className="docs-hero">
          <h1>{t("docs.title")}</h1>
          <p>{t("docs.lead")}</p>
          <StartGuideButton label={t("docs.startTour")} />
        </header>

        <ol className="docs-sections">
          {GUIDE_STEPS.map((step) => (
            <li key={step.id} id={step.id}>
              <h2>{t(step.titleKey)}</h2>
              <p>{t(step.bodyKey)}</p>
              {step.id === "embed" ? (
                <CopyField
                  value={embedExample}
                  copyLabel={t("home.copy")}
                  copiedLabel={t("home.copied")}
                />
              ) : null}
              {step.id === "posters" ? (
                <CopyField
                  value={t("docs.posters.code")}
                  copyLabel={t("home.copy")}
                  copiedLabel={t("home.copied")}
                />
              ) : null}
            </li>
          ))}
        </ol>
      </section>
    </Shell>
  );
}
