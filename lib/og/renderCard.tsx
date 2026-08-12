import { ImageResponse } from "next/og";
import { ELEMENT_COLORS } from "../cards/elements";
import { formatCount } from "../cards/format";
import layout from "../cards/layout.json";
import {
  cardTreatment,
  hasFoil,
  raritySymbol,
  raritySymbolColor,
  raritySymbolSize,
} from "../cards/rarity";
import type { Attack, Card } from "../cards/types";
import { elementKey, rarityKey, translator, type Locale } from "../i18n/dictionaries";
import {
  CARD_FONT,
  avatarUri,
  energyUri,
  foilUri,
  frameUri,
  loadFonts,
  metalUri,
  retreatUri,
} from "./assets";

/**
 * Composição da imagem final: Satori por cima da arte estática (RFC 4.2/4.3).
 *
 * A moldura já resolveu textura, gradiente e recorte da janela — aqui só entram
 * texto e ícones, posicionados pelos números de `layout.json`. É o que permite
 * rodar em serverless sem browser headless.
 */

const HP_RED = "#C0392B";
/** Mesmo vermelho clareado, para sobreviver ao scrim escuro do full-art. */
const HP_RED_ON_ART = "#FF7A66";

export async function renderCard(card: Card, locale: Locale): Promise<ImageResponse> {
  const t = translator(locale);
  const colors = ELEMENT_COLORS[card.element];

  const treatment = cardTreatment(card.rarity);
  const art = treatment.fullArt ? layout.fullArt.art : layout.art;
  const artWindow = treatment.fullArt ? layout.fullArt.window : layout.window;

  const [fonts, frame, avatar, energy, retreat, foil, metal, weaknessIcon, resistanceIcon] =
    await Promise.all([
      loadFonts(),
      frameUri(card.element, treatment.fullArt),
      avatarUri(card.artUrl, art.width),
      energyUri(card.element),
      retreatUri(),
      hasFoil(card.rarity) ? foilUri(card.rarity) : Promise.resolve(null),
      treatment.metal ? metalUri(treatment.metal) : Promise.resolve(null),
      card.weakness ? energyUri(card.weakness) : Promise.resolve(null),
      card.resistance ? energyUri(card.resistance) : Promise.resolve(null),
    ]);

  const primaryStat = card.stats[0];

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          display: "flex",
          width: layout.width,
          height: layout.height,
          fontFamily: CARD_FONT,
          color: colors.ink,
        }}
      >
        {/* A arte entra primeiro e a moldura por cima: é a moldura que recorta. */}
        {avatar ? (
          <img
            src={avatar}
            width={art.width}
            height={art.width}
            style={{
              position: "absolute",
              left: art.centerX - art.width / 2,
              top: art.centerY - art.width / 2,
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              left: artWindow.x,
              top: artWindow.y,
              width: artWindow.width,
              height: artWindow.height,
              background: colors.dark,
            }}
          />
        )}

        <img
          src={frame}
          width={layout.width}
          height={layout.height}
          style={{ position: "absolute", left: 0, top: 0 }}
        />

        {foil ? (
          <img
            src={foil}
            width={layout.width}
            height={layout.height}
            style={{ position: "absolute", left: 0, top: 0 }}
          />
        ) : null}

        {/*
          Metal por cima do foil, não por baixo: o folheado é a superfície mais
          externa da carta, e o brilho holográfico vem de dentro dela.
        */}
        {metal ? (
          <img
            src={metal}
            width={layout.width}
            height={layout.height}
            style={{ position: "absolute", left: 0, top: 0 }}
          />
        ) : null}

        {/* Nome */}
        <div
          style={{
            position: "absolute",
            left: layout.name.x,
            top: layout.name.top,
            height: layout.name.boxHeight,
            maxWidth: layout.name.maxWidth,
            display: "flex",
            alignItems: "center",
            fontSize: nameSize(card.name),
            fontWeight: 900,
            letterSpacing: -0.5,
            whiteSpace: "nowrap",
            overflow: "hidden",
            // No full-art o nome se apoia no scrim escuro, não na faixa clara.
            ...(treatment.fullArt ? { color: "#FFFFFF" } : {}),
          }}
        >
          {card.name}
        </div>

        {/* HP, vermelho e alinhado à direita (RFC 4.4, item 4) */}
        <div
          style={{
            position: "absolute",
            right: layout.hp.right,
            top: layout.hp.top,
            height: layout.hp.boxHeight,
            display: "flex",
            alignItems: "center",
            gap: 4,
            // O vermelho de contraste com face clara some sobre o scrim.
            color: treatment.fullArt ? HP_RED_ON_ART : HP_RED,
          }}
        >
          <span style={{ fontSize: layout.hp.labelSize, fontWeight: 700, paddingTop: 8 }}>
            {t("card.hp")}
          </span>
          <span style={{ fontSize: layout.hp.size, fontWeight: 900, letterSpacing: -1 }}>
            {card.hp}
          </span>
        </div>

        {/* Faixa de tipo */}
        <div
          style={{
            position: "absolute",
            left: layout.typeStrip.x,
            top: layout.typeStrip.y,
            width: layout.typeStrip.width,
            height: layout.typeStrip.height,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
            fontSize: layout.typeStrip.size,
            fontWeight: 700,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <img src={energy} width={20} height={20} />
            <span>{t(elementKey(card.element))}</span>
          </div>
          <span style={{ opacity: 0.75 }}>
            {t(card.kind === "profile" ? "card.profile" : "card.repo")}
          </span>
        </div>

        {/* Ataques */}
        {card.attacks.map((attack, index) => (
          <AttackRow
            key={attack.name}
            attack={attack}
            index={index}
            energy={energy}
            ink={colors.ink}
          />
        ))}

        {/* Divisória entre os dois ataques (RFC 4.4, item 6) */}
        {card.attacks.length === 2 ? (
          <div
            style={{
              position: "absolute",
              left: layout.attacks.left + 12,
              top: layout.attacks.top + layout.attacks.boxHeight + layout.attacks.gap / 2,
              width: layout.attacks.right - layout.attacks.left - 24,
              height: 1,
              background: colors.dark,
              opacity: 0.25,
            }}
          />
        ) : null}

        {/* Fraqueza / resistência / recuo (RFC 4.4, item 7) */}
        <div
          style={{
            position: "absolute",
            left: layout.attacks.left,
            top: layout.status.y,
            width: layout.attacks.right - layout.attacks.left,
            height: layout.status.height,
            display: "flex",
          }}
        >
          <StatusCell label={t("card.weakness")}>
            {weaknessIcon ? (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <img src={weaknessIcon} width={layout.status.iconSize} height={layout.status.iconSize} />
                <span style={{ fontSize: layout.status.valueSize, fontWeight: 900 }}>×2</span>
              </div>
            ) : (
              <Dash />
            )}
          </StatusCell>

          <StatusCell label={t("card.resistance")}>
            {resistanceIcon ? (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <img src={resistanceIcon} width={layout.status.iconSize} height={layout.status.iconSize} />
                <span style={{ fontSize: layout.status.valueSize, fontWeight: 900 }}>−30</span>
              </div>
            ) : (
              <Dash />
            )}
          </StatusCell>

          <StatusCell label={t("card.retreat")}>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              {Array.from({ length: card.retreat }, (_, i) => (
                <img key={i} src={retreat} width={layout.status.iconSize - 4} height={layout.status.iconSize - 4} />
              ))}
            </div>
          </StatusCell>
        </div>

        {/* Rodapé: raridade à esquerda, símbolo à direita (RFC 4.4, item 8) */}
        <div
          style={{
            position: "absolute",
            left: layout.footer.left,
            top: layout.footer.top,
            width: layout.footer.right - layout.footer.left,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: layout.footer.size,
            opacity: 0.85,
          }}
        >
          <span style={{ fontWeight: 700 }}>
            {t("card.footer", {
              rarity: t(rarityKey(card.rarity)),
              element: t(elementKey(card.element)),
            })}
          </span>
          {/*
            Serial e símbolo andam juntos no canto direito, como no TCG. O serial
            só aparece quando existe: sem store durável a carta sai sem número
            (ver lib/cards/serial.ts), e um espaço vazio é melhor que um "#----".
          */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {card.serial !== null && (
              <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.7 }}>
                {`#${String(card.serial).padStart(4, "0")}`}
              </span>
            )}
            <span
              style={{
                fontSize: raritySymbolSize(card.rarity),
                fontWeight: 900,
                color: raritySymbolColor(card.rarity),
              }}
            >
              {raritySymbol(card.rarity)}
            </span>
          </div>
        </div>

        {/* Linha factual: bio/descrição truncada + o número que mais importa */}
        <div
          style={{
            position: "absolute",
            left: layout.footer.left,
            top: layout.footer.top + 22,
            width: layout.footer.right - layout.footer.left,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            fontSize: 12,
            opacity: 0.62,
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          <span style={{ overflow: "hidden" }}>{card.footer}</span>
          {primaryStat ? (
            <span style={{ fontWeight: 700 }}>
              ★ {formatCount(Number(primaryStat.value))}
            </span>
          ) : null}
        </div>
      </div>
    ),
    { width: layout.width, height: layout.height, fonts },
  );
}

function AttackRow({
  attack,
  index,
  energy,
  ink,
}: {
  attack: Attack;
  index: number;
  energy: string;
  ink: string;
}) {
  const top = layout.attacks.top + index * (layout.attacks.boxHeight + layout.attacks.gap);

  /*
   * As três colunas são dimensionadas explicitamente, não por flex.
   *
   * O Satori não implementa `min-width: auto`, então `flexGrow: 1` +
   * `overflow: hidden` na coluna do meio não a impedia de crescer até o tamanho
   * do texto: uma descrição longa esticava a linha e empurrava o dano para fora
   * dela. `flexShrink: 0` protegia o dano de encolher, não de ser expulso pelo
   * irmão. Largura fixa remove a ambiguidade — o dano é a informação mais
   * importante da linha e não pode depender do tamanho da descrição.
   */
  const rowInner =
    layout.attacks.right - layout.attacks.left - layout.attacks.rowPadding * 2;
  const textColumnWidth =
    rowInner - layout.attacks.energyColumnWidth - layout.attacks.damageColumnWidth;

  return (
    <div
      style={{
        position: "absolute",
        left: layout.attacks.left,
        top,
        width: layout.attacks.right - layout.attacks.left,
        height: layout.attacks.boxHeight,
        display: "flex",
        alignItems: "center",
        padding: `0 ${layout.attacks.rowPadding}px`,
      }}
    >
      <EnergyCost cost={attack.cost} icon={energy} />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flexShrink: 0,
          width: textColumnWidth,
          overflow: "hidden",
        }}
      >
        <span
          style={{
            fontSize: layout.attacks.nameSize,
            fontWeight: 900,
            whiteSpace: "nowrap",
            overflow: "hidden",
            // `textOverflow` fica declarado por correção, mas o Satori não o
            // implementa: o corte sai seco, sem reticências. Quem garante o
            // "…" é o `truncate` da camada de dados, calibrado para caber
            // nesta largura. Ver `attacksFromRepos` em lib/cards/profile.ts.
            textOverflow: "ellipsis",
            width: textColumnWidth,
          }}
        >
          {attack.name}
        </span>
        {attack.text ? (
          <span
            style={{
              fontSize: layout.attacks.textSize,
              opacity: 0.68,
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            {attack.text}
          </span>
        ) : null}
      </div>

      <div
        style={{
          flexShrink: 0,
          width: layout.attacks.damageColumnWidth,
          display: "flex",
          justifyContent: "flex-end",
          fontSize: layout.attacks.damageSize,
          fontWeight: 900,
          color: ink,
        }}
      >
        {attack.damage}
      </div>
    </div>
  );
}

/**
 * Arranjo geométrico do custo de energia (RFC 4.4, item 5): 1 centralizado,
 * 2 lado a lado, 3 em triângulo, 4 em quadrado. Cada linha é uma fileira de
 * ícones, então o triângulo sai de [1, 2] e o quadrado de [2, 2].
 */
const COST_ROWS: Record<number, number[]> = {
  1: [1],
  2: [2],
  3: [1, 2],
  4: [2, 2],
};

function EnergyCost({ cost, icon }: { cost: number; icon: string }) {
  const rows = COST_ROWS[Math.min(Math.max(cost, 1), 4)];
  const size = rows.length > 1 ? layout.attacks.energySize - 7 : layout.attacks.energySize;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        flexShrink: 0,
        width: layout.attacks.energyColumnWidth,
      }}
    >
      {rows.map((count, rowIndex) => (
        <div key={rowIndex} style={{ display: "flex", gap: 2 }}>
          {Array.from({ length: count }, (_, i) => (
            <img key={i} src={icon} width={size} height={size} />
          ))}
        </div>
      ))}
    </div>
  );
}

function StatusCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flexGrow: 1,
        flexBasis: 0,
        gap: 1,
      }}
    >
      <span
        style={{
          fontSize: layout.status.labelSize,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          opacity: 0.6,
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function Dash() {
  return <span style={{ fontSize: layout.status.valueSize, fontWeight: 700, opacity: 0.5 }}>—</span>;
}

/** Nome longo encolhe em vez de vazar por baixo do HP. */
function nameSize(name: string): number {
  if (name.length <= 14) return layout.name.size;
  if (name.length <= 20) return layout.name.size - 5;
  return layout.name.size - 9;
}

export { layout as cardLayout };
