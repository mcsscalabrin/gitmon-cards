import { ImageResponse } from "next/og";
import { ELEMENT_COLORS } from "../cards/elements";
import { formatCount } from "../cards/format";
import { raritySymbol, raritySymbolColor } from "../cards/rarity";
import { tagForAxis } from "../cards/tag";
import type { Card } from "../cards/types";
import { elementKey, rarityKey, translator, type Locale } from "../i18n/dictionaries";
import { CARD_FONT, energyUri, loadFonts } from "./assets";
import { renderCard } from "./renderCard";

/**
 * Prévia de link da página da carta.
 *
 * Existe porque a carta é **retrato** e as prévias de link são paisagem. O
 * `openGraph.images` apontava direto para o `/<id>.png` de 500×700, e o que o X e
 * o LinkedIn fazem com uma imagem 5:7 num slot 1.91:1 é cortar pelo centro — some
 * o nome e o HP em cima, some o rodapé com o serial embaixo. A carta chegava ao
 * lugar de maior alcance decapitada, que é o oposto do que a fase de
 * compartilhamento existe para resolver.
 *
 * 1200×630 pelo mesmo motivo declarado no pôster de batalha: é a proporção que as
 * prévias esperam. E o fundo escuro é o mesmo dele — as duas imagens que saem
 * deste produto para o feed pertencem à mesma família.
 *
 * **A carta aqui dentro é o PNG real**, renderizado por `renderCard` e embutido
 * como data URI, não uma segunda composição em Satori com as mesmas medidas
 * copiadas. A RFC 4.2 registra que manter duas versões da carta sincronizadas por
 * cópia de porcentagens é o custo que o gitfut paga; o projeto só tem uma carta
 * justamente para não pagá-lo, e reimplementá-la aqui reintroduziria o problema
 * pela porta dos fundos. O preço é um segundo passe de Satori por requisição, que
 * o cache de uma hora da rota dilui.
 *
 * A imagem da carta continua limpa: a marca fica no painel em volta, como no
 * pôster de batalha. O que a RFC 9.6 proíbe é patrocinador na carta exportada.
 */

const WIDTH = 1200;
const HEIGHT = 630;
const PAD = 56;

/** A carta ocupa a altura útil inteira; a largura sai da proporção 5:7. */
const CARD_HEIGHT = HEIGHT - PAD * 2;
const CARD_WIDTH = Math.round((CARD_HEIGHT * 500) / 700);

const TEXT_WIDTH = WIDTH - PAD * 2 - CARD_WIDTH - 48;

export async function renderCardOg(card: Card, locale: Locale): Promise<ImageResponse> {
  const t = translator(locale);
  const colors = ELEMENT_COLORS[card.element];

  const [fonts, cardImage, energy] = await Promise.all([
    loadFonts(),
    cardDataUri(card, locale),
    energyUri(card.element),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: WIDTH,
          height: HEIGHT,
          padding: PAD,
          gap: 48,
          background: "#0D0F14",
          // A auréola do tipo, que a página da carta já usa atrás dela. Aqui ela
          // faz o trabalho que no site é do painel inteiro: dizer o elemento
          // antes de qualquer palavra ser lida.
          backgroundImage: `radial-gradient(circle at 24% 52%, ${rgba(colors.base, 0.3)} 0%, ${rgba(colors.base, 0)} 58%)`,
          fontFamily: CARD_FONT,
          color: "#E8EAEE",
        }}
      >
        <img src={cardImage} width={CARD_WIDTH} height={CARD_HEIGHT} />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            width: TEXT_WIDTH,
            gap: 18,
          }}
        >
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#5F6775",
            }}
          >
            Gitmon Cards
          </span>

          {/*
            Nome + tag, na mesma gramática do cabeçalho da carta: a tag pendurada
            no nome pela linha de base, corpo pequeno, tinta recuada. A prévia é
            a primeira coisa que muita gente vê do produto, e ela não pode falar
            uma língua diferente da carta que exibe ao lado.
          */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span
              style={{
                fontSize: nameSize(card.name),
                fontWeight: 900,
                letterSpacing: -1.5,
                lineHeight: 1.05,
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
            >
              {card.name}
            </span>
            <span
              style={{
                fontSize: 22,
                fontWeight: 900,
                letterSpacing: 2,
                color: "#5F6775",
                whiteSpace: "nowrap",
              }}
            >
              {tagForAxis(card.axis)}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 24 }}>
            <img src={energy} width={30} height={30} />
            <span style={{ fontWeight: 700 }}>{t(elementKey(card.element))}</span>
            <span style={{ color: "#39414F" }}>·</span>
            <span style={{ fontWeight: 700, color: raritySymbolColor(card.rarity) }}>
              {raritySymbol(card.rarity)}
            </span>
            <span style={{ color: "#949CAB" }}>{t(rarityKey(card.rarity))}</span>
          </div>

          {/*
            Os números crus. Na carta eles viram HP e dano; aqui aparecem como
            são, porque a prévia é lida por quem ainda não abriu a página e
            precisa saber de onde a carta veio.
          */}
          <div style={{ display: "flex", gap: 40, marginTop: 6 }}>
            <Stat label={t("card.hp")} value={String(card.hp)} accent={colors.base} />
            {card.stats.slice(0, 2).map((stat) => (
              <Stat
                key={stat.labelKey}
                label={t(stat.labelKey as Parameters<typeof t>[0])}
                value={
                  typeof stat.value === "number" ? formatCount(stat.value) : String(stat.value)
                }
                accent="#E8EAEE"
              />
            ))}
          </div>

          {card.footer ? (
            <span
              style={{
                fontSize: 19,
                color: "#5F6775",
                whiteSpace: "nowrap",
                overflow: "hidden",
                width: TEXT_WIDTH,
              }}
            >
              {card.footer}
            </span>
          ) : null}
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT, fonts },
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span
        style={{
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: 1.4,
          textTransform: "uppercase",
          color: "#5F6775",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 34, fontWeight: 900, color: accent }}>{value}</span>
    </div>
  );
}

/**
 * A carta de verdade, em base64.
 *
 * Renderizar duas vezes é o custo aceito para nunca haver duas versões da carta.
 * Ver o comentário do topo.
 */
async function cardDataUri(card: Card, locale: Locale): Promise<string> {
  const image = await renderCard(card, locale);
  const buffer = Buffer.from(await image.arrayBuffer());
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

/** Nome longo encolhe em vez de vazar da coluna. */
function nameSize(name: string): number {
  if (name.length <= 12) return 64;
  if (name.length <= 18) return 52;
  if (name.length <= 26) return 40;
  return 32;
}

/**
 * O Satori lê `rgba()` em gradiente sem hesitar; hex de 8 dígitos é onde os
 * parsers de CSS divergem, e um gradiente que não parseia vira fundo chapado —
 * falha silenciosa, do tipo que só aparece olhando a imagem.
 */
function rgba(hex: string, alpha: number): string {
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
