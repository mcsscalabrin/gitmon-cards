import Link from "next/link";
import { DuelBoard } from "@/components/duel/DuelBoard";
import { ErrorState } from "@/components/ui/ErrorState";
import { Shell } from "@/components/ui/Shell";
import { getProfileCard } from "@/lib/cards";
import type { Card } from "@/lib/cards";
import { randomSeed } from "@/lib/duel/engine";
import { translator } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";

/**
 * `/duel/<perfil>/vs/<perfil>` — o confronto do duelo (sistema v2, dirigido).
 *
 * Sem cache: cada visita sorteia uma semente nova e um duelo novo (mesma regra
 * da rota antiga de batalha, RFC 7.3). O resultado estável vai para
 * `/duel/<id>`.
 *
 * V1 é só perfil vs perfil: a carta de repositório não participa do duelo.
 */
export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ a: string; b: string }>;
}) {
  const { a, b } = await params;
  const locale = await getLocale();
  const t = translator(locale);

  let cardA: Card;
  let cardB: Card;
  try {
    [cardA, cardB] = await Promise.all([getProfileCard(a), getProfileCard(b)]);
  } catch (error) {
    return (
      <Shell locale={locale}>
        <ErrorState error={error} subject={`${a} vs ${b}`} locale={locale} />
      </Shell>
    );
  }

  return (
    <Shell locale={locale}>
      <div className="mode-switch">
        <Link href={`/ygo/${a}/vs/${b}`}>{t("battle.asYgo")}</Link>
      </div>
      <DuelBoard a={cardA} b={cardB} seed={randomSeed()} locale={locale} />
    </Shell>
  );
}
