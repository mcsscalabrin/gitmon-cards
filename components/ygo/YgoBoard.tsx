"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  STARTING_LP,
  actingSide,
  aiAct,
  applyAction,
  legalActions,
  newDuel,
} from "@/lib/ygo/engine";
import { narrationFor } from "@/lib/ygo/narration";
import type {
  Side,
  YgoAction,
  YgoCard,
  YgoLogStep,
  YgoState,
} from "@/lib/ygo/types";
import { translator, type Locale } from "@/lib/i18n/dictionaries";
import { SIDE_COLORS } from "@/lib/viz/series";

/**
 * A arena do Speed Duel (estilo Duel Links). O client é o controle e roda o mesmo
 * motor do servidor (`lib/ygo/engine`) na mesma semente e com o mesmo PRNG na
 * mesma ordem — a animação e o resultado salvo são o mesmo cálculo (lockstep).
 *
 * O visitante joga o lado A; o lado B é a IA com um timer para o passo da
 * animação. Ao fim, manda as ações do visitante para `POST /api/ygo`, que
 * re-executa tudo e persiste; aqui só redireciona para `/ygo/<id>`.
 */

const AI_MS = 700;

type Translator = ReturnType<typeof translator>;

export function YgoBoard({
  a,
  b,
  seed,
  locale,
}: {
  a: string;
  b: string;
  seed: number;
  locale: Locale;
}) {
  const t = translator(locale);
  const router = useRouter();

  const [post, setPost] = useState<"idle" | "saving" | "error">("idle");
  const [attempt, setAttempt] = useState(0);

  const actionsRef = useRef<YgoAction[]>([]);
  const postedRef = useRef(false);

  /**
   * A sessão nasce uma vez: o starter e o shuffle dos dois decks consomem o PRNG
   * dentro de `newDuel`, e `session.random` é a mesma função do confronto
   * inteiro — mesma ordem de consumo do `playDuel`.
   */
  const [session] = useState(() => newDuel(seed));
  const [state, setState] = useState<YgoState | null>(session.state);

  // Vez da IA (lado B): escolhe com a mesma heurística do playDuel, consumindo o
  // mesmo PRNG na mesma ordem. O timer garante o passo da animação.
  useEffect(() => {
    if (!state || state.over || actingSide(state) !== "b") return;
    const timer = setTimeout(() => {
      const action = aiAct(state, "b", session.random);
      const result = applyAction(state, "b", action);
      if (result.ok) setState(structuredClone(result.state));
    }, AI_MS);
    return () => clearTimeout(timer);
  }, [state, session]);

  const play = (action: YgoAction) => {
    if (!state || state.over || actingSide(state) !== "a") return;
    const result = applyAction(state, "a", action);
    if (!result.ok) return;
    actionsRef.current.push(action);
    setState(structuredClone(result.state));
  };

  // Fim do jogo: o servidor é o juiz. Manda as ações e redireciona para o
  // resultado estável em `/ygo/<id>`.
  useEffect(() => {
    if (!state?.over || postedRef.current) return;
    postedRef.current = true;
    setPost("saving");
    fetch("/api/ygo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ a, b, seed, actions: actionsRef.current }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`http ${res.status}`);
        const data = (await res.json()) as { id: string };
        router.replace(`/ygo/${data.id}`);
      })
      .catch(() => {
        postedRef.current = false;
        setPost("error");
      });
  }, [state, a, b, seed, router, attempt]);

  const over = state?.over ?? false;
  const myTurn = state !== null && !over && actingSide(state) === "a";
  const legal = myTurn && state ? legalActions(state, "a") : [];

  const lastStep = state?.steps[state.steps.length - 1];
  const stepIndex = state ? state.steps.length - 1 : -1;
  const narration = lastStep ? narrationFor(lastStep, t, { a, b }) : "";

  const phaseLabel = state
    ? state.window
      ? t("ygo.phaseTrap")
      : state.phase === "main"
        ? t("ygo.phaseMain")
        : state.phase === "battle"
          ? t("ygo.phaseBattle")
          : t("ygo.phaseEnd")
    : "";

  const status = state
    ? over
      ? t("ygo.saving")
      : myTurn
        ? t("ygo.yourTurn")
        : t("ygo.opponentTurn")
    : t("ygo.opponentTurn");

  return (
    <div
      className="ygo"
      style={{
        ["--side-a" as string]: SIDE_COLORS.a,
        ["--side-b" as string]: SIDE_COLORS.b,
      }}
    >
      <PlayerBar side="b" label={b} state={state} t={t} />
      <Hand faceDown side="b" state={state} t={t} />
      <div className="ygo-zonegrid" data-side="b">
        <Zones side="b" type="monster" state={state} lastStep={lastStep} lastIndex={stepIndex} />
        <Zones side="b" type="st" state={state} lastStep={lastStep} lastIndex={stepIndex} />
      </div>

      <div className="ygo-stage">
        <p className="ygo-phase" data-window={state?.window ? "trap" : undefined}>
          {state ? `${t("ygo.turn", { n: state.turn })} · ${phaseLabel}` : ""}
        </p>
        <p className="ygo-narration" aria-live="polite">
          {narration}
        </p>
        <p className="ygo-status">{status}</p>
        {myTurn && state ? (
          <ActionPanel state={state} legal={legal} onAction={play} t={t} />
        ) : null}
        {post === "error" ? (
          <p className="ygo-saving" role="alert">
            {t("ygo.saveError")}{" "}
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

      <div className="ygo-zonegrid" data-side="a">
        <Zones side="a" type="monster" state={state} lastStep={lastStep} lastIndex={stepIndex} />
        <Zones side="a" type="st" state={state} lastStep={lastStep} lastIndex={stepIndex} />
      </div>
      <Hand faceDown={false} side="a" state={state} t={t} />
      <PlayerBar side="a" label={a} state={state} t={t} />
    </div>
  );
}

function PlayerBar({
  side,
  label,
  state,
  t,
}: {
  side: Side;
  label: string;
  state: YgoState | null;
  t: Translator;
}) {
  const lp = state?.field[side].lp ?? STARTING_LP;
  const active = state !== null && !state.over && actingSide(state) === side;
  const ratio = Math.max(0, Math.min(1, lp / STARTING_LP));

  return (
    <div className="ygo-player" data-side={side} data-active={active || undefined}>
      <strong>{label}</strong>
      <div
        className="ygo-lp-bar"
        role="meter"
        aria-valuenow={lp}
        aria-valuemin={0}
        aria-valuemax={STARTING_LP}
        aria-label={`${label} — ${t("ygo.lp")}`}
      >
        <div className="ygo-lp-fill" style={{ width: `${ratio * 100}%` }} />
      </div>
      <b className="ygo-lp-value">{lp}</b>
    </div>
  );
}

function Hand({
  faceDown,
  side,
  state,
  t,
}: {
  faceDown: boolean;
  side: Side;
  state: YgoState | null;
  t: Translator;
}) {
  const hand = state?.field[side].hand ?? [];
  const deckCount = state?.field[side].deck.length ?? 0;

  return (
    <div className="ygo-hand" data-side={side}>
      {faceDown
        ? hand.map((card, i) => (
            <span key={i} className="ygo-card ygo-card-back" aria-label={card.name} />
          ))
        : hand.map((card, i) => <MiniCard key={i} card={card} />)}
      <span className="ygo-deck" title={t("ygo.deck", { n: deckCount })}>
        {deckCount}
      </span>
    </div>
  );
}

function Zones({
  side,
  type,
  state,
  lastStep,
  lastIndex,
}: {
  side: Side;
  type: "monster" | "st";
  state: YgoState | null;
  lastStep: YgoLogStep | undefined;
  lastIndex: number;
}) {
  const count = type === "monster" ? 3 : 3;
  const slots = Array.from({ length: count }, (_, i) => i);

  /** Zonas que explodiram no último passo (ataque que destruiu algo). */
  const destroyed = useMemo(() => {
    const zones: Record<Side, number[]> = { a: [], b: [] };
    const strike = lastStep?.strike;
    if (!strike) return zones;
    const defender = strike.attacker === "a" ? "b" : "a";
    if ((strike.destroyed === "defender" || strike.destroyed === "both") && strike.targetZone !== null) {
      zones[defender].push(strike.targetZone);
    }
    if (strike.destroyed === "attacker" || strike.destroyed === "both") {
      zones[strike.attacker].push(strike.zone);
    }
    return zones;
  }, [lastStep]);

  return (
    <div className="ygo-zones" data-type={type}>
      {slots.map((zone) => {
        const field = state?.field[side];
        const isDestroyed = destroyed[side].includes(zone);
        const flash = isDestroyed ? `f${lastIndex}` : undefined;
        if (type === "monster") {
          const m = field?.monsters[zone] ?? null;
          return (
            <div key={flash ?? `${side}-m${zone}`} className="ygo-zone" data-flash={flash}>
              {m ? (
                <MiniCard card={m.card} position={m.position} attacked={m.attacked} />
              ) : (
                <span className="ygo-zone-empty" />
              )}
            </div>
          );
        }
        const s = field?.st[zone] ?? null;
        return (
          <div key={flash ?? `${side}-s${zone}`} className="ygo-zone" data-flash={flash}>
            {s ? (
              s.face === "down" ? (
                <span className="ygo-card ygo-card-back" aria-label={s.card.name} />
              ) : (
                <MiniCard card={s.card} />
              )
            ) : (
              <span className="ygo-zone-empty" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function MiniCard({
  card,
  position = "attack",
  attacked = false,
}: {
  card: YgoCard;
  position?: "attack" | "defense" | "face-down";
  attacked?: boolean;
}) {
  if (position === "face-down") {
    return <span className="ygo-card ygo-card-back" aria-label={card.name} />;
  }
  if (card.kind !== "monster") {
    return (
      <div className="ygo-card ygo-card-skill" data-kind={card.kind} title={card.text}>
        <span className="ygo-card-name">{card.name}</span>
      </div>
    );
  }
  return (
    <div className="ygo-card ygo-card-monster" data-pos={position} data-attacked={attacked || undefined}>
      <span className="ygo-card-level">{"★".repeat(card.level ?? 1)}</span>
      <img src={card.artUrl} alt={card.name} className="ygo-card-art" />
      <span className="ygo-card-atk">{card.atk ?? 0}</span>
      <span className="ygo-card-def">{card.def ?? 0}</span>
    </div>
  );
}

function ActionPanel({
  state,
  legal,
  onAction,
  t,
}: {
  state: YgoState;
  legal: YgoAction[];
  onAction: (action: YgoAction) => void;
  t: Translator;
}) {
  const hand = state.field.a.hand;
  const st = state.field.a.st;
  const monsters = state.field.a.monsters;
  const enemy = state.field.b.monsters;

  const labelFor = (action: YgoAction): string => {
    switch (action.kind) {
      case "summon": {
        const name = hand[action.handIndex]?.name ?? "";
        if (action.position === "attack") return t("ygo.summonAttack", { name });
        if (action.position === "defense") return t("ygo.summonDefense", { name });
        return t("ygo.summonFaceDown", { name });
      }
      case "spell":
        return t("ygo.activateSpell", { name: hand[action.handIndex]?.name ?? "" });
      case "setTrap":
        return t("ygo.setTrap", { name: hand[action.handIndex]?.name ?? "" });
      case "trap":
        return t("ygo.activateTrap", { name: st[action.zone]?.card.name ?? "" });
      case "flip":
        return t("ygo.flip", { name: monsters[action.zone]?.card.name ?? "" });
      case "attack":
        return t("ygo.attack", { name: enemy[action.targetZone]?.card.name ?? "" });
      case "directAttack":
        return t("ygo.directAttack");
      case "pass":
        return t("ygo.pass");
    }
  };

  return (
    <div className="ygo-actions">
      {legal.map((action, i) => (
        <button key={i} type="button" className="ygo-action" onClick={() => onAction(action)}>
          {labelFor(action)}
        </button>
      ))}
    </div>
  );
}
