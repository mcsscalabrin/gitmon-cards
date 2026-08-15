import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_ACTIONS } from "@/lib/ygo/engine";
import { POST, parseYgoRequest } from "@/app/api/ygo/route";
import { newYgoId, saveYgo } from "@/lib/ygo/store";

vi.mock("@/lib/ygo/store", () => ({ newYgoId: vi.fn(), saveYgo: vi.fn() }));

const mockedNewYgoId = vi.mocked(newYgoId);
const mockedSaveYgo = vi.mocked(saveYgo);

/** 200 passes bastam para o duelo terminar (deckout ou knockout). */
const passes = Array.from({ length: 200 }, () => ({ kind: "pass" as const }));

function post(body: unknown): Promise<Response> {
  return POST(new Request("http://localhost/api/ygo", {
    method: "POST",
    body: JSON.stringify(body),
  }));
}

const validBody = { a: "você", b: "oponente", seed: 7, actions: passes };

beforeEach(() => {
  mockedNewYgoId.mockReturnValue("bb".repeat(8));
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("parseYgoRequest", () => {
  it("aceita corpo válido", () => {
    expect(parseYgoRequest(validBody)).toEqual(validBody);
  });

  it("rejeita corpo não-objeto", () => {
    expect(parseYgoRequest(null)).toBeNull();
    expect(parseYgoRequest("oi")).toBeNull();
  });

  it("rejeita rótulo vazio", () => {
    const base = { b: "oponente", actions: passes };
    expect(parseYgoRequest({ ...base, a: "" })).toBeNull();
  });

  it("rejeita semente fora do intervalo de uint32 ou fracionária", () => {
    const base = { a: "você", b: "oponente", actions: passes };
    expect(parseYgoRequest({ ...base, seed: -1 })).toBeNull();
    expect(parseYgoRequest({ ...base, seed: 0x100000000 })).toBeNull();
    expect(parseYgoRequest({ ...base, seed: 1.5 })).toBeNull();
    expect(parseYgoRequest({ ...base, seed: "7" })).toBeNull();
  });

  it("rejeita lista de ações vazia ou acima do teto", () => {
    const base = { a: "você", b: "oponente", seed: 7 };
    expect(parseYgoRequest({ ...base, actions: [] })).toBeNull();
    expect(
      parseYgoRequest({ ...base, actions: Array.from({ length: MAX_ACTIONS + 1 }, () => ({ kind: "pass" })) }),
    ).toBeNull();
  });

  it("rejeita ação com forma estranha", () => {
    const base = { a: "você", b: "oponente", seed: 7, actions: [{ kind: "pass" }] };
    expect(parseYgoRequest({ ...base, actions: [{ kind: "posição" }] })).toBeNull();
    expect(parseYgoRequest({ ...base, actions: [{ kind: "summon", handIndex: -1, position: "attack" }] })).toBeNull();
    expect(parseYgoRequest({ ...base, actions: [{ kind: "summon", handIndex: 0, position: "lado" }] })).toBeNull();
    expect(parseYgoRequest({ ...base, actions: [{ kind: "trap", zone: "0" }] })).toBeNull();
    expect(parseYgoRequest({ ...base, actions: [{ kind: "attack", zone: 0 }] })).toBeNull();
  });
});

describe("POST /api/ygo", () => {
  it("re-executa o motor, salva o resultado autoritativo e devolve o id", async () => {
    const res = await post(validBody);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ id: "bb".repeat(8) });

    expect(mockedSaveYgo).toHaveBeenCalledTimes(1);
    const saved = mockedSaveYgo.mock.calls[0][0];
    expect(saved.id).toBe("bb".repeat(8));
    expect(saved.seed).toBe(7);
    expect(saved.players).toEqual({ a: "você", b: "oponente" });
    expect(saved.a).toHaveLength(20);
    expect(saved.b).toHaveLength(20);
    expect(saved.decidedBy).not.toBeUndefined();
    expect(saved.log.length).toBeGreaterThan(0);
  });

  it("body que não é JSON devolve 400", async () => {
    const res = await POST(new Request("http://localhost/api/ygo", {
      method: "POST",
      body: "não é json",
    }));
    expect(res.status).toBe(400);
  });

  it("corpo com forma inválida devolve 400 sem salvar", async () => {
    const res = await post({ ...validBody, actions: [] });
    expect(res.status).toBe(400);
    expect(mockedSaveYgo).not.toHaveBeenCalled();
  });

  it("ação ilegal recusada pelo motor devolve 400 sem salvar", async () => {
    const res = await post({ ...validBody, actions: [{ kind: "directAttack", zone: 0 }] });
    expect(res.status).toBe(400);
    expect(mockedSaveYgo).not.toHaveBeenCalled();
  });

  it("lista curta demais para o duelo terminar devolve 400", async () => {
    const res = await post({ ...validBody, actions: [{ kind: "pass" }] });
    expect(res.status).toBe(400);
    expect(mockedSaveYgo).not.toHaveBeenCalled();
  });

  it("falha ao persistir devolve 500", async () => {
    mockedSaveYgo.mockRejectedValue(new Error("redis fora do ar"));
    const res = await post(validBody);
    expect(res.status).toBe(500);
  });
});
