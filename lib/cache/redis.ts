import type Redis from "ioredis";

/**
 * Cache dos dados da API do GitHub — nunca da imagem. A imagem é resolvida por
 * `Cache-Control` na CDN (RFC 4.2). Aqui é obrigatório, não otimização: sem ele
 * um pico de tráfego esgota o rate limit do token (RFC 11).
 */

/**
 * Estado pendurado no `globalThis`.
 *
 * Em desenvolvimento o Next recompila e reavalia módulos por bundle de rota: um
 * `Map` no escopo do módulo dá uma instância para a página e outra para a rota de
 * imagem. O sintoma é específico e confuso — a batalha é criada pela página e o
 * pôster responde 404, porque cada lado tem seu próprio cache. Pendurar no
 * `globalThis` deixa o estado realmente por processo. Também evita abrir uma
 * conexão Redis nova a cada hot reload.
 */
const store = globalThis as typeof globalThis & {
  __gitmonCache?: {
    client: Redis | null;
    clientPromise: Promise<Redis | null> | null;
    memory: Map<string, { value: string; expiresAt: number }>;
  };
};

store.__gitmonCache ??= { client: null, clientPromise: null, memory: new Map() };
const state = store.__gitmonCache;
const memory = state.memory;

/**
 * Cliente cru, para quem precisa de operação atômica em vez de get/set com TTL.
 *
 * Único consumidor hoje: `lib/cards/serial.ts`, que grava chave sem expiração —
 * algo que o `write()` daqui não sabe fazer e deliberadamente não deve aprender,
 * porque tudo neste módulo é cache descartável. Quem usa isto assume a
 * responsabilidade que o resto do arquivo abre mão: durabilidade.
 */
export async function getRedisClient(): Promise<Redis | null> {
  return getClient();
}

async function getClient(): Promise<Redis | null> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;
  if (state.client) return state.client;

  state.clientPromise ??= (async () => {
    const { default: RedisCtor } = await import("ioredis");
    const instance = new RedisCtor(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      // Uma função serverless não pode ficar presa esperando um Redis caído.
      connectTimeout: 3000,
    });
    instance.on("error", (error) => {
      console.error("[cache] redis error:", error.message);
    });
    try {
      await instance.connect();
      state.client = instance;
      return instance;
    } catch (error) {
      console.error("[cache] conexão falhou, seguindo sem cache:", error);
      state.clientPromise = null;
      return null;
    }
  })();

  return state.clientPromise;
}

async function read(key: string): Promise<string | null> {
  const redis = await getClient();
  if (redis) {
    try {
      return await redis.get(key);
    } catch (error) {
      console.error("[cache] leitura falhou:", error);
      return null;
    }
  }

  const hit = memory.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    memory.delete(key);
    return null;
  }
  return hit.value;
}

async function write(key: string, value: string, ttlSeconds: number): Promise<void> {
  const redis = await getClient();
  if (redis) {
    try {
      await redis.set(key, value, "EX", ttlSeconds);
    } catch (error) {
      console.error("[cache] escrita falhou:", error);
    }
    return;
  }

  memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

/**
 * Lê do cache ou produz e grava. Erro do cache nunca derruba a requisição — na
 * pior das hipóteses vira uma chamada a mais à API do GitHub.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  produce: () => Promise<T>,
): Promise<T> {
  const hit = await read(key);
  if (hit !== null) {
    try {
      return JSON.parse(hit) as T;
    } catch {
      // Valor corrompido ou de um formato antigo: ignora e recalcula.
    }
  }

  const value = await produce();
  await write(key, JSON.stringify(value), ttlSeconds);
  return value;
}

/** Grava sem ler antes. Usado pelo resultado de batalha, que nasce novo (RFC 7.3). */
export async function put(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  await write(key, JSON.stringify(value), ttlSeconds);
}

export async function get<T>(key: string): Promise<T | null> {
  const hit = await read(key);
  if (hit === null) return null;
  try {
    return JSON.parse(hit) as T;
  } catch {
    return null;
  }
}
