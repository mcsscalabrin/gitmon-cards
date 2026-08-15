import { randomBytes } from "node:crypto";
import { get, put } from "../cache/redis";
import { YGO_TTL_SECONDS } from "../config";
import type { YgoResult } from "./types";

/**
 * Mesma política do duel-id (RFC 7.3): um resultado de Speed Duel é imutável
 * depois de arbitrado, então recebe identidade própria e é guardado inteiro —
 * com os dois decks embutidos e o log completo. Reabrir o link daqui a um mês
 * precisa mostrar exatamente aquele duelo.
 */

const KEY = (id: string) => `ygo:v1:${id}`;

/** 16 caracteres hex: colável, curto e sem colisão prática. */
export function newYgoId(): string {
  return randomBytes(8).toString("hex");
}

const ID = /^[0-9a-f]{16}$/;

export function isValidYgoId(id: string): boolean {
  return ID.test(id);
}

export async function saveYgo(result: YgoResult): Promise<void> {
  await put(KEY(result.id), result, YGO_TTL_SECONDS);
}

export async function loadYgo(id: string): Promise<YgoResult | null> {
  if (!isValidYgoId(id)) return null;
  return get<YgoResult>(KEY(id));
}
