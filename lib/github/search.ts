import "server-only";
import { tokenPool } from "./tokens";

// GitHub user search (REST /search/users) — powers the home page's "search by
// name" suggestions, so a visitor can find a profile without knowing a username.
// Sits on the same token pool as the GraphQL scout, but search has its OWN rate
// limit (30 req/min per token), so it can't eat into the GraphQL budget. No
// token = no suggestions (typing + submit still works, as before).
// Results are memoized in-memory for 10 minutes: as-you-type queries repeat a
// lot, and every cache hit is a request saved on the search quota.

export interface UserSearchHit {
  login: string;
  name: string | null;
  avatarUrl: string | null;
}

const SEARCH_URL = "https://api.github.com/search/users";
const REQUEST_TIMEOUT_MS = 8_000;
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 200;
const MAX_HITS = 6;

const cache = new Map<string, { at: number; hits: UserSearchHit[] }>();

function pruneCache(now: number): void {
  if (cache.size <= CACHE_MAX) return;
  for (const [k, v] of cache) if (now - v.at > CACHE_TTL_MS) cache.delete(k);
}

// Best-effort by design: any failure (network, rate limit, malformed body)
// degrades to "no suggestions" — search is a nicety, never a blocker.
export async function searchUsers(rawQuery: string): Promise<UserSearchHit[]> {
  const q = rawQuery.trim();
  if (q.length < 2) return [];
  const key = q.toLowerCase();

  const memo = cache.get(key);
  if (memo && Date.now() - memo.at <= CACHE_TTL_MS) return memo.hits;
  pruneCache(Date.now());

  const pool = tokenPool();
  if (!pool.length) return [];

  // type:user keeps orgs out — only people have a scoutable GraphQL `user`.
  const url = `${SEARCH_URL}?q=${encodeURIComponent(`${q} type:user`)}&per_page=${MAX_HITS}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${pool[0].token}`,
        Accept: "application/vnd.github+json",
      },
      signal: ctrl.signal,
    });
    if (!res.ok) return []; // 403/422 (search quota) or 5xx — no suggestions
    const body = (await res.json()) as {
      items?: { login?: string; name?: string | null; avatar_url?: string | null }[];
    };
    const hits = (body.items ?? [])
      .filter((i) => typeof i.login === "string" && i.login.length > 0)
      .map((i) => ({
        login: i.login as string,
        name: i.name ?? null,
        avatarUrl: i.avatar_url ?? null,
      }));
    cache.set(key, { at: Date.now(), hits });
    return hits;
  } catch {
    return []; // network / timeout — same graceful degradation
  } finally {
    clearTimeout(timer);
  }
}
