"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { TypeIcon } from "@/components/card/TypeIcon";
import { monsterStats, STARTING_LP } from "@/lib/duel/engine";
import { narrationFor, positionLabel } from "@/lib/duel/narration";
import type { DuelMonster, DuelResult, Side } from "@/lib/duel/types";
import { translator, type Locale } from "@/lib/i18n/dictionaries";
import { SIDE_COLORS } from "@/lib/viz/series";

/**
 * Replay do duelo: o tabuleiro final com o log de turnos animado.
 *
 * Mesma mecânica do replay de batalha (RFC 7.3, item 7): o log não é persistido
 * à parte nem entra na imagem — o pôster mostra só o placar final. O que roda
 * aqui é client-side, sem implicação em cache.
 */

const TURN_MS = 850;

type Translator = ReturnType<typeof translator>;

export function DuelReplay({ duel, locale }: { duel: DuelResult; locale: Locale }) {
  const t = translator(locale);
  const [played, setPlayed] = useState(0);
  const logRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (played >= duel.turns.length) return;
    const timer = setTimeout(() => setPlayed((n) => n + 1), TURN_MS);
    return () => clearTimeout(timer);
  }, [played, duel.turns.length]);

  /** Auto-scroll para o último turno visível. */
  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    const last = log.lastElementChild;
    if (last) last.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [played]);

  /**
   * LP de cada lado depois dos turnos já tocados, e o de um turno atrás — o
   * rastro na barra desenha o dano no lugar de onde ele saiu (ver BattleReplay).
   */
  const { lp, prevLp } = useMemo(() => {
    const current: Record<Side, number> = { a: STARTING_LP, b: STARTING_LP };
    let previous: Record<Side, number> = { ...current };
    duel.turns.slice(0, played).forEach((turn, i) => {
      if (i === played - 1) previous = { ...current };
      const strike = turn.strike;
      if (strike?.damageTo) {
        current[strike.damageTo] = Math.max(0, current[strike.damageTo] - strike.damage);
      }
    });
    return { lp: current, prevLp: previous };
  }, [duel, played]);

  const finished = played >= duel.turns.length;

  /** Campo de um lado depois dos turnos tocados — posição e destruição. */
  const fieldFor = (side: Side): DuelMonster =>
    played === 0
      ? { card: duel[side], position: "attack", destroyed: false }
      : duel.turns[played - 1].monstersAfter[side];

  return (
    <div
      className="duel-replay"
      style={{
        ["--side-a" as string]: SIDE_COLORS.a,
        ["--side-b" as string]: SIDE_COLORS.b,
      }}
    >
      <div className="duel-replay-fighters">
        <DuelFighter
          side="a"
          card={duel.a}
          monster={fieldFor("a")}
          lp={lp.a}
          prevLp={prevLp.a}
          turn={played}
          won={finished && duel.winner === "a"}
          t={t}
        />
        <span className="duel-replay-vs">VS</span>
        <DuelFighter
          side="b"
          card={duel.b}
          monster={fieldFor("b")}
          lp={lp.b}
          prevLp={prevLp.b}
          turn={played}
          won={finished && duel.winner === "b"}
          t={t}
        />
      </div>

      <ol className="duel-log" ref={logRef} aria-live="polite">
        {duel.turns.slice(0, played).map((turn) => (
          <li key={turn.index} data-side={turn.actor}>
            <span className="turn-index">{t("duel.turn", { n: turn.index })}</span>
            <span className="turn-body">{narrationFor(turn, duel.a, duel.b, t)}</span>
          </li>
        ))}
      </ol>

      {finished ? (
        <p className="duel-replay-result">
          {duel.winner
            ? `${t("duel.winner")}: ${duel.winner === "a" ? duel.a.name : duel.b.name}`
            : "—"}
          <em> · {duel.decidedBy === "knockout" ? t("duel.knockout") : t("duel.draw")}</em>
        </p>
      ) : (
        <button
          type="button"
          className="ghost-link skip"
          onClick={() => setPlayed(duel.turns.length)}
        >
          {t("duel.skip")} ▸▸
        </button>
      )}
    </div>
  );
}

function DuelFighter({
  side,
  card,
  monster,
  lp,
  prevLp,
  turn,
  won,
  t,
}: {
  side: Side;
  card: DuelResult["a"];
  monster: DuelMonster;
  lp: number;
  prevLp: number;
  /** Só para reiniciar a animação do rastro a cada turno. */
  turn: number;
  won: boolean;
  t: Translator;
}) {
  const stats = monsterStats(card);
  const ratio = Math.max(0, Math.min(1, lp / STARTING_LP));
  const prevRatio = Math.max(ratio, Math.min(1, prevLp / STARTING_LP));
  const color = SIDE_COLORS[side];

  return (
    <div
      className="duel-fighter"
      data-won={won || undefined}
      style={{ ["--side" as string]: color }}
    >
      {monster.position === "face-down" && !monster.destroyed ? (
        <div className="duel-fighter-back" role="img" aria-label={card.name} />
      ) : (
        <Image
          src={`/${card.id}.png`}
          alt={card.name}
          width={140}
          height={196}
          className="duel-fighter-img"
        />
      )}
      <div className="duel-fighter-head">
        <strong>{card.name}</strong>
        <TypeIcon element={card.element} size={16} />
        <span className="duel-pos" data-pos={monster.position}>
          {positionLabel(t, monster.position)}
        </span>
        {won ? <span className="duel-fighter-won">{t("duel.winner")}</span> : null}
        {monster.destroyed ? (
          <span className="duel-fighter-destroyed">
            {t("duel.destroyed", { name: card.name })}
          </span>
        ) : null}
      </div>
      <div className="duel-fighter-stats">
        <span>
          <i>{t("duel.atk")}</i>
          <b>{stats.atk}</b>
        </span>
        <span>
          <i>{t("duel.def")}</i>
          <b>{stats.def}</b>
        </span>
      </div>
      <div className="duel-fighter-lp">
        <b>{lp}</b> <i>{t("duel.lp")}</i>
      </div>
      <div
        className="duel-fighter-track"
        role="meter"
        aria-valuenow={lp}
        aria-valuemin={0}
        aria-valuemax={STARTING_LP}
        aria-label={`${card.name} — ${t("duel.lp")}`}
      >
        {prevRatio > ratio ? (
          <div key={turn} className="duel-fighter-ghost" style={{ width: `${prevRatio * 100}%` }} />
        ) : null}
        <div className="duel-fighter-fill" style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}
