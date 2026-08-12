import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Estes testes prendem as peças puras e independentes de requisição do
// lib/rateLimit: extração de IP e a janela fixa em memória. O caminho Redis é
// um INCR+EXPIRE fino, e o checkCardRateLimit em si precisa de um escopo de
// requisição do Next para valer a pena testar — então é a aritmética da janela
// que fica presa aqui.
//
// O módulo importa next/headers, que o vitest não consegue resolver; o alias
// aponta para algo inerte para o módulo carregar.
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

import {
  ALLOWED_PER_WINDOW,
  allowFromMemory,
  clientIp,
  WINDOW_SECONDS,
} from "@/lib/rateLimit";

describe("clientIp", () => {
  it("pega o primeiro hop de x-forwarded-for", () => {
    const h = new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" });
    expect(clientIp(h)).toBe("203.0.113.9");
  });

  it("cai para x-real-ip quando x-forwarded-for está ausente", () => {
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
  });

  it("prefere x-forwarded-for sobre x-real-ip quando ambos estão presentes", () => {
    const h = new Headers({ "x-forwarded-for": "203.0.113.9", "x-real-ip": "198.51.100.4" });
    expect(clientIp(h)).toBe("203.0.113.9");
  });

  it("cai para 'unknown' sem headers de proxy", () => {
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("allowFromMemory — janela fixa", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000); // época fixa — a aritmética da janela é determinística
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("permite até o limite, depois bloqueia com Retry-After", () => {
    for (let i = 0; i < ALLOWED_PER_WINDOW; i++) {
      expect(allowFromMemory("limit-ip")).toEqual({ allowed: true, retryAfterSeconds: 0 });
    }
    const blocked = allowFromMemory("limit-ip");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(WINDOW_SECONDS);
  });

  it("conta IPs de forma independente", () => {
    for (let i = 0; i < ALLOWED_PER_WINDOW; i++) allowFromMemory("a");
    expect(allowFromMemory("a").allowed).toBe(false);
    expect(allowFromMemory("b").allowed).toBe(true);
  });

  it("reseta depois que a janela vira", () => {
    for (let i = 0; i < ALLOWED_PER_WINDOW; i++) allowFromMemory("reset-ip");
    expect(allowFromMemory("reset-ip").allowed).toBe(false);

    vi.setSystemTime(1_700_000_000_000 + (WINDOW_SECONDS + 1) * 1000);
    expect(allowFromMemory("reset-ip").allowed).toBe(true);
  });
});