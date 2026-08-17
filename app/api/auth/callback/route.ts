import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import {
  appBaseUrl,
  exchangeOauthCode,
  fetchOauthUser,
} from "@/lib/github/oauth";

const STATE_COOKIE = "gitmon_oauth_state";

/**
 * GET /api/auth/callback — redirecionamento do GitHub após o usuário autorizar.
 *
 * 1. Valida o state CSRF (compara cookie com query string).
 * 2. Troca o code por um access_token (descartado em seguida).
 * 3. Lê o login do usuário autenticado.
 * 4. Redireciona para /<login> — a carta já é gerada pelo pipeline existente.
 *
 * Sem sessão: o token é usado uma vez e jogado fora. O cookie de state é
 * deletado imediatamente após a validação.
 *
 * `redirect()` do Next.js lança NEXT_REDIRECT por design — NÃO envolva em
 * try/catch, senão o redirect é engolido como erro.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(new URL("/", appBaseUrl()));
  }

  // Valida e deleta o cookie de state.
  const cookieStore = await cookies();
  const expected = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (!expected || expected !== state) {
    return NextResponse.redirect(new URL("/?auth=error&reason=state", appBaseUrl()));
  }

  // Troca code por token, lê o login, redireciona.
  const token = await exchangeOauthCode(code);
  const user = await fetchOauthUser(token);

  redirect(`/${encodeURIComponent(user.login)}`);
}
