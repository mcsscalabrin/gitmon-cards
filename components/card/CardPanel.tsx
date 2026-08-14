import { ELEMENT_COLORS } from "@/lib/cards/elements";
import type { Card } from "@/lib/cards/types";
import { absoluteUrl } from "@/lib/config";
import { elementKey, rarityKey, translator, type Locale } from "@/lib/i18n/dictionaries";
import { CopyField } from "@/components/ui/CopyField";
import { ShareActions } from "@/components/ui/ShareActions";
import { PackOpening } from "./PackOpening";
import { RadarChart } from "./RadarChart";
import { StatBreakdown } from "./StatBreakdown";
import { TiltCard } from "./TiltCard";
import { TypeIcon } from "./TypeIcon";

/**
 * A carta em si, com o que uma pessoa precisa depois de gerá-la: o snippet para
 * colar no README e a leitura dos números de onde cada stat saiu.
 */
export function CardPanel({
  card,
  locale,
  flippable = false,
  children,
}: {
  card: Card;
  locale: Locale;
  /** Liga o flip da carta. Só o perfil vira; o repositório e a home não. */
  flippable?: boolean;
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
      <PackOpening name={card.name} locale={locale} />

      {/*
        Arranjo simétrico: a carta é o eixo da página, com os valores derivados
        divididos entre as duas colunas que a flanqueiam. As derivações são
        partidas ao meio em vez de empilhadas de um lado só — com tudo à direita
        a página fica pesada de um lado e a carta vira ilustração, não centro.
      */}
      <div className="card-aside card-aside-left">
        {card.ratings && card.ratings.length > 0 ? (
          <RadarChart ratings={card.ratings} locale={locale} />
        ) : null}
        {left.length > 0 ? <StatBreakdown derivations={left} locale={locale} /> : null}
      </div>

      <div className="card-center">
        <TiltCard
          src={imagePath}
          alt={`${card.name} — ${t(elementKey(card.element))}`}
          priority
          rarity={card.rarity}
          flippable={flippable}
          locale={locale}
        />
        <div className="card-headline">
          <h1>{card.name}</h1>
          <p>
            {t(rarityKey(card.rarity))} ·{" "}
            <span className="headline-type">
              <TypeIcon element={card.element} size={16} />
              {t(elementKey(card.element))}
            </span>{" "}
            · {t(card.kind === "profile" ? "card.profile" : "card.repo")}
          </p>
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
          <h2>{t("home.embed")}</h2>
          <CopyField value={markdown} copyLabel={t("home.copy")} copiedLabel={t("home.copied")} />
        </section>

        {children}
      </div>
    </div>
  );
}
