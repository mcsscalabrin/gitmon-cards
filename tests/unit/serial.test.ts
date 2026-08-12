import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRedisClient } from "@/lib/cache/redis";
import { peekSerial, serialFor, withSerial } from "@/lib/cards/serial";
import type { Card } from "@/lib/cards/types";

vi.mock("@/lib/cache/redis", () => ({ getRedisClient: vi.fn() }));

const mocked = vi.mocked(getRedisClient);

/**
 * Cliente mínimo com só o que o `serial.ts` usa.
 *
 * Usa `in` em vez de `??` para distinguir "não passei" de "passei null" — o
 * segundo é justamente um dos casos inválidos que precisam ser cobertos.
 */
function client(overrides: { eval?: unknown; get?: unknown } = {}) {
  return {
    eval: vi.fn().mockResolvedValue("eval" in overrides ? overrides.eval : 1),
    get: vi.fn().mockResolvedValue("get" in overrides ? overrides.get : null),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

/*
 * O que estes testes NÃO cobrem: a atomicidade do script Lua. Isso depende do
 * Redis executar o script inteiro sem intercalar outro comando, e só um Redis de
 * verdade prova. Ver `docs/gaps-revalidacao.md`, item 2.1.
 */
describe("serialFor", () => {
  it("devolve null quando não há store durável", async () => {
    mocked.mockResolvedValue(null);
    expect(await serialFor("torvalds")).toBeNull();
  });

  it("devolve o número atribuído pelo script", async () => {
    const redis = client({ eval: 42 });
    mocked.mockResolvedValue(redis as never);
    expect(await serialFor("torvalds")).toBe(42);
  });

  it("aceita o retorno como string, que é o que o Redis devolve de um GET", async () => {
    mocked.mockResolvedValue(client({ eval: "42" }) as never);
    expect(await serialFor("torvalds")).toBe(42);
  });

  it("passa as duas chaves na ordem que o script espera", async () => {
    const redis = client({ eval: 1 });
    mocked.mockResolvedValue(redis as never);
    await serialFor("facebook/react");

    const [script, keyCount, cardKey, counterKey] = redis.eval.mock.calls[0];
    expect(String(script)).toContain("INCR");
    expect(keyCount).toBe(2);
    // KEYS[1] é a carta e KEYS[2] o contador — trocar a ordem faria o contador
    // virar o serial de uma carta chamada "serial:v1:counter".
    expect(cardKey).toBe("serial:v1:card:facebook/react");
    expect(counterKey).toBe("serial:v1:counter");
  });

  /*
   * A postura do módulo: nunca inventar número. Qualquer resposta que não seja
   * um inteiro positivo vira ausência de serial, não um valor plausível.
   */
  it.each([[0], [-3], [Number.NaN], ["abc"], [null]])(
    "devolve null para retorno inválido (%s)",
    async (value) => {
      mocked.mockResolvedValue(client({ eval: value }) as never);
      expect(await serialFor("torvalds")).toBeNull();
    },
  );

  it("devolve null quando o store falha, em vez de propagar o erro", async () => {
    const redis = client();
    redis.eval.mockRejectedValue(new Error("connection reset"));
    mocked.mockResolvedValue(redis as never);
    expect(await serialFor("torvalds")).toBeNull();
  });
});

describe("peekSerial", () => {
  it("lê sem atribuir", async () => {
    const redis = client({ get: "12" });
    mocked.mockResolvedValue(redis as never);

    expect(await peekSerial("torvalds")).toBe(12);
    expect(redis.get).toHaveBeenCalledWith("serial:v1:card:torvalds");
    expect(redis.eval).not.toHaveBeenCalled();
  });

  it("devolve null para carta ainda não gerada", async () => {
    mocked.mockResolvedValue(client({ get: null }) as never);
    expect(await peekSerial("ninguem")).toBeNull();
  });

  it("devolve null quando a leitura falha", async () => {
    const redis = client();
    redis.get.mockRejectedValue(new Error("timeout"));
    mocked.mockResolvedValue(redis as never);
    expect(await peekSerial("torvalds")).toBeNull();
  });
});

describe("withSerial", () => {
  const card = { id: "torvalds", serial: null } as Card;

  it("anexa o serial sem mutar a carta original", async () => {
    mocked.mockResolvedValue(client({ eval: 7 }) as never);

    const result = await withSerial(card);
    expect(result.serial).toBe(7);
    expect(card.serial).toBeNull();
  });

  it("mantém serial null quando não há store", async () => {
    mocked.mockResolvedValue(null);
    expect((await withSerial(card)).serial).toBeNull();
  });
});
