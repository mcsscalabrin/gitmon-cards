import { getProfileCard } from "@/lib/cards";
import { renderCardOg } from "@/lib/og/renderCardOg";
import { respondWithCard } from "@/lib/og/respond";

// sharp e as fontes vêm do disco: precisa do runtime Node, não do edge.
export const runtime = "nodejs";

/**
 * Prévia de link do perfil, em paisagem. Só o `generateMetadata` da página
 * aponta para cá — não há rewrite bonito, porque esta URL vive em meta tag e
 * ninguém a cola à mão.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string }> },
) {
  const { owner } = await params;
  return respondWithCard(request, () => getProfileCard(owner), owner, renderCardOg);
}
