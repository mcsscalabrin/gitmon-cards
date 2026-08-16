import { ELEMENT_COLORS } from "@/lib/cards/elements";
import { tagForAxis } from "@/lib/cards/tag";
import type { Card } from "@/lib/cards/types";
import { absoluteUrl } from "@/lib/config";
import { elementKey, rarityKey, translator, classKey, type Locale } from "@/lib/i18n/dictionaries";
import { CopyField } from "@/components/ui/CopyField";
import { HelpButton } from "@/components/ui/HelpButton";
import { ShareActions } from "@/components/ui/ShareActions";
import { PackOpening } from "./PackOpening";
import { RadarChart } from "./RadarChart";
import { StatBreakdown } from "./StatBreakdown";
import { TiltCard } from "./TiltCard";
import { TypeIcon } from "./TypeIcon";
import { HELP, stepsForSection } from "@/lib/guide/help";

/**
 * A carta em si, com o que uma pessoa precisa depois de gerá-la: o snippet para
 * colar no README e a leitura dos números de onde cada stat saiu.
 */
export function CardPanel({
  card,
  locale,
  flippable = false,
  suppressPack = false,
  children,
}: {
  card: Card;
  locale: Locale;
  /**
   * Liga o flip da carta. Só o perfil vira; o repositório e a home não. Quem
   * vira também nasce virado (verso para cima): o pacote revela o verso, e o
   * gesto de virar é quem entrega a frente.
   */
  flippable?: boolean;
  /** Suprime a abertura de pacote — usado pelo tour guiado (`?guide=1`). */
  suppressPack?: boolean;
  children?: React.ReactNode;
}) {
  const t = translator(locale);
  const imagePath = `/${card.id}.png`;
  const embedUrl = absoluteUrl(imagePath);
  const markdown = `[![${card.name}](${embedUrl})](${card.sourceUrl})`;
  const colors = ELEMENT_COLORS[card.element];

  /*
   * Corte ao meio, com o resto sobrando para a direita — a esquerda já carrega
   * o radar, então a coluna mais leve em texto é a que tem o peso visual maior.
   */
  const derivations = card.derivations ?? [];
  const half = Math.ceil(derivations.length / 2);
  const left = derivations.slice(0, half);
  const right = derivations.slice(half);

  return (
    <div className="card-panel" style={{ ["--element" as string]: colors.base }}>
      {/*
        O pacote cobre a tela até ser rasgado ou pulado. Fica aqui, e não na
        busca, para que um link direto para /torvalds também abra pacote — a
        revelação é da carta, não do ato de pesquisar.
      */}
      <PackOpening name={card.name} locale={locale} suppressed={suppressPack} />

      {/*
        Arranjo simétrico: a carta é o eixo da página, com os valores derivados
        divididos entre as duas colunas que a flanqueiam. As derivações são
        partidas ao meio em vez de empilhadas de um lado só — com tudo à direita
        a página fica pesada de um lado e a carta vira ilustração, não centro.
      */}
      <div className="card-aside card-aside-left">
        {card.ratings && card.ratings.length > 0 ? (
          <RadarChart ratings={card.ratings} locale={locale} kind={card.kind} />
        ) : null}
        {left.length > 0 ? <StatBreakdown derivations={left} locale={locale} /> : null}
      </div>

      <div className="card-center">
        <TiltCard
          src={imagePath}
          alt={`${card.name} — ${t(elementKey(card.element))}`}
          priority
          rarity={card.rarity}
          axis={card.axis}
          flippable={flippable}
          startFlipped={flippable}
          locale={locale}
        />
        <div className="card-headline">
          <h1>
            {card.name}
            {/*
              A tag acompanha o nome aqui como acompanha na carta — mesmo slot,
             mesma hierarquia. Repetir a gramática do PNG é o que faz a página
             parecer a carta em vez de uma ficha sobre ela.
            */}
            <span className="headline-tag">{tagForAxis(card.axis)}</span>
            {/*
              Classe ex/Mega ex, como no TCG: o "ex" vem colado ao nome. Só o
              site mostra — o PNG exportado fica limpo (RFC 9.6), como
              `derivations` e `ratings`.
            */}
            {card.cardClass && card.cardClass !== "standard" && (
              <span className="card-class">{t(classKey(card.cardClass))}</span>
            )}
          </h1>
          <p>
            {t(rarityKey(card.rarity))} ·{" "}
            <span className="headline-type">
              <TypeIcon element={card.element} size={16} />
              {t(elementKey(card.element))}
            </span>{" "}
            · {t(card.kind === "profile" ? "card.profile" : "card.repo")}
          </p>
          <HelpButton
            title={t(HELP.card.titleKey)}
            body={t(HELP.card.bodyKey)}
            label={t("help.trigger")}
            align="center"
            className="headline-help"
            steps={stepsForSection("card")}
            stepByStepLabel={t("help.stepByStep")}
          />
        </div>
      </div>

      <div className="card-aside card-aside-right">
        {right.length > 0 ? (
          <StatBreakdown derivations={right} locale={locale} heading={false} />
        ) : null}
        <dl className="stat-grid">
          {card.stats.map((stat) => (
            <div key={stat.labelKey}>
              <dt>{t(stat.labelKey as Parameters<typeof t>[0])}</dt>
              <dd>{typeof stat.value === "number" ? stat.value.toLocaleString(locale) : stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="card-side">
        {/*
          Levar a carta embora vem antes do snippet: o destino principal é o feed
          (D13), onde o PNG é o produto inteiro, e o README é o secundário. A
          ordem na página é a ordem de importância dos dois destinos.
        */}
        <ShareActions
          imagePath={imagePath}
          pageUrl={absoluteUrl(`/${card.id}`)}
          name={card.name}
          filename={`${card.id.replace("/", "-")}.png`}
          downloadLabel={t("home.download")}
          shareLabel={t("home.share")}
          copiedLabel={t("home.linkCopied")}
        />

        <section className="embed">
          <div className="embed-heading">
            <h2>{t("home.embed")}</h2>
            <HelpButton
              title={t(HELP.embed.titleKey)}
              body={t(HELP.embed.bodyKey)}
              label={t("help.trigger")}
              steps={stepsForSection("embed")}
              stepByStepLabel={t("help.stepByStep")}
            />
          </div>
          <CopyField value={markdown} copyLabel={t("home.copy")} copiedLabel={t("home.copied")} />
        </section>

        {children}
      </div>
    </div>
  );
}
