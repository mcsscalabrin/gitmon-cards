// Pool de tokens do GitHub. O limite da API REST (~5.000 req/h) é por *conta*,
// então `GITHUB_TOKENS` aceita tokens de contas distintas e multiplica o teto
// (4 tokens ≈ 20k req/h). A seleção é um hash sem estado do login — cada
// instância serverless (ou worker) calcula a mesma escolha sem coordenação,
// distribui usuários distintos de forma uniforme e prende um login a um token,
// o que compõe com o single-flight de `lib/cards/index.ts`.
//
// O Redis entra só no caminho infeliz: os headers de rate limit de cada resposta
// são gravados por token (fire-and-forget), e quando o token do chamador é
// limitado, `pickFailover` escolhe o token mais saudável dos outros. Mesma
// postura de `lib/cache/redis.ts` — o Redis é consultivo e best-effort, nunca
// bloqueia nem derruba o caminho quente. Sem dado de saúde, o token é tratado
// como saudável.

import { getRedisClient } from "../cache/redis";

export interface PoolToken {
  token: string;
  idx: number;
}

interface TokenHealth {
  remaining: number; // pontos restantes desta janela (x-ratelimit-remaining)
  reset: number; // timestamp unix em que a janela recarrega (x-ratelimit-reset)
}

const HEALTH_VERSION = "v1";
const keyFor = (idx: number) => `gitmon:ghtoken:${HEALTH_VERSION}:${idx}`;
// A janela dura no máximo ~65 min (60 + drift); saúde velha expira em "desconhecido".
const HEALTH_TTL_SECONDS = 65 * 60;
// Abaixo disto o token é poupado até o reset — folga o bastante para que scouts
// em voo (alguns pontos cada) não estourem o zero no meio.
const BENCH_REMAINING = 200;
// Bench de segurança quando a resposta limitada não traz reset/Retry-After útil.
const BENCH_FALLBACK_SECONDS = 120;

// `GITHUB_TOKENS` (separado por vírgula, contas distintas) vence; `GITHUB_TOKEN`
// sozinho continua funcionando como um pool de um, então deploys existentes se
// comportam exatamente como antes.
export function tokenPool(): PoolToken[] {
  const multi = process.env.GITHUB_TOKENS;
  if (multi) {
    const tokens = multi
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (tokens.length) return tokens.map((token, idx) => ({ token, idx }));
  }
  const single = process.env.GITHUB_TOKEN;
  return single ? [{ token: single, idx: 0 }] : [];
}

// FNV-1a: pequeno, estável e bem distribuído para strings curtas. Em minúsculas
// para que a caixa ignorada pelo GitHub não espalhe o mesmo usuário por tokens.
export function hashLogin(login: string): number {
  const s = login.toLowerCase();
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function pickToken(login: string, pool = tokenPool()): PoolToken | null {
  if (!pool.length) return null;
  return pool[hashLogin(login) % pool.length];
}

// Grava os headers de rate limit de um token após uma resposta do GitHub.
// Fire-and-forget: o chamador nunca espera, e perder uma amostra não faz mal —
// a próxima resposta sobrescreve.
export async function recordTokenHealth(idx: number, headers: Headers): Promise<void> {
  const remaining = headers.get("x-ratelimit-remaining");
  const reset = headers.get("x-ratelimit-reset");
  if (remaining === null || reset === null) return;
  const health: TokenHealth = { remaining: Number(remaining), reset: Number(reset) };
  if (!Number.isFinite(health.remaining) || !Number.isFinite(health.reset)) return;
  const redis = await getRedisClient();
  if (!redis) return;
  try {
    await redis.set(keyFor(idx), JSON.stringify(health), "EX", HEALTH_TTL_SECONDS);
  } catch (e) {
    console.error("[tokens] health write failed:", (e as Error).message);
  }
}

// Põe um token de castigo por rate limit (403/429), até o mais tardar entre o
// reset da janela e qualquer Retry-After (limites secundários/abuso mandam
// Retry-After enquanto a janela horária ainda tem pontos). Fire-and-forget.
export async function benchToken(idx: number, headers: Headers): Promise<void> {
  const nowSec = Math.floor(Date.now() / 1000);
  const retryAfter = Number(headers.get("retry-after") ?? NaN);
  const reset = Number(headers.get("x-ratelimit-reset") ?? NaN);
  const until = Math.max(
    Number.isFinite(retryAfter) ? nowSec + retryAfter : 0,
    Number.isFinite(reset) ? reset : 0,
    nowSec + BENCH_FALLBACK_SECONDS,
  );
  const redis = await getRedisClient();
  if (!redis) return;
  try {
    await redis.set(
      keyFor(idx),
      JSON.stringify({ remaining: 0, reset: until } satisfies TokenHealth),
      "EX",
      HEALTH_TTL_SECONDS,
    );
  } catch (e) {
    console.error("[tokens] bench write failed:", (e as Error).message);
  }
}

// O token mais saudável que não seja `excludeIdx`: maior remaining conhecido,
// com saúde desconhecida/vencida tratada como janela nova (quota completa).
// Tokens de castigo (abaixo da folga, reset ainda à frente) são pulados; se
// todos os outros estiverem de castigo, devolve null e o chamador propaga o
// erro de rate limit. Redis fora do ar/ilegível degrada para "primeiro outro
// token", em vez de falhar.
export async function pickFailover(
  excludeIdx: number,
  pool = tokenPool(),
): Promise<PoolToken | null> {
  const candidates = pool.filter((t) => t.idx !== excludeIdx);
  if (!candidates.length) return null;

  const redis = await getRedisClient();
  if (!redis) return candidates[0];

  try {
    const raws = await Promise.all(candidates.map((t) => redis.get(keyFor(t.idx))));
    const nowSec = Math.floor(Date.now() / 1000);
    let best: PoolToken | null = null;
    let bestRemaining = -1;
    for (let i = 0; i < candidates.length; i++) {
      let remaining = Infinity; // sem dado → assume saudável
      if (raws[i]) {
        const h = JSON.parse(raws[i] as string) as TokenHealth;
        remaining = nowSec >= h.reset ? Infinity : h.remaining; // passou do reset → recarregou
      }
      if (remaining < BENCH_REMAINING) continue; // de castigo
      if (remaining > bestRemaining) {
        best = candidates[i];
        bestRemaining = remaining;
      }
    }
    return best;
  } catch (e) {
    console.error("[tokens] failover read failed:", (e as Error).message);
    return candidates[0];
  }
}