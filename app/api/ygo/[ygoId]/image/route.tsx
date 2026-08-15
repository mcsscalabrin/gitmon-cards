import { BATTLE_IMAGE_CACHE_CONTROL } from "@/lib/config";
import { DEFAULT_CARD_LOCALE, parseLocale } from "@/lib/i18n/dictionaries";
import { renderYgo } from "@/lib/og/renderYgo";
import { renderErrorCard } from "@/lib/og/renderError";
import { loadYgo } from "@/lib/ygo/store";

export const runtime = "nodejs";

/**
 * Pôster do Speed Duel, servido em `/ygo/<id>.png` pelo rewrite.
 *
 * Mesma regra do pôster de duelo: resultado imutável, cache duro. A arena em
 * `/ygo/<a>/vs/<b>` é que não pode ser cacheada — sorteia de novo a cada visita.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ ygoId: string }> },
) {
  const { ygoId } = await params;
  const locale = parseLocale(
    new URL(request.url).searchParams.get("lang"),
    DEFAULT_CARD_LOCALE,
  );

  const result = await loadYgo(ygoId);

  if (!result) {
    const image = await renderErrorCard("ygo_expired", ygoId, locale);
    return withHeaders(image, "public, max-age=60, s-maxage=60", 404);
  }

  const image = await renderYgo(result, locale);
  return withHeaders(image, BATTLE_IMAGE_CACHE_CONTROL);
}

function withHeaders(image: Response, cacheControl: string, status = 200): Response {
  const headers = new Headers(image.headers);
  headers.set("Cache-Control", cacheControl);
  headers.set("Content-Type", "image/png");
  return new Response(image.body, { status, headers });
}
