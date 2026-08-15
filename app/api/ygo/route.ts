import { NextResponse } from "next/server";
import { MAX_ACTIONS, playDuel } from "@/lib/ygo/engine";
import { newYgoId, saveYgo } from "@/lib/ygo/store";
import type { YgoAction } from "@/lib/ygo/types";

export const runtime = "nodejs";

const POSITIONS = new Set(["attack", "defense", "face-down"]);

/**
 * O servidor é o juiz do Speed Duel (ver engine.ts). O elenco é curado e fixo
 * (`lib/ygo/roster.ts`) — não há nada a buscar no GitHub — então o client manda
 * só a semente e a lista de ações do visitante (lado A); o lado B é a IA do
 * motor, re-executada na mesma ordem de sorteios. O servidor valida cada ação
 * contra as regras, resolve o duelo inteiro e só então persiste o resultado.
 * Nada aqui confia no client além das ações, e mesmo elas são checadas.
 */
export interface YgoRequestBody {
  a: string;
  b: string;
  seed: number;
  actions: YgoAction[];
}

function isInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isAction(value: unknown): value is YgoAction {
  if (typeof value !== "object" || value === null) return false;
  const { kind } = value as { kind?: unknown };
  switch (kind) {
    case "pass":
      return true;
    case "summon": {
      const { handIndex, position } = value as { handIndex?: unknown; position?: unknown };
      return isInt(handIndex) && typeof position === "string" && POSITIONS.has(position);
    }
    case "spell":
    case "setTrap":
      return isInt((value as { handIndex?: unknown }).handIndex);
    case "trap":
    case "flip":
      return isInt((value as { zone?: unknown }).zone);
    case "attack": {
      const { zone, targetZone } = value as { zone?: unknown; targetZone?: unknown };
      return isInt(zone) && isInt(targetZone);
    }
    case "directAttack":
      return isInt((value as { zone?: unknown }).zone);
    default:
      return false;
  }
}

/** Validação de forma do corpo. A validade de sequência é do `playDuel`. */
export function parseYgoRequest(raw: unknown): YgoRequestBody | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { a, b, seed, actions } = raw as Record<string, unknown>;
  if (typeof a !== "string" || typeof b !== "string" || a.length === 0 || b.length === 0) {
    return null;
  }
  if (
    typeof seed !== "number" ||
    !Number.isSafeInteger(seed) ||
    seed < 0 ||
    seed > 0xffffffff
  ) {
    return null;
  }
  if (!Array.isArray(actions) || actions.length === 0 || actions.length > MAX_ACTIONS) {
    return null;
  }
  if (!actions.every(isAction)) return null;
  return { a, b, seed, actions: actions as YgoAction[] };
}

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "corpo inválido" }, { status: 400 });
  }

  const parsed = parseYgoRequest(raw);
  if (!parsed) {
    return NextResponse.json({ error: "pedido inválido" }, { status: 400 });
  }

  try {
    const id = newYgoId();
    const result = playDuel(parsed.seed, parsed.actions, id, { a: parsed.a, b: parsed.b });
    await saveYgo(result);
    return NextResponse.json({ id });
  } catch (error) {
    // Ações ilegais, fora de sequência ou lista curta demais: o client tentou
    // arbitrar um duelo que o motor não reconhece.
    if (error instanceof Error && /^(a ação|ação ilegal)/.test(error.message)) {
      return NextResponse.json({ error: "ação ilegal" }, { status: 400 });
    }
    return NextResponse.json({ error: "erro interno" }, { status: 500 });
  }
}
