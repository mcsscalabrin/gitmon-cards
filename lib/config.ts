/**
 * Nenhum domínio hardcoded em lugar nenhum (RFC 11) — o destino é um subdomínio
 * de scalabrin.dev e a migração não pode virar retrabalho. Todo link absoluto
 * (metadata, OG tags, snippets de embed) passa por aqui.
 */
export function baseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  // Preview de deploy na Vercel: a URL só existe em runtime.
  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}

export function absoluteUrl(path: string): string {
  return `${baseUrl()}/${path.replace(/^\/+/, "")}`;
}

/**
 * Cache das cartas: a mesma política do gitfut (RFC 4.2). A CDN resolve tudo pelo
 * header — não há Blob nem object storage no caminho da imagem.
 */
export const CARD_IMAGE_CACHE_CONTROL =
  "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

/**
 * Um resultado de batalha já sorteado é imutável, então pode ter cache duro — ao
 * contrário da rota /<a>/vs/<b>, que precisa poder sortear de novo (RFC 7.3).
 */
export const BATTLE_IMAGE_CACHE_CONTROL =
  "public, max-age=31536000, s-maxage=31536000, immutable";

/**
 * Identidade do próprio projeto. Estes são destinos externos, não o domínio do
 * produto — a RFC 11 proíbe hardcodar o segundo, não os primeiros. Ficam aqui
 * porque estavam espalhados pelo `Shell` e agora também alimentam a contagem de
 * estrelas da faixa de apoio.
 */
export const PROJECT_REPO = { owner: "mcsscalabrin", name: "gitmon-cards" } as const;
export const PROJECT_REPO_URL = `https://github.com/${PROJECT_REPO.owner}/${PROJECT_REPO.name}`;
export const SPONSOR_URL = `https://github.com/sponsors/${PROJECT_REPO.owner}`;

/**
 * Quem assina. Lista, e não um autor só, porque o projeto passou a ter mais de
 * um — e o rodapé de um projeto aberto é o único lugar onde a atribuição é
 * barata e permanente.
 *
 * Aponta para o perfil do GitHub, não para o site pessoal: o produto é feito de
 * dados do GitHub e é lá que o visitante consegue seguir o fio. O crédito
 * continua sendo atribuição e não chamada para ação (RFC 9.3) — quem quiser
 * patrocinar tem a faixa acima.
 */
export const AUTHORS = [
  { handle: "@mcsscalabrin", url: "https://github.com/mcsscalabrin" },
  { handle: "@benogoulart", url: "https://github.com/benogoulart" },
] as const;

/**
 * A contagem de estrelas do próprio repositório envelhece devagar e não vale uma
 * chamada à API por visita. Uma hora é folgado o bastante para não pesar e curto
 * o bastante para o número não parecer mentira.
 */
export const PROJECT_STARS_TTL_SECONDS = readInt("PROJECT_STARS_TTL_SECONDS", 3600);

export const CARD_DATA_TTL_SECONDS = readInt("CARD_DATA_TTL_SECONDS", 3600);
export const BATTLE_TTL_SECONDS = readInt("BATTLE_TTL_SECONDS", 2592000);
export const DUEL_TTL_SECONDS = readInt("DUEL_TTL_SECONDS", 2592000);

function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
