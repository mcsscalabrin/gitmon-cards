import { ImageResponse } from "next/og";
import type { BattleResult } from "../battle/types";
import { ELEMENT_COLORS } from "../cards/elements";
import { raritySymbol, raritySymbolColor } from "../cards/rarity";
import { tagForAxis } from "../cards/tag";
import type { Card } from "../cards/types";
import { elementKey, rarityKey, translator, type Locale } from "../i18n/dictionaries";
import { CARD_FONT, avatarUri, energyUri, loadFonts } from "./assets";

/**
 * Pôster do resultado da batalha (RFC 7.4).
 *
 * É só o placar final: sem animação, sem log de turnos. Mesma regra de "imagem
 * limpa" das cartas individuais — o que viaja para fora do site é estático.
 *
 * 1200×630 porque esta imagem existe para ser compartilhada, e é a proporção que
 * as prévias de link esperam.
 *
 * **O pôster carrega raridade e tag** (fecha o gap 3.1). Antes não referenciava
 * `rarity`, `serial`, `hasFoil` nem `cardTreatment`, e as duas superfícies de
 * imagem do produto divergiam: a carta mostrava tier, símbolo, foil, metal e
 * serial, e o pôster, nada disso. Podia ser certo — batalha é sobre HP e dano,
 * não sobre colecionar — mas era divergência que ninguém decidiu de propósito.
 *
 * O que entrou é só identidade, não a escada visual inteira: símbolo de raridade
 * com a cor do metal e a tag ao lado do nome. Foil, moldura e textura ficam de
 * fora porque aqui não há carta — há um painel de placar, e importar o
 * tratamento de superfície para dentro dele faria o pôster competir com a carta
 * em vez de apontar para ela.
 */

const WIDTH = 1200;
const HEIGHT = 630;
const PANEL_WIDTH = 470;

export async function renderBattle(
  battle: BattleResult,
  locale: Locale,
): Promise<ImageResponse> {
  const t = translator(locale);

  const [fonts, avatarA, avatarB, energyA, energyB] = await Promise.all([
    loadFonts(),
    avatarUri(battle.a.artUrl),
    avatarUri(battle.b.artUrl),
    energyUri(battle.a.element),
    energyUri(battle.b.element),
  ]);

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
          <span>{battle.decidedBy === "knockout" ? "KO" : t("battle.draw")}</span>
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
            card={battle.a}
            avatar={avatarA}
            energy={energyA}
            hp={battle.finalHp.a}
            won={battle.winner === "a"}
            label={battle.winner === "a" ? t("battle.winner") : null}
            element={t(elementKey(battle.a.element))}
            rarity={t(rarityKey(battle.a.rarity))}
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
              {battle.turns.length} {battle.turns.length === 1 ? "turn" : "turns"}
            </span>
          </div>

          <Fighter
            card={battle.b}
            avatar={avatarB}
            energy={energyB}
            hp={battle.finalHp.b}
            won={battle.winner === "b"}
            label={battle.winner === "b" ? t("battle.winner") : null}
            element={t(elementKey(battle.b.element))}
            rarity={t(rarityKey(battle.b.rarity))}
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
  hp,
  won,
  label,
  element,
  rarity,
}: {
  card: Card;
  avatar: string | null;
  energy: string;
  hp: number;
  won: boolean;
  label: string | null;
  element: string;
  rarity: string;
}) {
  const colors = ELEMENT_COLORS[card.element];
  const ratio = Math.max(0, Math.min(1, hp / Math.max(1, card.hp)));

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
        // O vencedor não é indicado só por texto: quem olha a miniatura precisa
        // ler o resultado antes de ler qualquer palavra.
        opacity: won ? 1 : 0.62,
      }}
    >
      {label ? (
        <span
          style={{
            fontSize: 14,
            fontWeight: 900,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: colors.base,
          }}
        >
          {label}
        </span>
      ) : (
        <span style={{ fontSize: 14, height: 21 }} />
      )}

      {avatar ? (
        <img src={avatar} width={150} height={150} style={{ borderRadius: 18 }} />
      ) : (
        <div style={{ width: 150, height: 150, borderRadius: 18, background: colors.dark }} />
      )}

      {/* Nome + tag, na gramática do cabeçalho da carta: sufixo pendurado na
          linha de base, corpo pequeno, tinta recuada. */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 9,
          maxWidth: PANEL_WIDTH - 48,
        }}
      >
        <span
          style={{
            fontSize: card.name.length > 16 ? 26 : 32,
            fontWeight: 900,
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          {card.name}
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 900,
            letterSpacing: 1.4,
            color: "#5F6775",
            whiteSpace: "nowrap",
          }}
        >
          {tagForAxis(card.axis)}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 17, color: "#949CAB" }}>
        <img src={energy} width={22} height={22} />
        <span style={{ fontWeight: 700 }}>{element}</span>
        <span style={{ color: "#39414F" }}>·</span>
        {/* O símbolo carrega o metal do tier, como no rodapé da carta. */}
        <span style={{ fontWeight: 900, color: raritySymbolColor(card.rarity) }}>
          {raritySymbol(card.rarity)}
        </span>
        <span style={{ fontWeight: 700 }}>{rarity}</span>
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
          <span style={{ color: hp > 0 ? "#E8EAEE" : "#C0392B" }}>{hp}</span>
          <span style={{ color: "#5F6775" }}>/ {card.hp}</span>
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
    </div>
  );
}
