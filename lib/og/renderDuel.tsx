import { ImageResponse } from "next/og";
import type { Card } from "../cards/types";
import { ELEMENT_COLORS } from "../cards/elements";
import type { DuelMonster, DuelResult } from "../duel/types";
import { positionLabel } from "../duel/narration";
import { monsterStats, STARTING_LP } from "../duel/engine";
import { elementKey, translator, type Locale } from "../i18n/dictionaries";
import { CARD_FONT, avatarUri, energyUri, loadFonts } from "./assets";

/**
 * Pôster do resultado do duelo (mesma política do pôster de batalha, RFC 7.4).
 *
 * É só o placar final: LP, posição final dos Gitmons e ATK/DEF. Sem log, sem
 * animação — o que viaja para fora do site é estático. 1200×630, a proporção das
 * prévias de link.
 */

const WIDTH = 1200;
const HEIGHT = 630;
const PANEL_WIDTH = 470;

export async function renderDuel(
  duel: DuelResult,
  locale: Locale,
): Promise<ImageResponse> {
  const t = translator(locale);

  const [fonts, avatarA, avatarB, energyA, energyB] = await Promise.all([
    loadFonts(),
    avatarUri(duel.a.artUrl),
    avatarUri(duel.b.artUrl),
    energyUri(duel.a.element),
    energyUri(duel.b.element),
  ]);

  const last = duel.turns[duel.turns.length - 1];
  const monsterA = last.monstersAfter.a;
  const monsterB = last.monstersAfter.b;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: WIDTH,
          height: HEIGHT,
          background: "#0D0F14",
          fontFamily: CARD_FONT,
          color: "#E8EAEE",
          padding: 40,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: "#5F6775",
          }}
        >
          <span>Gitmon Cards</span>
          <span>{duel.decidedBy === "knockout" ? t("duel.knockout") : t("duel.draw")}</span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexGrow: 1,
          }}
        >
          <Fighter
            card={duel.a}
            avatar={avatarA}
            energy={energyA}
            monster={monsterA}
            lp={duel.lp.a}
            won={duel.winner === "a"}
            label={duel.winner === "a" ? t("duel.winner") : null}
            element={t(elementKey(duel.a.element))}
            t={t}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              width: WIDTH - PANEL_WIDTH * 2 - 80,
            }}
          >
            <span style={{ fontSize: 52, fontWeight: 900, color: "#39414F" }}>VS</span>
            <span style={{ fontSize: 16, color: "#5F6775", fontWeight: 700 }}>
              {duel.turns.length} {duel.turns.length === 1 ? "turn" : "turns"}
            </span>
          </div>

          <Fighter
            card={duel.b}
            avatar={avatarB}
            energy={energyB}
            monster={monsterB}
            lp={duel.lp.b}
            won={duel.winner === "b"}
            label={duel.winner === "b" ? t("duel.winner") : null}
            element={t(elementKey(duel.b.element))}
            t={t}
          />
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT, fonts },
  );
}

function Fighter({
  card,
  avatar,
  energy,
  monster,
  lp,
  won,
  label,
  element,
  t,
}: {
  card: Card;
  avatar: string | null;
  energy: string;
  monster: DuelMonster;
  lp: number;
  won: boolean;
  label: string | null;
  element: string;
  t: ReturnType<typeof translator>;
}) {
  const colors = ELEMENT_COLORS[card.element];
  const stats = monsterStats(card);
  const ratio = Math.max(0, Math.min(1, lp / STARTING_LP));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
        width: PANEL_WIDTH,
        padding: "26px 24px",
        borderRadius: 20,
        background: won ? "#161A22" : "#11141B",
        border: `2px solid ${won ? colors.base : "#262C38"}`,
        opacity: monster.destroyed && !won ? 0.5 : won ? 1 : 0.62,
      }}
    >
      <span
        style={{
          fontSize: 14,
          fontWeight: 900,
          letterSpacing: 3,
          textTransform: "uppercase",
          color: monster.destroyed && !won ? "#C0392B" : colors.base,
        }}
      >
        {monster.destroyed && !won ? "DESTRUÍDO" : label ?? ""}
      </span>

      {avatar ? (
        <img src={avatar} width={150} height={150} style={{ borderRadius: 18 }} />
      ) : (
        <div style={{ width: 150, height: 150, borderRadius: 18, background: colors.dark }} />
      )}

      <span
        style={{
          fontSize: card.name.length > 16 ? 26 : 32,
          fontWeight: 900,
          maxWidth: PANEL_WIDTH - 48,
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
      >
        {card.name}
      </span>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 17,
          color: "#949CAB",
        }}
      >
        <img src={energy} width={22} height={22} />
        <span style={{ fontWeight: 700 }}>{element}</span>
        <span style={{ marginLeft: 8, color: "#5F6775", fontSize: 14, fontWeight: 800 }}>
          {positionLabel(t, monster.position)}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: 6 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 20,
            fontWeight: 900,
          }}
        >
          <span style={{ color: lp > 0 ? "#E8EAEE" : "#C0392B" }}>{lp}</span>
          <span style={{ color: "#5F6775" }}>/ {STARTING_LP}</span>
        </div>
        <div
          style={{
            display: "flex",
            width: "100%",
            height: 10,
            borderRadius: 5,
            background: "#262C38",
          }}
        >
          <div
            style={{
              width: `${Math.round(ratio * 100)}%`,
              height: 10,
              borderRadius: 5,
              background: colors.base,
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 24,
          fontSize: 18,
          fontWeight: 900,
          color: "#E8EAEE",
        }}
      >
        <span>
          ATK <span style={{ color: "#949CAB", fontWeight: 700 }}>{stats.atk}</span>
        </span>
        <span>
          DEF <span style={{ color: "#949CAB", fontWeight: 700 }}>{stats.def}</span>
        </span>
      </div>
    </div>
  );
}
