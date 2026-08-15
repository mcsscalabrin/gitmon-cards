import { Shell } from "@/components/ui/Shell";
import { YgoBoard } from "@/components/ygo/YgoBoard";
import { getLocale } from "@/lib/i18n/server";
import { randomSeed } from "@/lib/ygo/engine";

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

  return (
    <Shell locale={locale}>
      <YgoBoard a={a} b={b} seed={randomSeed()} locale={locale} />
    </Shell>
  );
}
