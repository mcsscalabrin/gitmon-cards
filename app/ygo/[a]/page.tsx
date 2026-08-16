import type { Metadata } from "next";
import Link from "next/link";
import { CopyField } from "@/components/ui/CopyField";
import { ErrorState } from "@/components/ui/ErrorState";
import { Shell } from "@/components/ui/Shell";
import { YgoReplay } from "@/components/ygo/YgoReplay";
import { absoluteUrl } from "@/lib/config";
import { GitmonError } from "@/lib/github/errors";
import { translator } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { loadYgo } from "@/lib/ygo/store";

type Params = { params: Promise<{ a: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { a: ygoId } = await params;
  const image = absoluteUrl(`/ygo/${ygoId}.png`);
  return {
    title: "Speed Duel",
    openGraph: { images: [image] },
    twitter: { card: "summary_large_image", images: [image] },
  };
}

/**
 * Resultado de um Speed Duel específico. Imutável: o mesmo link mostra sempre o
 * mesmo duelo, com o mesmo log (mesma regra do duelo v2). Quem quiser outro
 * resultado volta para `/ygo/<a>/vs/<b>`, que sorteia de novo.
 */
export default async function YgoPage({ params }: Params) {
  const { a: ygoId } = await params;
  const locale = await getLocale();
  const t = translator(locale);

  const result = await loadYgo(ygoId);

  if (!result) {
    return (
      <Shell locale={locale}>
        <ErrorState
          error={new GitmonError("ygo_expired", "expirado")}
          subject={ygoId}
          locale={locale}
        />
      </Shell>
    );
  }

  const posterUrl = absoluteUrl(`/ygo/${ygoId}.png`);

  return (
    <Shell locale={locale}>
      <YgoReplay result={result} locale={locale} />

      <section className="battle-actions">
        <h2>{t("ygo.share")}</h2>
        <CopyField value={posterUrl} copyLabel={t("home.copy")} copiedLabel={t("home.copied")} />
        <div className="battle-links">
          <Link className="button" href={`/ygo/${result.players.a}/vs/${result.players.b}`}>
            {t("ygo.rematch")}
          </Link>
        </div>
      </section>
    </Shell>
  );
}
