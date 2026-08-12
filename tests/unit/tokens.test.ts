import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Prende as decisões do pool de tokens: parsing de env (GITHUB_TOKENS vence
// GITHUB_TOKEN), hash-sharding determinístico e uniforme, registros de saúde e
// bench a partir dos headers de rate limit, e failover escolhendo o token mais
// saudável que não esteja de castigo. Tudo com tokens fake e um Redis em
// memória — nenhuma credencial real em lugar nenhum.

const store = new Map<string, string>();
vi.mock("@/lib/cache/redis", () => ({
  getRedisClient: async () => ({
    get: async (k: string) => store.get(k) ?? null,
    set: async (k: string, v: string) => {
      store.set(k, v);
    },
  }),
}));

import {
  benchToken,
  hashLogin,
  pickFailover,
  pickToken,
  recordTokenHealth,
  tokenPool,
} from "@/lib/github/tokens";

const key = (idx: number) => `gitmon:ghtoken:v1:${idx}`;
const nowSec = () => Math.floor(Date.now() / 1000);
const seed = (idx: number, remaining: number, reset: number) =>
  store.set(key(idx), JSON.stringify({ remaining, reset }));

beforeEach(() => {
  store.clear();
  vi.stubEnv("GITHUB_TOKENS", "tokA, tokB,tokC ,tokD");
  vi.stubEnv("GITHUB_TOKEN", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("tokenPool", () => {
  it("faz o parsing de GITHUB_TOKENS com trim, indexados em ordem", () => {
    expect(tokenPool()).toEqual([
      { token: "tokA", idx: 0 },
      { token: "tokB", idx: 1 },
      { token: "tokC", idx: 2 },
      { token: "tokD", idx: 3 },
    ]);
  });

  it("cai para GITHUB_TOKEN como um pool de um", () => {
    vi.stubEnv("GITHUB_TOKENS", "");
    vi.stubEnv("GITHUB_TOKEN", "solo");
    expect(tokenPool()).toEqual([{ token: "solo", idx: 0 }]);
  });

  it("prefere GITHUB_TOKENS quando os dois estão setados", () => {
    vi.stubEnv("GITHUB_TOKEN", "solo");
    expect(tokenPool()).toHaveLength(4);
  });

  it("é vazio quando nenhum env de token está setado", () => {
    vi.stubEnv("GITHUB_TOKENS", "");
    vi.stubEnv("GITHUB_TOKEN", "");
    expect(tokenPool()).toEqual([]);
  });
});

describe("pickToken (hash-shard)", () => {
  it("é determinístico e insensível a caixa", () => {
    expect(pickToken("Torvalds")).toEqual(pickToken("torvalds"));
    expect(pickToken("torvalds")).toEqual(pickToken("torvalds"));
  });

  it("espalha logins distintos por todo o pool", () => {
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 400; i++) counts[hashLogin(`user-${i}`) % 4]++;
    // Uniforme, não perfeito: todo token recebe uma fatia relevante (≥10%).
    for (const c of counts) expect(c).toBeGreaterThanOrEqual(40);
  });

  it("devolve null para um pool vazio", () => {
    expect(pickToken("torvalds", [])).toBeNull();
  });
});

describe("recordTokenHealth / benchToken", () => {
  it("guarda remaining/reset parseado dos headers de rate limit", async () => {
    const reset = nowSec() + 1800;
    await recordTokenHealth(
      2,
      new Headers({ "x-ratelimit-remaining": "3210", "x-ratelimit-reset": String(reset) }),
    );
    expect(JSON.parse(store.get(key(2))!)).toEqual({ remaining: 3210, reset });
  });

  it("não escreve nada quando os headers estão ausentes", async () => {
    await recordTokenHealth(2, new Headers());
    expect(store.size).toBe(0);
  });

  it("põe de castigo com zero restante até pelo menos o horizonte do Retry-After", async () => {
    await benchToken(1, new Headers({ "retry-after": "300" }));
    const h = JSON.parse(store.get(key(1))!);
    expect(h.remaining).toBe(0);
    expect(h.reset).toBeGreaterThanOrEqual(nowSec() + 299);
  });

  it("põe de castigo com horizonte de segurança quando nenhum header é utilizável", async () => {
    await benchToken(1, new Headers());
    const h = JSON.parse(store.get(key(1))!);
    expect(h.remaining).toBe(0);
    expect(h.reset).toBeGreaterThanOrEqual(nowSec() + 119);
  });
});

describe("pickFailover", () => {
  it("nunca devolve o token excluído", async () => {
    for (let exclude = 0; exclude < 4; exclude++) {
      const picked = await pickFailover(exclude);
      expect(picked).not.toBeNull();
      expect(picked!.idx).not.toBe(exclude);
    }
  });

  it("trata saúde desconhecida como token fresco (Redis vazio ainda falha over)", async () => {
    const picked = await pickFailover(0);
    expect(picked).toEqual({ token: "tokB", idx: 1 });
  });

  it("escolhe o candidato mais saudável pela quota restante", async () => {
    const reset = nowSec() + 1800;
    seed(1, 1000, reset);
    seed(2, 3000, reset);
    seed(3, 500, reset);
    expect((await pickFailover(0))!.idx).toBe(2);
  });

  it("pula tokens de castigo (abaixo da folga, reset ainda à frente)", async () => {
    const reset = nowSec() + 1800;
    seed(1, 0, reset);
    seed(2, 150, reset); // abaixo da folga de 200 pontos -> castigo
    seed(3, 900, reset);
    expect((await pickFailover(0))!.idx).toBe(3);
  });

  it("trata token de castigo cuja janela já passou como recarregado", async () => {
    seed(1, 0, nowSec() - 10); // janela terminou -> fresco de novo
    seed(2, 3000, nowSec() + 1800);
    seed(3, 0, nowSec() + 1800);
    expect((await pickFailover(0))!.idx).toBe(1);
  });

  it("devolve null quando todo outro token está de castigo", async () => {
    const reset = nowSec() + 1800;
    seed(1, 0, reset);
    seed(2, 10, reset);
    seed(3, 0, reset);
    expect(await pickFailover(0)).toBeNull();
  });

  it("devolve null num pool de um token", async () => {
    vi.stubEnv("GITHUB_TOKENS", "");
    vi.stubEnv("GITHUB_TOKEN", "solo");
    expect(await pickFailover(0)).toBeNull();
  });
});