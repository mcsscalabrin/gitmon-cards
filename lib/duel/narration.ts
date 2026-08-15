import type { Card } from "../cards/types";
import { translator } from "../i18n/dictionaries";
import type { DuelTurn, Position } from "./types";

/**
 * Textos do duelo compartilhados entre o tabuleiro (DuelBoard) e o replay
 * (DuelReplay): as duas telas narram o mesmo turno da mesma forma, sem drift.
 */

export type NarrationT = ReturnType<typeof translator>;

export function positionLabel(
  t: NarrationT,
  position: Position,
): string {
  return position === "attack"
    ? t("duel.positionAttack")
    : position === "defense"
      ? t("duel.positionDefense")
      : t("duel.positionFaceDown");
}

/** Narração de um turno: "X usa golpe · 130 de dano · super efetivo". */
export function narrationFor(
  turn: DuelTurn,
  a: Card,
  b: Card,
  t: NarrationT,
): string {
  const attacker = turn.actor === "a" ? a : b;

  if (turn.action.kind === "position") {
    return t("duel.position", {
      name: attacker.name,
      position: positionLabel(t, turn.action.to),
    });
  }
  if (turn.action.kind === "pass") return t("duel.passed", { name: attacker.name });

  const strike = turn.strike;
  if (!strike) return "";

  const lead = strike.attack
    ? t("duel.uses", { attacker: attacker.name, attack: strike.attack })
    : t("duel.attacks", { attacker: attacker.name });
  const bits: string[] = [t("duel.damage", { damage: strike.damage })];
  if (strike.direct) bits.push(t("duel.direct"));
  if (strike.multiplier === 2) bits.push(t("duel.superEffective"));
  else if (strike.multiplier === 0.5) bits.push(t("duel.resisted"));
  if (strike.destroyed === "a") bits.push(t("duel.destroyed", { name: a.name }));
  else if (strike.destroyed === "b") bits.push(t("duel.destroyed", { name: b.name }));
  else if (strike.destroyed === "both") bits.push(t("duel.bothDestroyed"));
  return [lead, ...bits].join(" · ");
}
