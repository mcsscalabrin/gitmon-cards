"use client";

import { useEffect, useRef, useState } from "react";
import { narrationFor } from "@/lib/ygo/narration";
import type { YgoResult } from "@/lib/ygo/types";
import { translator, type Locale } from "@/lib/i18n/dictionaries";
import { SIDE_COLORS } from "@/lib/viz/series";

/**
 * Replay do Speed Duel: o log narrado animado, como o DuelReplay do duelo v2.
 * O log nasce dentro do próprio resultado (`YgoResult.log`), então o replay é
 * autocontido — não depende do tabuleiro nem de re-executar o motor.
 */

const STEP_MS = 650;

export function YgoReplay({ result, locale }: { result: YgoResult; locale: Locale }) {
  const t = translator(locale);
  const [played, setPlayed] = useState(0);
  const logRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (played >= result.log.length) return;
    const timer = setTimeout(() => setPlayed((n) => n + 1), STEP_MS);
    return () => clearTimeout(timer);
  }, [played, result.log.length]);

  /** Auto-scroll para o último passo visível. */
  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    const last = log.lastElementChild;
    if (last) last.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [played]);

  const finished = played >= result.log.length;

  return (
    <div
      className="ygo-replay"
      style={{
        ["--side-a" as string]: SIDE_COLORS.a,
        ["--side-b" as string]: SIDE_COLORS.b,
      }}
    >
      <header className="ygo-replay-result">
        <div className="ygo-replay-vs">
          <span data-side="a">{result.players.a}</span>
          <b>VS</b>
          <span data-side="b">{result.players.b}</span>
        </div>
        <p className="ygo-replay-winner" data-winner={result.winner ?? undefined}>
          {result.winner
            ? `${t("ygo.winner")}: ${
                result.winner === "a" ? result.players.a : result.players.b
              }`
            : "—"}
          <em> · {t(`ygo.${result.decidedBy}`)}</em>
        </p>
      </header>

      <ol className="ygo-log" ref={logRef} aria-live="polite">
        {result.log.slice(0, played).map((step, i) => (
          <li key={i} data-side={step.actor}>
            <span className="turn-index">{t("ygo.turn", { n: step.turn })}</span>
            <span className="turn-body">{narrationFor(step, t, result.players)}</span>
          </li>
        ))}
      </ol>

      {finished ? null : (
        <button
          type="button"
          className="ghost-link skip"
          onClick={() => setPlayed(result.log.length)}
        >
          {t("ygo.skip")} ▸▸
        </button>
      )}
    </div>
  );
}
