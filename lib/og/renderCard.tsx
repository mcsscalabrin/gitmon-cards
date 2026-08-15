import { ImageResponse } from "next/og";
import { ELEMENT_COLORS } from "../cards/elements";
import { formatCount } from "../cards/format";
import layout from "../cards/layout.json";
import {
  cardTreatment,
  foilIntensity,
  hasFoil,
  hasTexture,
  raritySymbol,
  raritySymbolColor,
  raritySymbolSize,
} from "../cards/rarity";
import { patternForAxis, tagForAxis } from "../cards/tag";
import type { Attack, Card, Rarity } from "../cards/types";
import { elementKey, rarityKey, translator, type Locale } from "../i18n/dictionaries";
import {
  CARD_FONT,
  avatarUri,
  edgeUri,
  energyUri,
  foilUri,
  frameUri,
  loadFonts,
  metalUri,
  patternUri,
  retreatUri,
  textureUri,
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
/**
 * Tinta do corpo no full-art. Não é branco puro: sobre um scrim que fecha em
 * 0.95 e não em 1, branco puro vibra na borda das letras de 12px. Um branco
 * levemente quebrado assenta.
 */
const INK_ON_ART = "#F4F1EC";

export async function renderCard(card: Card, locale: Locale): Promise<ImageResponse> {
  const t = translator(locale);
  const colors = ELEMENT_COLORS[card.element];

  const treatment = cardTreatment(card.rarity);
  const art = treatment.fullArt ? layout.fullArt.art : layout.art;
  const artWindow = treatment.fullArt ? layout.fullArt.window : layout.window;

  const [
    fonts,
    frame,
    avatar,
    energy,
    retreat,
    foil,
    pattern,
    texture,
    edge,
    metal,
    weaknessIcon,
    resistanceIcon,
  ] = await Promise.all([
      loadFonts(),
      frameUri(card.element, treatment.fullArt),
      avatarUri(card.artUrl, art.width),
      energyUri(card.element),
      retreatUri(),
      hasFoil(card.rarity) ? foilUri(card.rarity, treatment.fullArt) : Promise.resolve(null),
      // O padrão acompanha o foil: onde não há foil, não há o que padronizar.
      hasFoil(card.rarity)
        ? patternUri(patternForAxis(card.axis), treatment.fullArt)
        : Promise.resolve(null),
      hasTexture(card.rarity)
        ? textureUri(card.rarity, treatment.fullArt)
        : Promise.resolve(null),
      treatment.edge ? edgeUri(treatment.edge) : Promise.resolve(null),
      treatment.metal ? metalUri(treatment.metal, treatment.fullArt) : Promise.resolve(null),
      card.weakness ? energyUri(card.weakness) : Promise.resolve(null),
      card.resistance ? energyUri(card.resistance) : Promise.resolve(null),
    ]);

  /*
   * No full-art a face inteira é arte, então tudo abaixo do cabeçalho passa a se
   * apoiar no scrim escuro em vez de numa face clara. A tinta do texto inverte
   * junto — é a mesma correção que o nome e o `HP_RED_ON_ART` já faziam em cima,
   * agora estendida ao resto da carta.
   */
  const onArt = treatment.fullArt;
  const bodyInk = onArt ? INK_ON_ART : colors.ink;

  const primaryStat = card.stats[0];

  const rarityLabel = t("card.footer", {
    rarity: t(rarityKey(card.rarity)),
    element: t(elementKey(card.element)),
  });

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

        {/*
          Borda antes do foil: ela é relevo da própria moldura, e o brilho
          holográfico passa por cima dela como passa por cima do resto da carta.
          Nunca coexiste com o metal — ver `cardTreatment`.
        */}
        {edge ? (
          <img
            src={edge}
            width={layout.width}
            height={layout.height}
            style={{ position: "absolute", left: 0, top: 0 }}
          />
        ) : null}

        {foil ? (
          <img
            src={foil}
            width={layout.width}
            height={layout.height}
            style={{ position: "absolute", left: 0, top: 0 }}
          />
        ) : null}

        {/*
          Padrão por cima do foil, e com a força do tier aplicada aqui em vez de
          assada no arquivo.

          É o que sustenta a arquitetura de cinco arquivos: a geometria vem do
          eixo, a intensidade vem da raridade, e as duas só se encontram neste
          ponto. Assar a combinação daria 60 PNGs para descrever cinco desenhos.
          O `opacity` do Satori foi medido antes de valer a decisão — ele é
          linear e exato.
        */}
        {pattern ? (
          <img
            src={pattern}
            width={layout.width}
            height={layout.height}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              opacity: foilIntensity(card.rarity),
            }}
          />
        ) : null}

        {/*
          Textura gravada, só nos três tiers do topo. Vem depois do padrão: o
          relevo é da superfície da carta, e o padrão vive dentro do foil, abaixo
          dela.
        */}
        {texture ? (
          <img
            src={texture}
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

        {/*
          Nome + tag, no slot que o `ex` ocupa no TCG.

          A tag é rótulo e não nome: corpo pequeno, peso alto, alinhada pela base
          do nome e não pelo centro da caixa — pendurada nele, como um sufixo, e
          não flutuando ao lado. Se competir com o nome, os dois perdem, que foi
          exatamente a lição do HP contra o nome na fase anterior.
        */}
        <div
          style={{
            position: "absolute",
            left: layout.name.x,
            top: layout.name.top,
            height: layout.name.boxHeight,
            display: "flex",
            alignItems: "baseline",
            gap: layout.tag.gap,
            // No full-art o nome se apoia no scrim escuro, não na faixa clara.
            color: treatment.fullArt ? "#FFFFFF" : colors.ink,
          }}
        >
          <span
            style={{
              maxWidth: layout.name.maxWidth,
              fontSize: nameSize(card.name),
              fontWeight: 900,
              letterSpacing: -0.5,
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            {card.name}
          </span>
          <span
            style={{
              fontSize: layout.tag.size,
              fontWeight: 900,
              letterSpacing: layout.tag.letterSpacing,
              // Não é tinta cheia: a tag informa, o nome identifica. Em opacidade
              // total ela disputa a primeira leitura com um nome de 28px logo ao
              // lado, e num thumbnail as duas viram uma mancha só.
              opacity: 0.72,
              whiteSpace: "nowrap",
            }}
          >
            {tagForAxis(card.axis)}
          </span>
        </div>

        {/*
          HP, vermelho e alinhado à direita (RFC 4.4, item 4).

          É o herói numérico da carta: na régua Wrapped/Skyline o que faz a peça
          ler em um segundo é um número grande, e a 34 contra 30 do nome os dois
          competiam sem que nenhum vencesse. O rótulo desce a acompanhante —
          corpo menor, alinhado pela base do número em vez de pelo centro da
          caixa, que é onde ele flutuava.
        */}
        <div
          style={{
            position: "absolute",
            right: layout.hp.right,
            top: layout.hp.top,
            height: layout.hp.boxHeight,
            display: "flex",
            alignItems: "flex-end",
            gap: 5,
            // O vermelho de contraste com face clara some sobre o scrim.
            color: treatment.fullArt ? HP_RED_ON_ART : HP_RED,
          }}
        >
          <span
            style={{
              fontSize: layout.hp.labelSize,
              fontWeight: 700,
              opacity: 0.8,
              letterSpacing: 0.5,
              paddingBottom: 9,
            }}
          >
            {t("card.hp")}
          </span>
          <span
            style={{
              fontSize: layout.hp.size,
              fontWeight: 900,
              letterSpacing: -2,
              lineHeight: 1,
            }}
          >
            {card.hp}
          </span>

          {/*
            O ícone de tipo, à direita do HP — é onde o TCG sempre o pôs, e a
            carta não o tinha em lugar nenhum do cabeçalho. Ele saiu da faixa de
            tipo para vir aqui: nos dois lugares seria a mesma informação duas
            vezes, e aqui ela lê muito maior.

            Alinhado pela base junto com o número, não pelo centro da caixa. O
            HP tem 46px e o disco 28: centralizados, o disco flutuaria acima da
            linha de base do número.
          */}
          <img
            src={energy}
            width={layout.hp.iconSize}
            height={layout.hp.iconSize}
            style={{ marginLeft: layout.hp.iconGap, marginBottom: 5 }}
          />
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
            color: onArt ? INK_ON_ART : colors.ink,
          }}
        >
          {/*
            Sem ícone: ele subiu para o cabeçalho. O que fica é o nome do tipo
            escrito, que é o que o disco sozinho não entrega e o que o i18n
            precisa ter onde traduzir.
          */}
          <span>{t(elementKey(card.element))}</span>
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
            ink={bodyInk}
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
              // Sobre o scrim escuro uma linha escura desaparece: a divisória
              // inverte junto com a tinta, como as da moldura já fazem.
              background: onArt ? INK_ON_ART : colors.dark,
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
            color: bodyInk,
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

        {/* Rodapé, coluna de texto: tier em cima, linha factual embaixo */}
        <div
          style={{
            position: "absolute",
            left: layout.footer.left,
            top: layout.footer.top,
            width: footerTextWidth,
            display: "flex",
            flexDirection: "column",
            color: bodyInk,
          }}
        >
          <span
            style={{
              fontSize: rarityLabelSize(rarityLabel),
              fontWeight: 700,
              opacity: 0.85,
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            {rarityLabel}
          </span>

          {/*
            Bio/descrição truncada + o número que mais importa.

            As duas colunas têm largura explícita pelo mesmo motivo da linha de
            ataque: o Satori não implementa `min-width: auto`, então `overflow:
            hidden` não impede o irmão de crescer até o tamanho do texto. Com
            `space-between` e larguras implícitas, uma bio longa empurrava o
            "★ 214.0k" para fora e a carta saía com "★ 214".
          */}
          <div
            style={{
              display: "flex",
              marginTop: 5,
              fontSize: layout.footer.size,
              opacity: 0.62,
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{ width: footerTextWidth - STAT_WIDTH, overflow: "hidden" }}
            >
              {card.footer}
            </span>
            {primaryStat ? (
              <span
                style={{
                  width: STAT_WIDTH,
                  display: "flex",
                  justifyContent: "flex-end",
                  fontWeight: 700,
                }}
              >
                ★ {formatCount(Number(primaryStat.value))}
              </span>
            ) : null}
          </div>
        </div>

        <Stamp rarity={card.rarity} serial={card.serial} ink={bodyInk} />
      </div>
    ),
    { width: layout.width, height: layout.height, fonts },
  );
}

/** Largura que sobra para o texto do rodapé depois do selo. */
const footerTextWidth =
  layout.footer.right -
  layout.footer.left -
  layout.footer.stampWidth -
  layout.footer.stampGap;

/** Reservado ao "★ 214.0k". Cabe o maior que o `formatCount` produz. */
const STAT_WIDTH = 60;

/**
 * Selo do rodapé direito: símbolo de raridade e número de série (RFC 4.4, item 8).
 *
 * **A composição é desenhada para a carta sem serial.** Sem `REDIS_URL` a carta
 * sai sem número (`lib/cards/serial.ts`) e isso não é exceção rara — é o estado
 * padrão em desenvolvimento e o estado de qualquer deploy sem store durável.
 * Desenhar primeiro o estado cheio deixaria um vazio no lugar do elemento herói
 * toda vez que o Redis faltasse, que é o buraco que este bloco existe para
 * evitar.
 *
 * Por isso o bloco tem largura e altura fixas e é sempre o mesmo bloco. O que
 * muda é quem manda dentro dele:
 *
 *   sem serial   o símbolo ocupa o selo sozinho, no corpo grande de
 *                `raritySymbolSize` — é ele o herói
 *   com serial   o símbolo encolhe para `layout.footer.symbolSize` e sobe, e o
 *                número assume o corpo grande logo abaixo
 *
 * Nada fora do selo se desloca entre os dois estados, e nenhum dos dois deixa
 * espaço vazio. O serial é uma adição que valoriza o rodapé, nunca um slot que
 * esvazia.
 *
 * O número fica em tinta cheia e não na cor do metal: contra a régua Topps ele é
 * o elemento verdadeiramente escasso da carta — a única coisa que não pode ser
 * recalculada — e precisa ler antes de decorar. Quem carrega o metal é o
 * símbolo, logo acima.
 */
function Stamp({
  rarity,
  serial,
  ink,
}: {
  rarity: Rarity;
  serial: number | null;
  ink: string;
}) {
  const symbol = (
    <span
      style={{
        fontSize: serial === null ? raritySymbolSize(rarity) : layout.footer.symbolSize,
        fontWeight: 900,
        letterSpacing: 1,
        color: raritySymbolColor(rarity),
        // Entrelinha travada: com a padrão de 1.2 as duas linhas do selo somam
        // 55px numa caixa de 48 e o símbolo desce por cima dos dígitos. O `●`
        // da common pousava em cima do "2" do serial.
        lineHeight: 1,
      }}
    >
      {raritySymbol(rarity)}
    </span>
  );

  return (
    <div
      style={{
        position: "absolute",
        right: layout.width - layout.footer.right,
        top: layout.footer.top - 2,
        width: layout.footer.stampWidth,
        height: layout.footer.stampHeight,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      {symbol}
      {serial !== null ? (
        <div
          style={{ display: "flex", alignItems: "flex-end", color: ink, marginTop: 4 }}
        >
          <span
            style={{
              fontSize: layout.footer.hashSize,
              fontWeight: 700,
              opacity: 0.5,
              paddingBottom: 3,
            }}
          >
            #
          </span>
          <span
            style={{
              fontSize: serialSize(serial),
              fontWeight: 900,
              letterSpacing: -1,
              lineHeight: 1,
            }}
          >
            {String(serial).padStart(4, "0")}
          </span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * O serial cresce sem teto — é sequencial por ordem de geração —, e a largura do
 * selo não. Quatro dígitos é o caso desenhado; a partir do quinto o corpo recua
 * para o número continuar dentro do bloco em vez de invadir o texto ao lado.
 * Mesma tática do `nameSize` logo abaixo.
 */
function serialSize(serial: number): number {
  const digits = Math.max(4, String(serial).length);
  if (digits <= 4) return layout.footer.serialSize;
  if (digits === 5) return layout.footer.serialSize - 6;
  return layout.footer.serialSize - 11;
}

/**
 * "Carta Rara Ilustrada Especial · tipo Lutador" tem 43 caracteres e é o pior
 * caso dos dois idiomas. Cabe nos 284px da coluna de texto, mas só um corpo
 * abaixo do padrão.
 */
function rarityLabelSize(label: string): number {
  return label.length > 36 ? layout.footer.size - 1 : layout.footer.size;
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

/**
 * Nome longo encolhe em vez de vazar por baixo da tag.
 *
 * Quatro degraus e não três, e todos mais cedo: o orçamento do nome caiu de
 * 280px para 205 quando o cabeçalho passou a carregar a tag à esquerda e o ícone
 * de tipo à direita. A escada antiga parava em 19px porque 26 caracteres a 19px
 * cabiam nos 280; em 205 não cabem, e o Satori corta a seco, no meio da palavra e
 * sem reticências. O último degrau é 17px, calibrado com `CARD_NAME_CHARS = 20`.
 */
function nameSize(name: string): number {
  if (name.length <= 11) return layout.name.size;
  if (name.length <= 15) return layout.name.size - 5;
  if (name.length <= 18) return layout.name.size - 9;
  return layout.name.size - 11;
}

export { layout as cardLayout };
