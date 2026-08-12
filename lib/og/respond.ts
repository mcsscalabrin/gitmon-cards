import type { ImageResponse } from "next/og";
import { CARD_IMAGE_CACHE_CONTROL } from "../config";
import { httpStatusFor, isGitmonError } from "../github/errors";
import { DEFAULT_CARD_LOCALE, parseLocale } from "../i18n/dictionaries";
import type { Card } from "../cards/types";
import type { Locale } from "../i18n/dictionaries";
import { renderCard } from "./renderCard";
import { renderErrorCard } from "./renderError";

/**
 * Envelope compartilhado pelas rotas de imagem: idioma, cabeçalhos de cache e
 * tradução de erro em carta de erro. Sem isto cada rota repetiria a mesma
 * política de cache, que é exatamente o tipo de coisa que dessincroniza.
 *
 * `render` existe para a prévia de link (`renderCardOg`) entrar no mesmo
 * envelope. O caminho de erro **não** é parametrizado de propósito: uma carta de
 * erro em retrato numa prévia de link fica cortada, e é bom que fique — quem
 * colou um link para um perfil que não existe precisa ver que algo deu errado, e
 * não uma peça bem acabada dizendo isso baixinho.
 */
export async function respondWithCard(
  request: Request,
  load: () => Promise<Card>,
  subject: string,
  render: (card: Card, locale: Locale) => Promise<ImageResponse> = renderCard,
): Promise<Response> {
  const locale = parseLocale(
    new URL(request.url).searchParams.get("lang"),
    DEFAULT_CARD_LOCALE,
  );

  try {
    const card = await load();
    const image = await render(card, locale);
    return withHeaders(image, CARD_IMAGE_CACHE_CONTROL);
  } catch (error) {
    const code = isGitmonError(error) ? error.code : "upstream";
    if (!isGitmonError(error)) console.error("[card-image]", error);

    const image = await renderErrorCard(code, subject, locale);
    // Erro não recebe o cache longo da carta: o usuário pode existir daqui a
    // pouco, o rate limit reseta, e uma imagem de erro presa na CDN por um dia
    // seria pior que o erro.
    return withHeaders(image, "public, max-age=60, s-maxage=60", httpStatusFor(code));
  }
}

function withHeaders(image: Response, cacheControl: string, status = 200): Response {
  const headers = new Headers(image.headers);
  headers.set("Cache-Control", cacheControl);
  headers.set("Content-Type", "image/png");
  return new Response(image.body, { status, headers });
}
