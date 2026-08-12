"use client";

import { useEffect, useMemo, useState } from "react";
import type { BattleResult, Side } from "@/lib/battle/types";
import { ELEMENT_COLORS } from "@/lib/cards/elements";
import type { Element } from "@/lib/cards/types";
import { translator, type Locale } from "@/lib/i18n/dictionaries";
import { BattleRadar } from "./BattleRadar";

/**
 * Animação do log de turnos.
 *
 * O log existe só para isto (RFC 7.3, item 7): não é persistido como parte do
 * que se compartilha e não entra na imagem — o pôster mostra só o placar final.
 * Tudo aqui é client-side, sem nenhuma implicação em cache ou geração de imagem.
 */

const TURN_MS = 850;

export function BattleReplay({
  battle,
  locale,
}: {
  battle: BattleResult;
  locale: Locale;
}) {
  const t = translator(locale);
  const [played, setPlayed] = useState(0);

  useEffect(() => {
    if (played >= battle.turns.length) return;
    const timer = setTimeout(() => setPlayed((n) => n + 1), TURN_MS);
    return () => clearTimeout(timer);
  }, [played, battle.turns.length]);

  /** HP de cada lado depois dos turnos já tocados. */
  const hp = useMemo(() => {
    const current: Record<Side, number> = { a: battle.a.hp, b: battle.b.hp };
    for (const turn of battle.turns.slice(0, played)) {
      const defender: Side = turn.attacker === "a" ? "b" : "a";
      current[defender] = Math.max(0, current[defender] - turn.damage);
    }
    return current;
  }, [battle, played]);

  const finished = played >= battle.turns.length;

  return (
    <div className="replay">
      <div className="replay-fighters">
        <FighterBar
          name={battle.a.name}
          element={battle.a.element}
          hp={hp.a}
          max={battle.a.hp}
          won={finished && battle.winner === "a"}
          label={t("battle.winner")}
        />
        <span className="replay-vs">VS</span>
        <FighterBar
          name={battle.b.name}
          element={battle.b.element}
          hp={hp.b}
          max={battle.b.hp}
          won={finished && battle.winner === "b"}
          label={t("battle.winner")}
        />
      </div>

      <BattleRadar a={battle.a} b={battle.b} locale={locale} />

      <ol className="replay-log" aria-live="polite">
        {battle.turns.slice(0, played).map((turn) => {
          const attacker = turn.attacker === "a" ? battle.a : battle.b;
          const defender = turn.attacker === "a" ? battle.b : battle.a;

          return (
            <li key={turn.index}>
              <span className="turn-index">{t("battle.turn", { n: turn.index })}</span>
              {turn.attack === null ? (
                <span className="turn-body">{attacker.name} —</span>
              ) : (
                <span className="turn-body">
                  {t("battle.uses", { attacker: attacker.name, attack: turn.attack })}
                  {" · "}
                  <b>{t("battle.damage", { damage: turn.damage })}</b>
                  {turn.multiplier === 2 ? (
                    <em className="effective">{t("battle.superEffective")}</em>
                  ) : null}
                  {turn.multiplier === 0.5 ? (
                    <em className="resisted">{t("battle.resisted")}</em>
                  ) : null}
                  {" · "}
                  <span className="turn-hp">
                    {defender.name}: {t("battle.remaining", { hp: Math.max(0, turn.defenderHp) })}
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {finished ? (
        <p className="replay-result">
          {battle.winner
            ? `${t("battle.winner")}: ${battle.winner === "a" ? battle.a.name : battle.b.name}`
            : "—"}
          {/* No teto de turnos ninguém foi nocauteado: vale dizer como foi decidido. */}
          {battle.decidedBy === "hp" ? <em> · {t("battle.draw")}</em> : null}
        </p>
      ) : (
        <button
          type="button"
          className="ghost-link skip"
          onClick={() => setPlayed(battle.turns.length)}
        >
          {t("battle.skip")} ▸▸
        </button>
      )}
    </div>
  );
}

function FighterBar({
  name,
  element,
  hp,
  max,
  won,
  label,
}: {
  name: string;
  element: Element;
  hp: number;
  max: number;
  won: boolean;
  label: string;
}) {
  const colors = ELEMENT_COLORS[element];
  const ratio = Math.max(0, Math.min(1, hp / Math.max(1, max)));

  return (
    <div className="fighter-bar" data-won={won || undefined}>
      <div className="fighter-head">
        <strong>{name}</strong>
        {won ? <span className="fighter-won">{label}</span> : null}
      </div>
      <div className="fighter-hp">
        <span>{hp}</span>
        <i>/ {max}</i>
      </div>
      <div className="fighter-track">
        <div
          className="fighter-fill"
          style={{ width: `${ratio * 100}%`, background: colors.base }}
        />
      </div>
    </div>
  );
}
