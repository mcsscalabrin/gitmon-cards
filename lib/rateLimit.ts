import { cache } from "react";
import { headers } from "next/headers";
import type Redis from "ioredis";
import { getRedisClient } from "./cache/redis";
import { GitmonError } from "./github/errors";

// Orçamento de buscas por IP, protegendo o pool de tokens do GitHub de scripts e
// scrapers. Aplicado na camada de dados, ANTES do cache/fetch, então toda busca
// de carta — cacheada ou não — conta contra a janela.
//
// Limites por IP, janela fixa (INCR + EXPIRE). Best-effort, espelhando
// lib/cache/redis.ts: sem Redis (ou com Redis com soluço), a mesma janela é
// garantida por um contador em memória (por instância — suficiente em dev e uma
// degradação graciosa em produção). Nada aqui lança em cima de infra; quo o
// limite estourou, lança GitmonError("rate_limit"), que as rotas já sabem
// renderizar (i18n + status 429).

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

// Defaults: 20 buscas por IP a cada 10 min. Tuning por env para produção ajustar
// sem tocar em código — e o valor default continua o mesmo de sempre.
export const ALLOWED_PER_WINDOW = readLimit("CARD_RATE_LIMIT_PER_WINDOW", 20);
export const WINDOW_SECONDS = readLimit("CARD_RATE_LIMIT_WINDOW_SECONDS", 10 * 60);
const KEY_PREFIX = "gitmon:rl:";

function readLimit(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

// O Vercel entrega o IP real em x-forwarded-for (primeiro hop) / x-real-ip; o que
// estiver à frente pode prefixar seus próprios hops, então só o primeiro valor é
// confiável.
export function clientIp(h: Headers): string {
  const fwd = h.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = h.get("x-real-ip");
  if (real) {
    const t = real.trim();
    if (t) return t;
  }
  return "unknown";
}

// Janela em memória (uma por instância). Limitada: quando passa do limiar, os
// buckets expirados são podados antes de admitir novos.
const memory = new Map<string, { count: number; resetAt: number }>();

export function allowFromMemory(ip: string): RateLimitDecision {
  const now = Date.now();
  if (memory.size > 1000) {
    for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
  }
  let rec = memory.get(ip);
  if (!rec || rec.resetAt <= now) {
    rec = { count: 0, resetAt: now + WINDOW_SECONDS * 1000 };
    memory.set(ip, rec);
  }
  rec.count++;
  if (rec.count <= ALLOWED_PER_WINDOW) return { allowed: true, retryAfterSeconds: 0 };
  return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((rec.resetAt - now) / 1000)) };
}

// Contador de janela fixa no Redis, compartilhado entre instâncias. Segundos até
// o próximo bucket é o Retry-After para um IP bloqueado.
async function allowFromRedis(redis: Redis, ip: string): Promise<RateLimitDecision> {
  const nowSec = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(nowSec / WINDOW_SECONDS);
  const key = `${KEY_PREFIX}${ip}:${bucket}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, WINDOW_SECONDS);
  if (count <= ALLOWED_PER_WINDOW) return { allowed: true, retryAfterSeconds: 0 };
  return { allowed: false, retryAfterSeconds: WINDOW_SECONDS - (nowSec % WINDOW_SECONDS) };
}

// Memoizado por requisição, então generateMetadata + render da mesma página
// compartilham UMA checagem (e um incremento) — o mesmo padrão de single-flight
// do loadProfile. Lança GitmonError("rate_limit") quando bloqueado.
export const checkCardRateLimit = cache(async (): Promise<void> => {
  // Em dev a única "ameaça" é o próprio desenvolvedor recarregando a carta —
  // puni-lo com o orçamento anti-scraper é sabotar o fluxo que a janela existe
  // para proteger. Produção continua bloqueando IP (ver lib/rateLimit.ts).
  if (process.env.NODE_ENV === "development") return;
  let ip = "unknown";
  try {
    ip = clientIp(await headers());
  } catch {
    // Fora de um escopo de requisição (biblioteca ou teste) — abre o jogo.
    return;
  }
  const redis = await getRedisClient();
  if (!redis) {
    const decision = allowFromMemory(ip);
    if (!decision.allowed) throw blocked(decision);
    return;
  }
  try {
    const decision = await allowFromRedis(redis, ip);
    if (!decision.allowed) throw blocked(decision);
  } catch (e) {
    if (e instanceof GitmonError) throw e;
    // Soluço do Redis — mantém o limite, por instância.
    const decision = allowFromMemory(ip);
    if (!decision.allowed) throw blocked(decision);
  }
});

function blocked(decision: RateLimitDecision): GitmonError {
  return new GitmonError(
    "rate_limit",
    "Muitas buscas deste IP. Tente novamente em alguns minutos.",
    String(decision.retryAfterSeconds),
  );
}