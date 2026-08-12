import { baseUrl } from "../config";

// Fluxo mínimo de OAuth do GitHub — "gere sua própria carta em um clique". O
// visitante cai em /api/auth/login, é levado ao GitHub e volta para /<seu login>,
// onde a carta já é gerada. Nenhuma sessão é mantida: o token do OAuth é trocado,
// usado uma vez para ler o login e descartado.
//
// Configure um OAuth App do GitHub (github.com/settings/developers) com a URL de
// callback <seu-origin>/api/auth/callback. Tudo degrada limpo: sem
// GITHUB_OAUTH_CLIENT_ID/GITHUB_OAUTH_CLIENT_SECRET o botão de login simplesmente
// não aparece.

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
}

export function oauthConfig(): OAuthConfig | null {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  // Segredos de OAuth App do GitHub são sempre 40 hex em minúsculas; um client ID
  // nunca é. Pega o clássico erro de copiar client_id/client_secret trocados, que
  // senão só aparece como falha confusa na hora do authorize.
  if (/^[0-9a-f]{40}$/.test(clientId)) {
    console.warn(
      "[oauth] GITHUB_OAUTH_CLIENT_ID parece um client secret (40 hex). Verifique as variáveis.",
    );
    return null;
  }
  return { clientId, clientSecret };
}

export function oauthEnabled(): boolean {
  return oauthConfig() !== null;
}

/**
 * A origem usada no redirect_uri do OAuth. Vem do `lib/config.ts` — a RFC 11
 * proíbe hardcodar domínio; o override explícito e as URLs de deploy da Vercel
 * já são resolvidos lá.
 */
function appBaseUrl(): string {
  return baseUrl();
}

export function oauthAuthorizeUrl(state: string): string {
  const config = oauthConfig();
  if (!config) throw new Error("OAuth não configurado.");
  const params = new URLSearchParams({
    client_id: config.clientId,
    scope: "read:user",
    state,
    redirect_uri: `${appBaseUrl()}/api/auth/callback`,
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeOauthCode(code: string): Promise<string> {
  const config = oauthConfig();
  if (!config) throw new Error("OAuth não configurado.");
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
    }),
  });
  if (!res.ok) throw new Error("O GitHub rejeitou o código OAuth.");
  const body = (await res.json()) as {
    access_token?: string;
    error_description?: string;
  };
  if (!body.access_token)
    throw new Error(body.error_description ?? "Troca do código OAuth falhou.");
  return body.access_token;
}

export interface OAuthUser {
  login: string;
  name: string | null;
  avatarUrl: string;
}

export async function fetchOauthUser(token: string): Promise<OAuthUser> {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) {
    const snippet = (await res.text().catch(() => "")).slice(0, 160);
    throw new Error(
      `O GitHub não devolveu o usuário logado (HTTP ${res.status}): ${snippet}`,
    );
  }
  const body = (await res.json()) as {
    login?: string;
    name?: string | null;
    avatar_url?: string;
  };
  if (!body.login) throw new Error("O GitHub não devolveu um login.");
  return {
    login: body.login,
    name: body.name ?? null,
    avatarUrl: body.avatar_url ?? "",
  };
}