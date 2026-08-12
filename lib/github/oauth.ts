import "server-only";

// Minimal GitHub OAuth App flow — "match your own profile in one click". A
// visitor hits /api/auth/login, gets bounced to GitHub, and lands back on
// /<their login> where the scout already ran. No session is kept: the OAuth
// token is exchanged, used once to read the login, then discarded.
//
// Configure a GitHub OAuth App (github.com/settings/developers) with the
// callback URL <your-origin>/api/auth/callback. Everything degrades cleanly:
// without GITHUB_OAUTH_CLIENT_ID/GITHUB_OAUTH_CLIENT_SECRET the login button
// simply doesn't render.

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
}

export function oauthConfig(): OAuthConfig | null {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  // GitHub OAuth App client secrets are always 40 lowercase hex chars; a client
  // ID never is. Catches the classic client_id/client_secret copy-paste swap,
  // which would otherwise only surface as a confusing failure at authorize time.
  if (/^[0-9a-f]{40}$/.test(clientId)) {
    console.warn(
      "[oauth] GITHUB_OAUTH_CLIENT_ID looks like a client secret (40-hex). Check the env vars.",
    );
    return null;
  }
  return { clientId, clientSecret };
}

export function oauthEnabled(): boolean {
  return oauthConfig() !== null;
}

// The origin used to build the OAuth redirect_uri. Explicit override wins;
// VERCEL_URL covers Vercel deploys (preview + production); localhost as a last
// resort for local dev.
export function appBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (prod) return `https://${prod}`;
  const url = process.env.VERCEL_URL?.trim();
  if (url) return `https://${url}`;
  return "http://localhost:3000";
}

export function oauthAuthorizeUrl(state: string): string {
  const config = oauthConfig();
  if (!config) throw new Error("OAuth is not configured.");
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
  if (!config) throw new Error("OAuth is not configured.");
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
    }),
  });
  if (!res.ok) throw new Error("GitHub rejected the OAuth code.");
  const body = (await res.json()) as {
    access_token?: string;
    error_description?: string;
  };
  if (!body.access_token)
    throw new Error(body.error_description ?? "OAuth exchange failed.");
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
      `GitHub didn't return the logged-in user (HTTP ${res.status}): ${snippet}`,
    );
  }
  const body = (await res.json()) as {
    login?: string;
    name?: string | null;
    avatar_url?: string;
  };
  if (!body.login) throw new Error("GitHub didn't return a login.");
  return {
    login: body.login,
    name: body.name ?? null,
    avatarUrl: body.avatar_url ?? "",
  };
}
