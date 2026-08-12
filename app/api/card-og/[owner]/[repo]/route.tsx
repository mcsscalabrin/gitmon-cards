import { getRepoCard } from "@/lib/cards";
import { renderCardOg } from "@/lib/og/renderCardOg";
import { respondWithCard } from "@/lib/og/respond";

export const runtime = "nodejs";

/** Prévia de link do repositório, em paisagem. Ver a rota irmã de perfil. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  const { owner, repo } = await params;
  return respondWithCard(
    request,
    () => getRepoCard(owner, repo),
    `${owner}/${repo}`,
    renderCardOg,
  );
}
