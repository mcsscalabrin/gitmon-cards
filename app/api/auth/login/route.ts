import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { appBaseUrl, oauthAuthorizeUrl, oauthConfig } from "@/lib/github/oauth";

const STATE_COOKIE = "gitmon_oauth_state";
const STATE_MAX_AGE = 600; // 10 minutos

/**
 * GET /api/auth/login — gera um state CSRF aleatório, salva num cookie
 * httpOnly, e redireciona para o GitHub OAuth authorize.
 *
 * Sem as env vars de OAuth configuradas, degrada para redirect para `/`.
 */
export async function GET() {
  const config = oauthConfig();
  if (!config) return NextResponse.redirect(new URL("/", appBaseUrl()));

  const state = randomBytes(16).toString("hex");

  const res = NextResponse.redirect(oauthAuthorizeUrl(state));
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: STATE_MAX_AGE,
  });
  return res;
}
