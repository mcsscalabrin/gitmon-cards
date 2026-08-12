import { getRedisClient } from "../cache/redis";
import type { Card } from "./types";

/**
 * Número de série sequencial por carta.
 *
 * Este módulo é o oposto do `lib/cache/redis.ts` em intenção. Lá, perder um dado
 * custa uma chamada a mais à API do GitHub e ninguém percebe. Aqui, perder um
 * dado significa que uma carta já compartilhada dentro do README de outra pessoa
 * passa a exibir outro número — e um colecionável cujo número muda não é um
 * colecionável. Por isso nada aqui expira e nada aqui usa o fallback em memória.
 *
 * **Sem `REDIS_URL` não há serial.** O fallback do módulo de cache é um `Map` por
 * processo; em serverless cada instância teria seu próprio contador e o mesmo
 * usuário sairia com números diferentes conforme a instância que atendeu. Isso é
 * pior que não numerar, então a ausência de store devolve `null` e a carta é
 * renderizada sem número.
 */

const COUNTER_KEY = "serial:v1:counter";
const cardKey = (id: string) => `serial:v1:card:${id}`;

/**
 * Atribuição atômica.
 *
 * Duas requisições simultâneas para o mesmo usuário novo precisam receber o
 * mesmo número, e dois usuários diferentes nunca podem receber o mesmo. Um
 * `GET` seguido de `INCR` do lado do Node não garante nenhuma das duas coisas:
 * as duas requisições leriam vazio e incrementariam. O script roda inteiro
 * dentro do Redis, então a janela não existe.
 */
const ASSIGN = `
local existing = redis.call('GET', KEYS[1])
if existing then
  return existing
end
local next = redis.call('INCR', KEYS[2])
redis.call('SET', KEYS[1], next)
return next
`;

/**
 * Devolve o serial da carta, atribuindo um novo na primeira vez que ela é
 * gerada. `null` quando não há store durável ou quando ele falhou — nunca um
 * número inventado localmente.
 */
export async function serialFor(id: string): Promise<number | null> {
  const redis = await getRedisClient();
  if (!redis) return null;

  try {
    const result = await redis.eval(ASSIGN, 2, cardKey(id), COUNTER_KEY);
    const value = Number(result);
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  } catch (error) {
    // Store fora do ar: a carta sai sem número. Preferível a arriscar um número
    // que contradiga o que já foi embutido no README de alguém.
    console.error("[serial] atribuição falhou:", error);
    return null;
  }
}

/**
 * Anexa o serial a uma carta recém-construída.
 *
 * Chamado **fora** do cache de dados (`lib/cards/index.ts`): o serial pertence à
 * identidade da carta, não ao retrato dos dados do GitHub. Se ficasse dentro,
 * uma carta gerada enquanto o store estava fora do ar guardaria `null` por uma
 * hora inteira, mesmo depois de o store voltar.
 */
export async function withSerial(card: Card): Promise<Card> {
  return { ...card, serial: await serialFor(card.id) };
}

/** Lê sem atribuir. Para quem quer saber se a carta já foi gerada antes. */
export async function peekSerial(id: string): Promise<number | null> {
  const redis = await getRedisClient();
  if (!redis) return null;

  try {
    const hit = await redis.get(cardKey(id));
    if (hit === null) return null;
    const value = Number(hit);
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  } catch (error) {
    console.error("[serial] leitura falhou:", error);
    return null;
  }
}
