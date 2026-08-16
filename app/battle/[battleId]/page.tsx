import type { Metadata } from "next";
import Link from "next/link";
import { BattleReplay } from "@/components/battle/BattleReplay";
import { CopyField } from "@/components/ui/CopyField";
import { ErrorState } from "@/components/ui/ErrorState";
import { HelpButton } from "@/components/ui/HelpButton";
import { Shell } from "@/components/ui/Shell";
import { loadBattle } from "@/lib/battle/store";
import { absoluteUrl } from "@/lib/config";
import { GitmonError } from "@/lib/github/errors";
import { HELP } from "@/lib/guide/help";
import { translator } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";

type Params = { params: Promise<{ battleId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { battleId } = await params;
  const image = absoluteUrl(`/battle/${battleId}.png`);
  return {
    title: "Battle",
    openGraph: { images: [image] },
    twitter: { card: "summary_large_image", images: [image] },
  };
}

/**
 * Resultado de uma batalha específica. Imutável: o mesmo link mostra sempre a
 * mesma batalha, com o mesmo log (RFC 7.3). Quem quiser outro resultado volta
 * para `/<a>/vs/<b>`, que sorteia de novo.
 */
export default async function BattlePage({ params }: Params) {
  const { battleId } = await params;
  const locale = await getLocale();
  const t = translator(locale);

  const battle = await loadBattle(battleId);

  if (!battle) {
    return (
      <Shell locale={locale}>
        <ErrorState
          error={new GitmonError("battle_expired", "expirado")}
          subject={battleId}
          locale={locale}
        />
      </Shell>
    );
  }

  const posterUrl = absoluteUrl(`/battle/${battleId}.png`);

  return (
    <Shell locale={locale}>
      <BattleReplay battle={battle} locale={locale} />

      <section className="battle-actions">
        <div className="battle-actions-heading">
          <h2>{t("battle.share")}</h2>
          <HelpButton
            title={t(HELP.poster.titleKey)}
            body={t(HELP.poster.bodyKey)}
            label={t("help.trigger")}
          />
        </div>
        <CopyField value={posterUrl} copyLabel={t("home.copy")} copiedLabel={t("home.copied")} />
        <div className="battle-links">
          <Link className="button" href={`/${battle.a.id}/vs/${battle.b.id}`}>
            {t("battle.rematch")}
          </Link>
          <Link className="button" href={`/ygo/${battle.a.id}/vs/${battle.b.id}`}>
            {t("battle.asYgo")}
          </Link>
          <Link className="ghost-link" href={`/${battle.a.id}`}>
            {battle.a.name}
          </Link>
          <Link className="ghost-link" href={`/${battle.b.id}`}>
            {battle.b.name}
          </Link>
        </div>
      </section>
    </Shell>
  );
}
