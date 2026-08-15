import { ImageResponse } from "next/og";
import { STARTING_LP } from "../ygo/engine";
import type { YgoCard, YgoResult, Side } from "../ygo/types";
import { translator, type Locale } from "../i18n/dictionaries";
import { CARD_FONT, avatarUri, loadFonts } from "./assets";

/**
 * Pôster do resultado do Speed Duel (mesma política do pôster de duelo, RFC
 * 7.4): só o placar final — rótulos, LP, e o monstro representante de cada lado.
 * Sem log e sem animação. 1200×630, a proporção das prévias de link.
 */

const WIDTH = 1200;
const HEIGHT = 630;
const PANEL_WIDTH = 470;

export async function renderYgo(result: YgoResult, locale: Locale): Promise<ImageResponse> {
  const t = translator(locale);

  const last = result.log[result.log.length - 1];
  const lp = last.lp;
  const turns = last.turn;
  const cardA = representativeMonster(result.a);
  const cardB = representativeMonster(result.b);

  const [fonts, avatarA, avatarB] = await Promise.all([
    loadFonts(),
    cardA ? avatarUri(cardA.artUrl) : Promise.resolve(null),
    cardB ? avatarUri(cardB.artUrl) : Promise.resolve(null),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: WIDTH,
          height: HEIGHT,
          background:
            "radial-gradient(circle at 18% 0%, #13202E 0%, transparent 46%), radial-gradient(circle at 82% 100%, #2E1B13 0%, transparent 46%), #0D0F14",
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
          <span>Gitmon Cards · Speed Duel</span>
          <span>{t(`ygo.${result.decidedBy}`)}</span>
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
            side="a"
            label={result.players.a}
            card={cardA}
            avatar={avatarA}
            lp={lp.a}
            won={result.winner === "a"}
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
              {turns} {turns === 1 ? "turn" : "turns"}
            </span>
          </div>

          <Fighter
            side="b"
            label={result.players.b}
            card={cardB}
            avatar={avatarB}
            lp={lp.b}
            won={result.winner === "b"}
            t={t}
          />
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT, fonts },
  );
}

/** Primeiro monstro do deck — a cara do lado no pôster. */
function representativeMonster(deck: YgoCard[]): YgoCard | undefined {
  return deck.find((card) => card.kind === "monster");
}

function Fighter({
  side,
  label,
  card,
  avatar,
  lp,
  won,
  t,
}: {
  side: Side;
  label: string;
  card: YgoCard | undefined;
  avatar: string | null;
  lp: number;
  won: boolean;
  t: ReturnType<typeof translator>;
}) {
  const color = side === "a" ? "#3A8AD8" : "#D96E2C";
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
        border: `2px solid ${won ? color : "#262C38"}`,
        opacity: won ? 1 : 0.62,
      }}
    >
      <span
        style={{
          fontSize: 14,
          fontWeight: 900,
          letterSpacing: 3,
          textTransform: "uppercase",
          color: won ? color : "#5F6775",
        }}
      >
        {won ? t("ygo.winner") : ""}
      </span>

      {avatar ? (
        <img src={avatar} width={150} height={150} style={{ borderRadius: 18 }} />
      ) : (
        <div style={{ width: 150, height: 150, borderRadius: 18, background: "#262C38" }} />
      )}

      <span
        style={{
          fontSize: (label?.length ?? 0) > 16 ? 24 : 28,
          fontWeight: 900,
          maxWidth: PANEL_WIDTH - 48,
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
      >
        {label}
      </span>

      <span
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: "#5F6775",
          maxWidth: PANEL_WIDTH - 48,
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
      >
        {card ? `${card.name} · ATK ${card.atk ?? 0} / DEF ${card.def ?? 0}` : ""}
      </span>

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
              background: color,
            }}
          />
        </div>
      </div>
    </div>
  );
}
