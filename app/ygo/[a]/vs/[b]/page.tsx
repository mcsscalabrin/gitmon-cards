import Link from "next/link";
import { Shell } from "@/components/ui/Shell";
import { YgoBoard } from "@/components/ygo/YgoBoard";
import { translator } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { randomSeed } from "@/lib/ygo/engine";
import { ROSTER_LOGINS } from "@/lib/ygo/roster";

/**
 * `/ygo/<a>/vs/<b>` — a arena do Speed Duel (estilo Duel Links). O visitante é
 * o lado A; o lado B é a IA.
 *
 * Sem cache: cada visita sorteia uma semente nova e um duelo novo (mesma regra
 * do duelo v2). O resultado estável vai para `/ygo/<id>`, onde o replay e o
 * pôster são imutáveis.
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

  // O duelo v2 busca os dois lados no GitHub; só oferece a troca quando os dois
  // são perfis do elenco (a arena ygo aceita qualquer rótulo).
  const canDuel = ROSTER_LOGINS.includes(a) && ROSTER_LOGINS.includes(b);

  return (
    <Shell locale={locale}>
      {canDuel ? (
        <div className="mode-switch">
          <Link href={`/duel/${a}/vs/${b}`}>{t("ygo.asDuel")}</Link>
        </div>
      ) : null}
      <YgoBoard a={a} b={b} seed={randomSeed()} locale={locale} />
    </Shell>
  );
}
