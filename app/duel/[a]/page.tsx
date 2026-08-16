import type { Metadata } from "next";
import Link from "next/link";
import { DuelReplay } from "@/components/duel/DuelReplay";
import { CopyField } from "@/components/ui/CopyField";
import { ErrorState } from "@/components/ui/ErrorState";
import { HelpButton } from "@/components/ui/HelpButton";
import { Shell } from "@/components/ui/Shell";
import { loadDuel } from "@/lib/duel/store";
import { absoluteUrl } from "@/lib/config";
import { GitmonError } from "@/lib/github/errors";
import { HELP, stepsForSection } from "@/lib/guide/help";
import { translator } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";

type Params = { params: Promise<{ a: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { a: duelId } = await params;
  const image = absoluteUrl(`/duel/${duelId}.png`);
  return {
    title: "Duel",
    openGraph: { images: [image] },
    twitter: { card: "summary_large_image", images: [image] },
  };
}

/**
 * Resultado de um duelo específico. Imutável: o mesmo link mostra sempre o mesmo
 * duelo, com o mesmo log (RFC 7.3). Quem quiser outro resultado volta para
 * `/duel/<a>/vs/<b>`, que sorteia de novo.
 */
export default async function DuelPage({ params }: Params) {
  const { a: duelId } = await params;
  const locale = await getLocale();
  const t = translator(locale);

  const duel = await loadDuel(duelId);

  if (!duel) {
    return (
      <Shell locale={locale}>
        <ErrorState
          error={new GitmonError("duel_expired", "expirado")}
          subject={duelId}
          locale={locale}
        />
      </Shell>
    );
  }

  const posterUrl = absoluteUrl(`/duel/${duelId}.png`);

  return (
    <Shell locale={locale}>
      <DuelReplay duel={duel} locale={locale} />

      <section className="battle-actions">
        <div className="battle-actions-heading">
          <h2>{t("duel.share")}</h2>
          <HelpButton
            title={t(HELP.poster.titleKey)}
            body={t(HELP.poster.bodyKey)}
            label={t("help.trigger")}
            steps={stepsForSection("poster")}
            stepByStepLabel={t("help.stepByStep")}
          />
        </div>
        <CopyField value={posterUrl} copyLabel={t("home.copy")} copiedLabel={t("home.copied")} />
        <div className="battle-links">
          <Link className="button" href={`/duel/${duel.a.id}/vs/${duel.b.id}`}>
            {t("duel.rematch")}
          </Link>
          <Link className="button" href={`/ygo/${duel.a.id}/vs/${duel.b.id}`}>
            {t("battle.asYgo")}
          </Link>
          <Link className="ghost-link" href={`/${duel.a.id}`}>
            {duel.a.name}
          </Link>
          <Link className="ghost-link" href={`/${duel.b.id}`}>
            {duel.b.name}
          </Link>
        </div>
      </section>
    </Shell>
  );
}
