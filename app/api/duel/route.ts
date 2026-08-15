import { NextResponse } from "next/server";
import { getProfileCard } from "@/lib/cards";
import { playDuel, MAX_TURNS } from "@/lib/duel/engine";
import { newDuelId, saveDuel } from "@/lib/duel/store";
import type { DuelAction } from "@/lib/duel/types";
import { httpStatusFor, isGitmonError } from "@/lib/github/errors";

export const runtime = "nodejs";

const POSITIONS = new Set(["attack", "defense", "face-down"]);

/**
 * O servidor é o juiz do duelo (ver engine.ts). O client manda só o par de
 * perfis, a semente e a lista de ações do visitante; o servidor re-resolve as
 * cartas (a fonte da verdade é o GitHub, não o que o client disse), re-executa o
 * motor inteiro — IA recomputada na mesma ordem de sorteios — e só então persiste
 * o resultado. Nada aqui confia no client além das ações, e mesmo elas são
 * validadas contra as regras.
 */
export interface DuelRequestBody {
  a: string;
  b: string;
  seed: number;
  actions: DuelAction[];
}

function isAction(value: unknown): value is DuelAction {
  if (typeof value !== "object" || value === null) return false;
  const kind = (value as { kind?: unknown }).kind;
  if (kind === "pass") return true;
  if (kind === "attack") {
    const index = (value as { attackIndex?: unknown }).attackIndex;
    return (
      index === undefined ||
      (typeof index === "number" && Number.isInteger(index) && index >= 0)
    );
  }
  if (kind === "position") {
    const to = (value as { to?: unknown }).to;
    return typeof to === "string" && POSITIONS.has(to);
  }
  return false;
}

/** Validação de forma do corpo. A validade de sequência é do `playDuel`. */
export function parseDuelRequest(raw: unknown): DuelRequestBody | null {
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
  if (!Array.isArray(actions) || actions.length === 0 || actions.length > MAX_TURNS) {
    return null;
  }
  if (!actions.every(isAction)) return null;
  return { a, b, seed, actions: actions as DuelAction[] };
}

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "corpo inválido" }, { status: 400 });
  }

  const parsed = parseDuelRequest(raw);
  if (!parsed) {
    return NextResponse.json({ error: "pedido inválido" }, { status: 400 });
  }

  try {
    const [a, b] = await Promise.all([
      getProfileCard(parsed.a),
      getProfileCard(parsed.b),
    ]);

    const id = newDuelId();
    const result = playDuel(a, b, parsed.seed, parsed.actions, id);
    await saveDuel(result);

    return NextResponse.json({ id });
  } catch (error) {
    if (isGitmonError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: httpStatusFor(error.code) },
      );
    }
    // Ações ilegais ou fora de sequência (o motor lança "duelo: ..."): o client
    // tentou arbitrar um resultado que o motor não reconhece.
    if (error instanceof Error && error.message.startsWith("duelo:")) {
      return NextResponse.json({ error: "ação ilegal" }, { status: 400 });
    }
    return NextResponse.json({ error: "erro interno" }, { status: 500 });
  }
}
