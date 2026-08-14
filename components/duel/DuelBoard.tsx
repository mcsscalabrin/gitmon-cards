"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { TypeIcon } from "@/components/card/TypeIcon";
import type { Card } from "@/lib/cards/types";
import {
  aiChoose,
  applyAction,
  duelSession,
  legalActions,
  monsterStats,
  nextActor,
  STARTING_LP,
  startDuel,
  type DuelState,
} from "@/lib/duel/engine";
import type { DuelAction, Side } from "@/lib/duel/types";
import { narrationFor, positionLabel } from "@/lib/duel/narration";
import { translator, type Locale } from "@/lib/i18n/dictionaries";
import { SIDE_COLORS } from "@/lib/viz/series";

/**
 * O duelo dirigido. O client é o **controle** e roda o mesmo motor do servidor
 * (`lib/duel/engine`), na mesma semente e com o mesmo PRNG na mesma ordem — a
 * animação e o resultado salvo são o mesmo cálculo (ver engine.ts, "Dois
 * consumidores de aleatoriedade").
 *
 * Ao fim do jogo, manda as ações do visitante para `POST /api/duel`, que
 * re-executa tudo e persiste; aqui só redireciona para `/duel/<id>`.
 */

const AI_MS = 1000;

type Translator = ReturnType<typeof translator>;

export function DuelBoard({
  a,
  b,
  seed,
  locale,
}: {
  a: Card;
  b: Card;
  seed: number;
  locale: Locale;
}) {
  const t = translator(locale);
  const router = useRouter();

  const [post, setPost] = useState<"idle" | "saving" | "error">("idle");
  const [attempt, setAttempt] = useState(0);

  const actionsRef = useRef<DuelAction[]>([]);
  const postedRef = useRef(false);

  /*
   * O PRNG do duelo, numa instância só — mesma ordem de consumo do playDuel. A
   * sessão nasce com o componente (o starter consome o primeiro número do PRNG,
   * como o playDuel faz) e `session.random` é a mesma função no confronto
   * inteiro, porque `seed` é fixa na montagem.
   */
  const [session] = useState(() => duelSession(seed));
  const [state, setState] = useState<DuelState | null>(() =>
    startDuel(a, b, session.starter, seed),
  );

  // Vez da IA: escolhe com a mesma heurística do playDuel, consumindo o mesmo
  // PRNG na mesma ordem. O timer garante o passo da animação.
  useEffect(() => {
    if (!state || state.over || nextActor(state) !== "b") return;
    const timer = setTimeout(() => {
      const action = aiChoose(state, "b", session.random);
      const result = applyAction(state, "b", action);
      if (result.ok) setState(result.state);
    }, AI_MS);
    return () => clearTimeout(timer);
  }, [state, session]);

  const play = (action: DuelAction) => {
    if (!state || state.over || nextActor(state) !== "a") return;
    const result = applyAction(state, "a", action);
    if (!result.ok) return;
    actionsRef.current.push(action);
    setState(result.state);
  };

  // Fim do jogo: o servidor é o juiz. Manda as ações e redireciona para o
  // resultado estável em `/duel/<id>`.
  useEffect(() => {
    if (!state?.over || postedRef.current) return;
    postedRef.current = true;
    setPost("saving");
    fetch("/api/duel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ a: a.id, b: b.id, seed, actions: actionsRef.current }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`http ${res.status}`);
        const data = (await res.json()) as { id: string };
        router.replace(`/duel/${data.id}`);
      })
      .catch(() => {
        postedRef.current = false;
        setPost("error");
      });
  }, [state, a.id, b.id, seed, router, attempt]);

  const myTurn = state !== null && !state.over && nextActor(state) === "a";
  const legal = myTurn && state ? legalActions(state, "a") : [];

  const narration = useMemo(() => {
    if (!state || state.turns.length === 0) return "";
    return narrationFor(state.turns[state.turns.length - 1], a, b, t);
  }, [state, a, b, t]);

  const status = state
    ? state.over
      ? t("duel.saving")
      : myTurn
        ? t("duel.yourTurn")
        : t("duel.opponentTurn")
    : t("duel.opponentTurn");

  return (
    <div
      className="duel"
      style={{
        ["--side-a" as string]: SIDE_COLORS.a,
        ["--side-b" as string]: SIDE_COLORS.b,
      }}
    >
      <MonsterSlot side="b" card={b} state={state} t={t} />

      <div className="duel-stage">
        <p className="duel-narration" aria-live="polite">
          {narration}
        </p>
        <p className="duel-status">{status}</p>

        {myTurn ? <ActionPanel card={a} legal={legal} onAction={play} t={t} /> : null}

        {post === "error" ? (
          <p className="duel-saving" role="alert">
            {t("duel.saveError")}{" "}
            <button
              type="button"
              className="ghost-link"
              onClick={() => {
                postedRef.current = false;
                setPost("idle");
                setAttempt((n) => n + 1);
              }}
            >
              {t("error.retry")}
            </button>
          </p>
        ) : null}
      </div>

      <MonsterSlot side="a" card={a} state={state} t={t} />
    </div>
  );
}

function MonsterSlot({
  side,
  card,
  state,
  t,
}: {
  side: Side;
  card: Card;
  state: DuelState | null;
  t: Translator;
}) {
  const stats = monsterStats(card);
  const monster = state?.monsters[side];
  const lp = state ? state.lp[side] : STARTING_LP;
  const position = monster?.position ?? "attack";
  const destroyed = monster?.destroyed ?? false;
  const isTurn = state !== null && !state.over && nextActor(state) === side;

  return (
    <div
      className="duel-monster"
      data-side={side}
      data-destroyed={destroyed || undefined}
      data-turn={isTurn || undefined}
    >
      <div className="duel-monster-head">
        <strong>{card.name}</strong>
        <TypeIcon element={card.element} size={16} />
        <span className="duel-pos" data-pos={position}>
          {positionLabel(t, position)}
        </span>
      </div>

      {position === "face-down" && !destroyed ? (
        <div className="duel-card-back" role="img" aria-label={card.name} />
      ) : (
        <Image
          src={`/${card.id}.png`}
          alt={card.name}
          width={140}
          height={196}
          className="duel-monster-img"
        />
      )}

      <div className="duel-stats">
        <span>
          <i>{t("duel.atk")}</i>
          <b>{stats.atk}</b>
        </span>
        <span>
          <i>{t("duel.def")}</i>
          <b>{stats.def}</b>
        </span>
      </div>

      <div className="duel-lp">
        <b>{lp}</b> <i>{t("duel.lp")}</i>
      </div>

      {destroyed ? (
        <span className="duel-destroyed">{t("duel.destroyed", { name: card.name })}</span>
      ) : null}
    </div>
  );
}

function ActionPanel({
  card,
  legal,
  onAction,
  t,
}: {
  card: Card;
  legal: DuelAction[];
  onAction: (action: DuelAction) => void;
  t: Translator;
}) {
  const labelFor = (action: DuelAction): string => {
    if (action.kind === "attack") {
      const attack =
        action.attackIndex !== undefined ? card.attacks[action.attackIndex] : undefined;
      return attack
        ? `${attack.name} · ${t("duel.damage", { damage: attack.damage })}`
        : t("duel.attack");
    }
    if (action.kind === "position") {
      return action.to === "attack"
        ? t("duel.toAttack")
        : action.to === "defense"
          ? t("duel.toDefense")
          : t("duel.toFaceDown");
    }
    return t("duel.pass");
  };

  return (
    <div className="duel-actions">
      {legal.map((action, i) => (
        <button
          key={i}
          type="button"
          className="duel-action"
          onClick={() => onAction(action)}
        >
          {labelFor(action)}
        </button>
      ))}
    </div>
  );
}
