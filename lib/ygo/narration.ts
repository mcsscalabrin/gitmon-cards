import { translator } from "../i18n/dictionaries";
import type { Side, YgoLogStep } from "./types";

/**
 * Textos do Speed Duel compartilhados entre o tabuleiro (YgoBoard) e o replay
 * (YgoReplay): as duas telas narram o mesmo passo da mesma forma, sem drift.
 */

export type YgoNarrationT = ReturnType<typeof translator>;

/** Rótulo do lado: o visitante é sempre o lado A. */
export function sideLabel(t: YgoNarrationT, side: Side, players: { a: string; b: string }): string {
  return side === "a" ? (players.a || t("ygo.you")) : players.b;
}

/** Narração de um passo do log: "Turno 3 · X ataca · 500 de dano". */
export function narrationFor(step: YgoLogStep, t: YgoNarrationT, players: { a: string; b: string }): string {
  const player = sideLabel(t, step.actor, players);
  const action = step.action;

  if (action === "start") return t("ygo.startTurn", { player });
  if (action.kind === "pass") return t("ygo.passed", { player });
  if (action.kind === "summon") return t("ygo.summoned", { player, card: step.cardName ?? "" });
  if (action.kind === "spell") return t("ygo.usedSpell", { player, card: step.cardName ?? "" });
  if (action.kind === "setTrap") return t("ygo.setTrapNarr", { player, card: step.cardName ?? "" });
  if (action.kind === "trap") return t("ygo.activatedTrap", { player, card: step.cardName ?? "" });
  if (action.kind === "flip") return t("ygo.flipped", { player, card: step.cardName ?? "" });

  const strike = step.strike;
  const lead = t("ygo.attacks", { attacker: player });
  if (!strike) return lead;

  const bits: string[] = [];
  if (strike.damage > 0) bits.push(t("ygo.damage", { damage: strike.damage }));
  if (strike.targetZone === null) bits.push(t("ygo.direct"));
  if (strike.destroyed === "defender") bits.push(t("ygo.destroyed", { name: strike.targetName ?? "" }).trim());
  else if (strike.destroyed === "attacker") bits.push(t("ygo.destroyed", { name: strike.attackerName ?? "" }).trim());
  else if (strike.destroyed === "both") bits.push(t("ygo.bothDestroyed"));
  return [lead, ...bits].join(" · ");
}
