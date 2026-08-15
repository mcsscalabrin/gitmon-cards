import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AXES, type Axis, type AxisRating } from "@/lib/cards/ratings";
import type { Card } from "@/lib/cards/types";
import { GitmonError } from "@/lib/github/errors";
import { MAX_TURNS } from "@/lib/duel/engine";
import { POST, parseDuelRequest } from "@/app/api/duel/route";
import { getProfileCard } from "@/lib/cards";
import { newDuelId, saveDuel } from "@/lib/duel/store";

vi.mock("@/lib/cards", () => ({ getProfileCard: vi.fn() }));
vi.mock("@/lib/duel/store", () => ({ newDuelId: vi.fn(), saveDuel: vi.fn() }));

const mockedGetCard = vi.mocked(getProfileCard);
const mockedSaveDuel = vi.mocked(saveDuel);

function ratings(values: Partial<Record<Axis, number>>): AxisRating[] {
  return AXES.map((axis) => ({ axis, value: values[axis] ?? 50, raw: 0 }));
}

function card(overrides: Partial<Card> = {}): Card {
  return {
    kind: "profile",
    id: "dev",
    name: "dev",
    element: "normal",
    hp: 100,
    attacks: [{ name: "golpe", cost: 1, damage: 30, text: "" }],
    weakness: null,
    resistance: null,
    retreat: 1,
    rarity: "common",
    axis: "reach",
    serial: null,
    artUrl: "",
    footer: "",
    stats: [],
    sourceUrl: "",
    ratings: ratings({}),
    ...overrides,
  };
}

/** Perfil padrão de ambos os lados: os 10 passes levam o duelo ao teto de turnos. */
const playerCard = card({ id: "player", ratings: ratings({ reach: 50, volume: 50 }) });

function post(body: unknown): Promise<Response> {
  return POST(new Request("http://localhost/api/duel", {
    method: "POST",
    body: JSON.stringify(body),
  }));
}

const passes = Array.from({ length: 10 }, () => ({ kind: "pass" as const }));

beforeEach(() => {
  vi.mocked(newDuelId).mockReturnValue("aa".repeat(8));
  mockedGetCard.mockResolvedValue(playerCard);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("parseDuelRequest", () => {
  it("aceita corpo válido", () => {
    expect(parseDuelRequest({ a: "foo", b: "bar", seed: 7, actions: passes })).toEqual({
      a: "foo",
      b: "bar",
      seed: 7,
      actions: passes,
    });
  });

  it("rejeita corpo não-objeto", () => {
    expect(parseDuelRequest(null)).toBeNull();
    expect(parseDuelRequest("oi")).toBeNull();
  });

  it("rejeita perfil vazio", () => {
    expect(parseDuelRequest({ a: "", b: "bar", seed: 7, actions: passes })).toBeNull();
  });

  it("rejeita semente fora do intervalo de uint32 ou fracionária", () => {
    const base = { a: "foo", b: "bar", actions: passes };
    expect(parseDuelRequest({ ...base, seed: -1 })).toBeNull();
    expect(parseDuelRequest({ ...base, seed: 0x100000000 })).toBeNull();
    expect(parseDuelRequest({ ...base, seed: 1.5 })).toBeNull();
    expect(parseDuelRequest({ ...base, seed: "7" })).toBeNull();
  });

  it("rejeita lista de ações vazia ou acima do teto", () => {
    const base = { a: "foo", b: "bar", seed: 7 };
    expect(parseDuelRequest({ ...base, actions: [] })).toBeNull();
    expect(
      parseDuelRequest({ ...base, actions: Array.from({ length: MAX_TURNS + 1 }, () => ({ kind: "pass" })) }),
    ).toBeNull();
  });

  it("rejeita ação com forma estranha", () => {
    const base = { a: "foo", b: "bar", seed: 7, actions: [{ kind: "pass" }] };
    expect(parseDuelRequest({ ...base, actions: [{ kind: "posição" }] })).toBeNull();
    expect(parseDuelRequest({ ...base, actions: [{ kind: "attack", attackIndex: -1 }] })).toBeNull();
    expect(parseDuelRequest({ ...base, actions: [{ kind: "attack", attackIndex: "um" }] })).toBeNull();
    expect(parseDuelRequest({ ...base, actions: [{ kind: "position", to: "lado" }] })).toBeNull();
  });
});

describe("POST /api/duel", () => {
  it("re-executa o motor, salva o resultado autoritativo e devolve o id", async () => {
    const res = await post({ a: "foo", b: "bar", seed: 7, actions: passes });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ id: "aa".repeat(8) });

    expect(mockedGetCard).toHaveBeenCalledTimes(2);
    expect(mockedGetCard).toHaveBeenCalledWith("foo");
    expect(mockedGetCard).toHaveBeenCalledWith("bar");
    expect(mockedSaveDuel).toHaveBeenCalledTimes(1);
    const saved = mockedSaveDuel.mock.calls[0][0];
    expect(saved.id).toBe("aa".repeat(8));
    expect(saved.seed).toBe(7);
    expect(saved.turns).toHaveLength(MAX_TURNS);
  });

  it("body que não é JSON devolve 400", async () => {
    const res = await POST(new Request("http://localhost/api/duel", {
      method: "POST",
      body: "não é json",
    }));
    expect(res.status).toBe(400);
  });

  it("corpo com forma inválida devolve 400", async () => {
    const res = await post({ a: "foo", b: "bar", seed: 7, actions: [] });
    expect(res.status).toBe(400);
    expect(mockedSaveDuel).not.toHaveBeenCalled();
  });

  it("perfil inexistente no GitHub devolve 404 (GitmonError)", async () => {
    mockedGetCard.mockRejectedValue(new GitmonError("not_found", "não existe", "ghost"));
    const res = await post({ a: "ghost", b: "bar", seed: 7, actions: passes });
    expect(res.status).toBe(404);
  });

  it("ação ilegal recusada pelo motor devolve 400 sem salvar", async () => {
    mockedGetCard.mockResolvedValue(card({ id: "b", ratings: ratings({ reach: 0, volume: 0 }) }));
    const res = await post({
      a: "foo",
      b: "bar",
      seed: 0,
      // De ataque para ataque nunca é legal — pega o primeiro turno do visitante.
      actions: [{ kind: "position", to: "attack" }],
    });
    expect(res.status).toBe(400);
    expect(mockedSaveDuel).not.toHaveBeenCalled();
  });

  it("falha ao persistir devolve 500", async () => {
    mockedSaveDuel.mockRejectedValue(new Error("redis fora do ar"));
    const res = await post({ a: "foo", b: "bar", seed: 7, actions: passes });
    expect(res.status).toBe(500);
  });
});
