import { loadDuel } from "@/lib/duel/store";
import { BATTLE_IMAGE_CACHE_CONTROL } from "@/lib/config";
import { DEFAULT_CARD_LOCALE, parseLocale } from "@/lib/i18n/dictionaries";
import { renderDuel } from "@/lib/og/renderDuel";
import { renderErrorCard } from "@/lib/og/renderError";

export const runtime = "nodejs";

/**
 * Pôster do resultado, servido em `/duel/<id>.png` pelo rewrite.
 *
 * Mesma regra do pôster de batalha: resultado imutável, cache duro. O confronto
 * genérico em `/duel/<a>/vs/<b>` é que não pode ser cacheado — sorteia de novo a
 * cada visita.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ duelId: string }> },
) {
  const { duelId } = await params;
  const locale = parseLocale(
    new URL(request.url).searchParams.get("lang"),
    DEFAULT_CARD_LOCALE,
  );

  const duel = await loadDuel(duelId);

  if (!duel) {
    const image = await renderErrorCard("duel_expired", duelId, locale);
    return withHeaders(image, "public, max-age=60, s-maxage=60", 404);
  }

  const image = await renderDuel(duel, locale);
  return withHeaders(image, BATTLE_IMAGE_CACHE_CONTROL);
}

function withHeaders(image: Response, cacheControl: string, status = 200): Response {
  const headers = new Headers(image.headers);
  headers.set("Cache-Control", cacheControl);
  headers.set("Content-Type", "image/png");
  return new Response(image.body, { status, headers });
}
