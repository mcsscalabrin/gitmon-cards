import { randomBytes } from "node:crypto";
import { get, put } from "../cache/redis";
import { DUEL_TTL_SECONDS } from "../config";
import type { DuelResult } from "./types";

/**
 * Mesma política do battle-id (RFC 7.3): um resultado de duelo é imutável depois
 * de arbitrado, então recebe identidade própria e é guardado inteiro — com as
 * duas cartas embutidas e a lista de ações do jogador. Reabrir o link daqui a um
 * mês precisa mostrar exatamente aquele duelo, não uma re-execução com estrelas
 * atualizadas.
 */

const KEY = (id: string) => `duel:v1:${id}`;

/** 16 caracteres hex: colável, curto e sem colisão prática. */
export function newDuelId(): string {
  return randomBytes(8).toString("hex");
}

const ID = /^[0-9a-f]{16}$/;

export function isValidDuelId(id: string): boolean {
  return ID.test(id);
}

export async function saveDuel(result: DuelResult): Promise<void> {
  await put(KEY(result.id), result, DUEL_TTL_SECONDS);
}

export async function loadDuel(id: string): Promise<DuelResult | null> {
  if (!isValidDuelId(id)) return null;
  return get<DuelResult>(KEY(id));
}
