"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
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
  MonsterPosition,
  Phase,
  Side,
  YgoAction,
  YgoCard,
  YgoLogStep,
  YgoState,
} from "@/lib/ygo/types";
import {
  translator,
  type Locale,
  type MessageKey,
} from "@/lib/i18n/dictionaries";
import { SIDE_COLORS } from "@/lib/viz/series";

/**
 * A arena do Speed Duel (estilo Duel Links). O client é o controle e roda o mesmo
 * motor do servidor (`lib/ygo/engine`) na mesma semente e com o mesmo PRNG na
 * mesma ordem — a animação e o resultado salvo são o mesmo cálculo (lockstep).
 *
 * O visitante joga o lado A; o lado B é a IA com um timer para o passo da
 * animação. Ao fim, manda as ações do visitante para `POST /api/ygo`, que
 * re-executa tudo e persiste; aqui só redireciona para `/ygo/<id>`.
 *
 * A tela é uma mesa 3D: o campo do oponente fica no plano de trás, espelhado
 * (lê do ponto de vista dele), o campo do jogador no plano da frente, e o HUD —
 * avatar, LP, decks, cemitérios, fases, painel da carta em foco — flutua por
 * cima da arena.
 */

const AI_MS = 700;

type Translator = ReturnType<typeof translator>;

const PHASE_ORDER: Phase[] = ["draw", "main", "battle", "end"];

const PHASE_KEY: Record<Phase, MessageKey> = {
  draw: "ygo.phaseDraw",
  main: "ygo.phaseMain",
  battle: "ygo.phaseBattle",
  end: "ygo.phaseEnd",
};

const PHASE_ABBR: Record<Phase, string> = {
  draw: "DP",
  main: "MP",
  battle: "BP",
  end: "EP",
};

/** O que está sendo arrastado: uma carta da mão ou um monstro próprio em campo. */
type DragSrc =
  | { kind: "hand"; index: number }
  | { kind: "monster"; side: Side; zone: number };

/** Uma zona do tabuleiro como alvo de drop. */
type DropTarget = { side: Side; type: "monster" | "st"; zone: number };

/** Chave estável de uma ação, para casar com a lista legal sem duplicar a lógica. */
const actionKey = (action: YgoAction): string => {
  switch (action.kind) {
    case "summon":
      return `summon:${action.handIndex}:${action.position}`;
    case "spell":
      return `spell:${action.handIndex}`;
    case "setTrap":
      return `setTrap:${action.handIndex}`;
    case "trap":
      return `trap:${action.zone}`;
    case "flip":
      return `flip:${action.zone}`;
    case "attack":
      return `attack:${action.zone}:${action.targetZone}`;
    case "directAttack":
      return `directAttack:${action.zone}`;
    case "pass":
      return "pass";
  }
};

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
  const [selected, setSelected] = useState<YgoCard | null>(null);
  const [drag, setDrag] = useState<DragSrc | null>(null);
  const [dropZone, setDropZone] = useState<DropTarget | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const [pendingSummon, setPendingSummon] = useState<{
    handIndex: number;
    zone: number;
  } | null>(null);

  const actionsRef = useRef<YgoAction[]>([]);
  const postedRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  /** Onde o dedo/cursor encostou, para distinguir clique de arrasto. */
  const dragFromRef = useRef<{ x: number; y: number } | null>(null);

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
    setPendingSummon(null);
    if (!state || state.over || actingSide(state) !== "a") return;
    const result = applyAction(state, "a", action);
    if (!result.ok) return;
    actionsRef.current.push(action);
    setState(structuredClone(result.state));
  };

  const handlePointerDown = (e: PointerEvent, src: DragSrc) => {
    if (!state || state.over || state.window || actingSide(state) !== "a") return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    rootRef.current?.setPointerCapture(e.pointerId);
    dragFromRef.current = { x: e.clientX, y: e.clientY };
    setPendingSummon(null);
    setDropZone(null);
    setDrag(src);
    setGhost({ x: e.clientX, y: e.clientY });
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!drag) return;
    setGhost({ x: e.clientX, y: e.clientY });
    const zone = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest?.(".ygo-zone") as HTMLElement | null;
    if (!zone) {
      if (dropZone) setDropZone(null);
      return;
    }
    const target: DropTarget = {
      side: zone.dataset.side as Side,
      type: zone.dataset.type as "monster" | "st",
      zone: Number(zone.dataset.zone),
    };
    if (isValidTarget(target)) setDropTarget(target);
    else if (dropZone) setDropZone(null);
  };

  const cancelDrag = () => {
    setDrag(null);
    setDropZone(null);
    setGhost(null);
    dragFromRef.current = null;
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (!drag) return;
    const src = drag;
    const from = dragFromRef.current;
    const zone = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest?.(".ygo-zone") as HTMLElement | null;
    if (rootRef.current?.hasPointerCapture(e.pointerId)) {
      rootRef.current.releasePointerCapture(e.pointerId);
    }
    cancelDrag();
    if (!from) return;
    // Sem movimento não é arrasto: um clique não pode flipar/sumonar sozinho.
    const dx = e.clientX - from.x;
    const dy = e.clientY - from.y;
    if (dx * dx + dy * dy < 36) return;
    if (!zone) return;
    const target: DropTarget = {
      side: zone.dataset.side as Side,
      type: zone.dataset.type as "monster" | "st",
      zone: Number(zone.dataset.zone),
    };
    const action = candidate(src, target);
    if (!action) return;
    if (action.kind === "summon") {
      setPendingSummon({ handIndex: action.handIndex, zone: target.zone });
      return;
    }
    play(action);
  };

  const handleSummon = (position: MonsterPosition) => {
    if (!pendingSummon) return;
    play({ kind: "summon", handIndex: pendingSummon.handIndex, position, zone: pendingSummon.zone });
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
  const legal = useMemo(
    () => (myTurn && state ? legalActions(state, "a") : []),
    [myTurn, state],
  );
  const legalKeys = useMemo(() => new Set(legal.map(actionKey)), [legal]);

  /**
   * A ação que um arrasto produziria num alvo — `null` se ilegal. `summon`
   * devolve um marcador: o drop abre o seletor de posição, não joga na hora.
   */
  const candidate = (src: DragSrc, target: DropTarget): YgoAction | null => {
    if (!state || state.over || state.window || legalKeys.size === 0) return null;
    const field = state.field.a;
    if (src.kind === "hand") {
      const card = field.hand[src.index];
      if (!card) return null;
      if (card.kind === "monster") {
        if (target.side !== "a" || target.type !== "monster") return null;
        if (field.monsters[target.zone]) return null;
        const positions: MonsterPosition[] = ["attack", "defense", "face-down"];
        const open = positions.find((p) =>
          legalKeys.has(actionKey({ kind: "summon", handIndex: src.index, position: p })),
        );
        return open ? { kind: "summon", handIndex: src.index, position: open } : null;
      }
      if (target.side !== "a" || target.type !== "st") return null;
      if (card.kind === "spell") {
        const action: YgoAction = { kind: "spell", handIndex: src.index };
        return legalKeys.has(actionKey(action)) ? action : null;
      }
      const action: YgoAction = { kind: "setTrap", handIndex: src.index };
      return legalKeys.has(actionKey(action)) ? action : null;
    }
    const own = state.field.a.monsters[src.zone];
    if (!own) return null;
    if (own.position === "face-down") {
      if (target.side !== "a" || target.type !== "monster") return null;
      const action: YgoAction = { kind: "flip", zone: src.zone };
      return legalKeys.has(actionKey(action)) ? action : null;
    }
    if (target.side !== "b" || target.type !== "monster") return null;
    if (state.field.b.monsters[target.zone]) {
      const action: YgoAction = { kind: "attack", zone: src.zone, targetZone: target.zone };
      return legalKeys.has(actionKey(action)) ? action : null;
    }
    const direct: YgoAction = { kind: "directAttack", zone: src.zone };
    return legalKeys.has(actionKey(direct)) ? direct : null;
  };

  const isValidTarget = (target: DropTarget): boolean =>
    drag !== null && candidate(drag, target) !== null;

  const setDropTarget = (target: DropTarget) => {
    setDropZone((prev) =>
      prev && prev.side === target.side && prev.type === target.type && prev.zone === target.zone
        ? prev
        : target,
    );
  };

  const lastStep = state?.steps[state.steps.length - 1];
  const stepIndex = state ? state.steps.length - 1 : -1;
  const narration = lastStep ? narrationFor(lastStep, t, { a, b }) : "";

  const status = state
    ? over
      ? t("ygo.saving")
      : myTurn
        ? t("ygo.yourTurn")
        : t("ygo.opponentTurn")
    : t("ygo.opponentTurn");

  const trapWindow = state?.window === "trap";

  /** Só dá para arrastar na vez do jogador e fora da janela de armadilha. */
  const canDrag = myTurn && !trapWindow;

  const ghostCard =
    drag && state
      ? drag.kind === "hand"
        ? (state.field.a.hand[drag.index] ?? null)
        : (state.field.a.monsters[drag.zone]?.card ?? null)
      : null;

  return (
    <div
      ref={rootRef}
      className="ygo"
      data-window={trapWindow || undefined}
      data-dragging={drag ? "" : undefined}
      onPointerMove={drag ? handlePointerMove : undefined}
      onPointerUp={drag ? handlePointerUp : undefined}
      onPointerCancel={drag ? cancelDrag : undefined}
      style={{
        ["--side-a" as string]: SIDE_COLORS.a,
        ["--side-b" as string]: SIDE_COLORS.b,
      }}
    >
      {drag && ghost && ghostCard ? (
        <div className="ygo-ghost" style={{ left: ghost.x, top: ghost.y }} aria-hidden="true">
          <MiniCard card={ghostCard} />
        </div>
      ) : null}
      <div className="ygo-arena">
        <div className="ygo-floor" aria-hidden="true" />

        <section className="ygo-half ygo-half-opp" aria-label={b}>
          <div className="ygo-field" data-side="b">
            <Zones
              side="b"
              type="monster"
              state={state}
              lastStep={lastStep}
              lastIndex={stepIndex}
              onSelect={setSelected}
              drag={drag}
              dropZone={dropZone}
              isValidTarget={isValidTarget}
              canDrag={canDrag}
              onPointerDown={handlePointerDown}
            />
            <Zones
              side="b"
              type="st"
              state={state}
              lastStep={lastStep}
              lastIndex={stepIndex}
              onSelect={setSelected}
              drag={drag}
              dropZone={dropZone}
              isValidTarget={isValidTarget}
              canDrag={canDrag}
              onPointerDown={handlePointerDown}
            />
          </div>
        </section>

        <div className="ygo-mid">
          <PhaseBar state={state} t={t} />
          <div className="ygo-stage">
            <p className="ygo-narration" aria-live="polite">
              {narration}
            </p>
            <p className="ygo-status">{status}</p>
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
        </div>

        <section className="ygo-half ygo-half-me" aria-label={a}>
          <div className="ygo-field" data-side="a">
            <Zones
              side="a"
              type="monster"
              state={state}
              lastStep={lastStep}
              lastIndex={stepIndex}
              onSelect={setSelected}
              drag={drag}
              dropZone={dropZone}
              isValidTarget={isValidTarget}
              canDrag={canDrag}
              onPointerDown={handlePointerDown}
            />
            <Zones
              side="a"
              type="st"
              state={state}
              lastStep={lastStep}
              lastIndex={stepIndex}
              onSelect={setSelected}
              drag={drag}
              dropZone={dropZone}
              isValidTarget={isValidTarget}
              canDrag={canDrag}
              onPointerDown={handlePointerDown}
            />
            {pendingSummon && state && state.field.a.hand[pendingSummon.handIndex] ? (
              <SummonChooser
                handIndex={pendingSummon.handIndex}
                card={state.field.a.hand[pendingSummon.handIndex]}
                legalKeys={legalKeys}
                t={t}
                onSummon={handleSummon}
                onCancel={() => setPendingSummon(null)}
              />
            ) : null}
          </div>
        </section>

        <OppHand state={state} />

        <div className="ygo-hud ygo-hud-opp">
          <PlayerHud side="b" label={b} state={state} t={t} />
        </div>
        <div className="ygo-hud ygo-hud-me">
          <PlayerHud side="a" label={a} state={state} t={t} />
        </div>

        <Piles side="b" state={state} t={t} />
        <Piles side="a" state={state} t={t} />

        <TurnBadge state={state} t={t} />

        <SelectedPanel card={selected} t={t} />
      </div>

      <div className="ygo-bottom">
        {myTurn && state ? (
          <ActionPanel state={state} legal={legal} onAction={play} t={t} />
        ) : null}
        <Hand
          state={state}
          onSelect={setSelected}
          t={t}
          drag={drag}
          canDrag={canDrag}
          onPointerDown={handlePointerDown}
        />
        {myTurn && !trapWindow ? (
          <p className="ygo-hint">{t("ygo.dragHint")}</p>
        ) : null}
      </div>
    </div>
  );
}

function PlayerHud({
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
    <div className="ygo-hud-box" data-side={side} data-active={active || undefined}>
      <Avatar login={label} side={side} />
      <div className="ygo-hud-body">
        <strong className="ygo-hud-name">{label}</strong>
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
      </div>
      <b className="ygo-lp-value" key={lp}>
        {lp}
      </b>
    </div>
  );
}

function Avatar({ login, side }: { login: string; side: Side }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="ygo-avatar" data-side={side}>
      {!failed ? (
        <img
          src={`https://github.com/${login}.png`}
          alt=""
          loading="lazy"
          className="ygo-avatar-img"
          onError={() => setFailed(true)}
        />
      ) : null}
      <span className="ygo-avatar-fallback" aria-hidden={failed ? undefined : true}>
        {(login[0] ?? "?").toUpperCase()}
      </span>
    </span>
  );
}

function OppHand({ state }: { state: YgoState | null }) {
  const count = state?.field.b.hand.length ?? 0;
  return (
    <div className="ygo-opphand" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="ygo-card ygo-card-back" />
      ))}
    </div>
  );
}

function PhaseBar({ state, t }: { state: YgoState | null; t: Translator }) {
  const active: Phase | "trap" | null = state?.window
    ? "trap"
    : (state?.phase ?? null);

  return (
    <div className="ygo-phases" data-window={active === "trap" || undefined}>
      {PHASE_ORDER.map((phase) => (
        <span
          key={phase}
          className="ygo-phase-seg"
          data-active={active === phase || undefined}
        >
          <b>{PHASE_ABBR[phase]}</b>
          <i>{t(PHASE_KEY[phase])}</i>
        </span>
      ))}
      <span
        className="ygo-phase-seg"
        data-trap={active === "trap" || undefined}
        data-active={active === "trap" || undefined}
      >
        <b>TP</b>
        <i>{t("ygo.phaseTrap")}</i>
      </span>
    </div>
  );
}

function TurnBadge({ state, t }: { state: YgoState | null; t: Translator }) {
  const turn = state?.turn ?? 1;
  return (
    <span
      className="ygo-turn"
      title={t("ygo.turn", { n: turn })}
      aria-label={t("ygo.turn", { n: turn })}
    >
      <i>{t("ygo.turn", { n: 1 }).split(/\d/)[0]}</i>
      <b>{turn}</b>
    </span>
  );
}

function Piles({
  side,
  state,
  t,
}: {
  side: Side;
  state: YgoState | null;
  t: Translator;
}) {
  const deck = state?.field[side].deck.length ?? 0;
  const grave = state?.field[side].grave.length ?? 0;
  const graveFirst = side === "a";
  return (
    <div className="ygo-piles" data-side={side}>
      {graveFirst ? (
        <>
          <Pile count={grave} type="grave" t={t} />
          <Pile count={deck} type="deck" t={t} />
        </>
      ) : (
        <>
          <Pile count={deck} type="deck" t={t} />
          <Pile count={grave} type="grave" t={t} />
        </>
      )}
    </div>
  );
}

function Pile({
  count,
  type,
  t,
}: {
  count: number;
  type: "deck" | "grave";
  t: Translator;
}) {
  const title = type === "deck" ? t("ygo.deck", { n: count }) : t("ygo.grave", { n: count });
  return (
    <span className="ygo-pile" data-pile={type} title={title} aria-label={title}>
      <b className="ygo-pile-count">{count}</b>
    </span>
  );
}

function Hand({
  state,
  onSelect,
  t,
  drag,
  canDrag,
  onPointerDown,
}: {
  state: YgoState | null;
  onSelect: (card: YgoCard) => void;
  t: Translator;
  drag: DragSrc | null;
  canDrag: boolean;
  onPointerDown: (e: PointerEvent, src: DragSrc) => void;
}) {
  const hand = state?.field.a.hand ?? [];
  return (
    <div className="ygo-hand" data-side="a">
      {hand.map((card, i) => (
        <MiniCard
          key={i}
          card={card}
          onSelect={onSelect}
          canDrag={canDrag}
          dragging={drag?.kind === "hand" && drag.index === i}
          onPointerDown={(e) => onPointerDown(e, { kind: "hand", index: i })}
        />
      ))}
      {hand.length === 0 ? (
        <span className="ygo-hand-empty">{t("ygo.pass")}…</span>
      ) : null}
    </div>
  );
}

function Zones({
  side,
  type,
  state,
  lastStep,
  lastIndex,
  onSelect,
  drag,
  dropZone,
  isValidTarget,
  canDrag,
  onPointerDown,
}: {
  side: Side;
  type: "monster" | "st";
  state: YgoState | null;
  lastStep: YgoLogStep | undefined;
  lastIndex: number;
  onSelect: (card: YgoCard) => void;
  drag: DragSrc | null;
  dropZone: DropTarget | null;
  isValidTarget: (target: DropTarget) => boolean;
  canDrag: boolean;
  onPointerDown: (e: PointerEvent, src: DragSrc) => void;
}) {
  const slots = Array.from({ length: 3 }, (_, i) => i);

  /** Zonas que explodiram no último passo (ataque que destruiu algo). */
  const destroyed = useMemo(() => {
    const zones: Record<Side, number[]> = { a: [], b: [] };
    const strike = lastStep?.strike;
    if (!strike) return zones;
    const defender = strike.attacker === "a" ? "b" : "a";
    if (
      (strike.destroyed === "defender" || strike.destroyed === "both") &&
      strike.targetZone !== null
    ) {
      zones[defender].push(strike.targetZone);
    }
    if (strike.destroyed === "attacker" || strike.destroyed === "both") {
      zones[strike.attacker].push(strike.zone);
    }
    return zones;
  }, [lastStep]);

  const own = side === "a";

  return (
    <div className="ygo-zones" data-type={type}>
      {slots.map((zone) => {
        const target: DropTarget = { side, type, zone };
        const active =
          drag !== null &&
          dropZone !== null &&
          dropZone.side === side &&
          dropZone.type === type &&
          dropZone.zone === zone &&
          isValidTarget(target);
        const field = state?.field[side];
        const isDestroyed = destroyed[side].includes(zone);
        const flash = isDestroyed ? `f${lastIndex}` : undefined;
        if (type === "monster") {
          const m = field?.monsters[zone] ?? null;
          const hidden = m?.position === "face-down";
          const selectable = m && (own || !hidden);
          return (
            <div
              key={flash ?? `${side}-m${zone}`}
              className="ygo-zone"
              data-flash={flash}
              data-side={side}
              data-type={type}
              data-zone={zone}
              data-dragtarget={active ? "" : undefined}
              onMouseEnter={selectable ? () => onSelect(m.card) : undefined}
            >
              {m ? (
                <MiniCard
                  card={m.card}
                  position={m.position}
                  attacked={m.attacked}
                  canDrag={own && canDrag}
                  dragging={own && drag?.kind === "monster" && drag.zone === zone}
                  onPointerDown={(e) =>
                    own ? onPointerDown(e, { kind: "monster", side, zone }) : undefined
                  }
                />
              ) : (
                <span className="ygo-zone-empty" />
              )}
            </div>
          );
        }
        const s = field?.st[zone] ?? null;
        const hidden = s?.face === "down";
        const selectable = s && (own || !hidden);
        return (
          <div
            key={flash ?? `${side}-s${zone}`}
            className="ygo-zone"
            data-flash={flash}
            data-side={side}
            data-type={type}
            data-zone={zone}
            data-dragtarget={active ? "" : undefined}
            onMouseEnter={selectable ? () => onSelect(s.card) : undefined}
          >
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

/**
 * O PNG da carta de perfil do dev — o mesmo que aparece na aba do perfil
 * (`/:login.png`, reescrito para `/api/card-image/:login`). Monstros usam o
 * login direto; skills carregam o login do dono, porque a magia/armadilha não
 * tem perfil próprio.
 */
function profileCardUrl(card: YgoCard): string {
  const login = card.id.startsWith("skill:") ? card.id.slice("skill:".length) : card.id;
  return `/${login}.png`;
}

function MiniCard({
  card,
  position = "attack",
  attacked = false,
  onSelect,
  canDrag = false,
  dragging = false,
  onPointerDown,
}: {
  card: YgoCard;
  position?: MonsterPosition;
  attacked?: boolean;
  onSelect?: (card: YgoCard) => void;
  canDrag?: boolean;
  dragging?: boolean;
  onPointerDown?: (e: PointerEvent) => void;
}) {
  const select = onSelect ? () => onSelect(card) : undefined;
  const common = {
    onMouseEnter: select,
    onFocus: select,
    onPointerDown: canDrag && onPointerDown ? onPointerDown : undefined,
    "aria-grabbed": dragging || undefined,
  };
  if (position === "face-down") {
    return (
      <span
        className="ygo-card ygo-card-back"
        data-dragging={dragging || undefined}
        aria-label={card.name}
        {...common}
      />
    );
  }
  return (
    <div
      className="ygo-card"
      data-kind={card.kind}
      data-pos={position}
      data-attacked={attacked || undefined}
      data-dragging={dragging || undefined}
      {...common}
    >
      <img src={profileCardUrl(card)} alt={card.name} className="ygo-card-art" loading="lazy" />
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
  const traps = legal.filter(
    (a): a is Extract<YgoAction, { kind: "trap" }> => a.kind === "trap",
  );
  return (
    <div className="ygo-actions">
      {traps.map((action, i) => (
        <button
          key={i}
          type="button"
          className="ygo-action"
          onClick={() => onAction(action)}
        >
          {t("ygo.activateTrap", { name: state.field.a.st[action.zone]?.card.name ?? "" })}
        </button>
      ))}
      <button type="button" className="ygo-action" onClick={() => onAction({ kind: "pass" })}>
        {t("ygo.pass")}
      </button>
    </div>
  );
}

function SummonChooser({
  handIndex,
  card,
  legalKeys,
  t,
  onSummon,
  onCancel,
}: {
  handIndex: number;
  card: YgoCard;
  legalKeys: Set<string>;
  t: Translator;
  onSummon: (position: MonsterPosition) => void;
  onCancel: () => void;
}) {
  const options: { position: MonsterPosition; label: string }[] = [
    { position: "attack", label: t("ygo.posAttack") },
    { position: "defense", label: t("ygo.posDefense") },
    { position: "face-down", label: t("ygo.posFaceDown") },
  ];
  return (
    <div className="ygo-poschooser" role="dialog" aria-label={card.name}>
      <strong>{card.name}</strong>
      <div className="ygo-poschooser-options">
        {options.map((opt) => (
          <button
            key={opt.position}
            type="button"
            className="ygo-pos-option"
            data-position={opt.position}
            disabled={!legalKeys.has(actionKey({ kind: "summon", handIndex, position: opt.position }))}
            onClick={() => onSummon(opt.position)}
          >
            {opt.label}
          </button>
        ))}
        <button type="button" className="ygo-pos-option" data-position="cancel" onClick={onCancel}>
          {t("ygo.cancel")}
        </button>
      </div>
    </div>
  );
}

function SelectedPanel({ card, t }: { card: YgoCard | null; t: Translator }) {
  if (!card) return null;
  return (
    <aside className="ygo-selected" aria-live="polite">
      <div className="ygo-selected-art">
        <img src={profileCardUrl(card)} alt="" className="ygo-selected-img" />
      </div>
      <div className="ygo-selected-body">
        <h2 className="ygo-selected-name">{card.name}</h2>
        <p className="ygo-selected-meta">
          {card.kind === "monster"
            ? `${"★".repeat(card.level ?? 1)} · ${t("ygo.atk")} ${card.atk ?? 0} / ${t("ygo.def")} ${card.def ?? 0}`
            : card.kind.toUpperCase()}
        </p>
        <p className="ygo-selected-text">{card.text}</p>
      </div>
    </aside>
  );
}

