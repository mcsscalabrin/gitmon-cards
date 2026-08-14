"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { BattleResult, Side } from "@/lib/battle/types";
import type { Card } from "@/lib/cards/types";
import { SIDE_COLORS, SIDE_MARKERS, markerPath } from "@/lib/viz/series";
import { TypeIcon } from "@/components/card/TypeIcon";
import { translator, type Locale } from "@/lib/i18n/dictionaries";
import { BattleRadar } from "./BattleRadar";

/**
 * Animação do log de turnos.
 *
 * O log existe só para isto (RFC 7.3, item 7): não é persistido como parte do
 * que se compartilha e não entra na imagem — o pôster mostra só o placar final.
 * Tudo aqui é client-side, sem nenhuma implicação em cache ou geração de imagem.
 *
 * A cor de cada lado vem de `lib/viz/series.ts`, e não do tipo da carta. Vale a
 * mesma razão do radar: dois oponentes do mesmo tipo tinham a mesma barra de PS,
 * e a barra é o único lugar da tela onde os dois aparecem lado a lado. O tipo
 * continua na tela, no disco ao lado do nome.
 */

const TURN_MS = 850;

/** Marcador do lado, do tamanho de um caractere — a mesma forma dos vértices do radar. */
function SideMark({ side }: { side: Side }) {
  return (
    <svg className="side-mark" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <path d={markerPath(SIDE_MARKERS[side], 5, 5, 4)} fill={SIDE_COLORS[side]} />
    </svg>
  );
}

export function BattleReplay({
  battle,
  locale,
}: {
  battle: BattleResult;
  locale: Locale;
}) {
  const t = translator(locale);
  const [played, setPlayed] = useState(0);
  const logRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (played >= battle.turns.length) return;
    const timer = setTimeout(() => setPlayed((n) => n + 1), TURN_MS);
    return () => clearTimeout(timer);
  }, [played, battle.turns.length]);

  /** Auto-scroll para o último turno visível. */
  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    const last = log.lastElementChild;
    if (last) last.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [played]);

  /**
   * HP de cada lado depois dos turnos já tocados, e o de um turno atrás.
   *
   * O anterior existe para a barra mostrar **o pedaço que acabou de sair**: numa
   * barra que só encolhe, um golpe de 10 e um de 60 têm a mesma aparência —
   * a barra está sempre em algum lugar, e o que mudou já foi. O rastro é o dano
   * do turno, desenhado no lugar de onde ele saiu.
   */
  const { hp, prevHp } = useMemo(() => {
    const current: Record<Side, number> = { a: battle.a.hp, b: battle.b.hp };
    let previous: Record<Side, number> = { ...current };

    battle.turns.slice(0, played).forEach((turn, i) => {
      if (i === played - 1) previous = { ...current };
      const defender: Side = turn.attacker === "a" ? "b" : "a";
      current[defender] = Math.max(0, current[defender] - turn.damage);
    });

    return { hp: current, prevHp: previous };
  }, [battle, played]);

  const finished = played >= battle.turns.length;

  /*
   * As duas cores de série descem daqui como variáveis para o CSS pintar o
   * trilho de cada linha do log. A fonte continua sendo `lib/viz/series.ts` — o
   * CSS lê o valor, não o redefine, para não haver duas listas de cor.
   */
  return (
    <div
      className="replay"
      style={{
        ["--side-a" as string]: SIDE_COLORS.a,
        ["--side-b" as string]: SIDE_COLORS.b,
      }}
    >
      <div className="replay-fighters">
        <FighterBar
          side="a"
          card={battle.a}
          hp={hp.a}
          prevHp={prevHp.a}
          turn={played}
          won={finished && battle.winner === "a"}
          label={t("battle.winner")}
          hpLabel={t("battle.hpLeft")}
        />
        <span className="replay-vs">VS</span>
        <FighterBar
          side="b"
          card={battle.b}
          hp={hp.b}
          prevHp={prevHp.b}
          turn={played}
          won={finished && battle.winner === "b"}
          label={t("battle.winner")}
          hpLabel={t("battle.hpLeft")}
        />
      </div>

      <ol className="replay-log" ref={logRef} aria-live="polite">
        {battle.turns.slice(0, played).map((turn) => {
          const attacker = turn.attacker === "a" ? battle.a : battle.b;
          const defender = turn.attacker === "a" ? battle.b : battle.a;

          return (
            <li key={turn.index} data-side={turn.attacker}>
              {/*
                Trilho e marcador na cor do atacante. O log é a única parte da
                página onde os dois lados se alternam na mesma coluna, e sem uma
                marca de quem está batendo cada linha lê como texto corrido — é
                preciso ler o nome até o fim para saber de quem é o turno.
              */}
              <SideMark side={turn.attacker} />
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
        <>
          <p className="replay-result">
            {battle.winner
              ? `${t("battle.winner")}: ${battle.winner === "a" ? battle.a.name : battle.b.name}`
              : "—"}
            {battle.decidedBy === "hp" ? <em> · {t("battle.draw")}</em> : null}
          </p>
          <BattleRadar a={battle.a} b={battle.b} locale={locale} />
        </>
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
  side,
  card,
  hp,
  prevHp,
  turn,
  won,
  label,
  hpLabel,
}: {
  side: Side;
  card: Card;
  hp: number;
  /** HP antes do último turno tocado — de onde sai o rastro de dano. */
  prevHp: number;
  /** Só para reiniciar a animação do rastro a cada turno. */
  turn: number;
  won: boolean;
  label: string;
  hpLabel: string;
}) {
  const max = Math.max(1, card.hp);
  const ratio = Math.max(0, Math.min(1, hp / max));
  const prevRatio = Math.max(ratio, Math.min(1, prevHp / max));
  const color = SIDE_COLORS[side];

  return (
    <div
      className="fighter-bar"
      data-won={won || undefined}
      style={{ ["--side" as string]: color }}
    >
      <Image
        src={`/${card.id}.png`}
        alt={card.name}
        width={140}
        height={196}
        className="fighter-card-img"
      />
      <div className="fighter-head">
        <SideMark side={side} />
        <TypeIcon element={card.element} size={16} />
        <strong>{card.name}</strong>
        {won ? <span className="fighter-won">{label}</span> : null}
      </div>
      <div className="fighter-hp">
        <span>{hp}</span>
        <i>/ {card.hp}</i>
        <small>{hpLabel}</small>
      </div>
      {/*
        Medidor: trilho num passo mais claro da própria cor do lado, e não no
        cinza da borda. Com o trilho neutro, "quase morto" e "quase inteiro"
        diferem só no comprimento de uma listra; com o trilho tingido, a barra
        inteira pertence ao lado e o estado se lê de ponta a ponta.
      */}
      <div
        className="fighter-track"
        role="meter"
        aria-valuenow={hp}
        aria-valuemin={0}
        aria-valuemax={card.hp}
        aria-label={`${card.name} — ${hpLabel}`}
      >
        {/* Só existe quando há pedaço perdido para mostrar: no turno em que este
            lado não apanhou, um rastro de largura zero seria uma animação a
            cada 850ms sem nada acontecendo. */}
        {prevRatio > ratio ? (
          <div
            key={turn}
            className="fighter-ghost"
            style={{ width: `${prevRatio * 100}%` }}
          />
        ) : null}
        <div className="fighter-fill" style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}
