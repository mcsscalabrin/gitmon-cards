import { ELEMENTS, type Derivation, type Element } from "@/lib/cards/types";
import { HelpButton } from "@/components/ui/HelpButton";
import { HELP, stepsForSection } from "@/lib/guide/help";
import { translator, type Locale, type MessageKey } from "@/lib/i18n/dictionaries";
import { TypeIcon } from "./TypeIcon";

/**
 * De onde saiu cada número da carta.
 *
 * Inspirado no gitfut: lá, nenhum atributo aparece sozinho — "Skill moves"
 * vem com "technical range: 2 languages", "Work rate" vem com "attack from
 * shipping output, defense from reviews". O número sem a origem é só um número;
 * com a origem, vira leitura do perfil de quem está olhando.
 *
 * Vive **só no site**. O PNG exportado continua limpo (RFC 9.6), e é por isso
 * que `derivations` é opcional no domínio: o renderizador de imagem nunca o lê.
 */
function localize(
  params: Derivation["reasonParams"],
  locale: Locale,
): Record<string, string | number> | undefined {
  if (!params) return undefined;
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      typeof value === "number" ? value.toLocaleString(locale) : value,
    ]),
  );
}

/**
 * O elemento por trás de um `value` de derivação, quando há um.
 *
 * Três das linhas — tipo, fraqueza, resistência — guardam `element.<tipo>`, e
 * são as únicas que ganham o disco colorido. A checagem contra `ELEMENTS` não é
 * cerimônia: `value` também carrega `card.none` e `rarity.hyper_rare`, e um
 * prefixo aceito às cegas viraria um `<img>` apontando para SVG inexistente.
 */
function elementOf(value: string): Element | null {
  const name = value.startsWith("element.") ? value.slice("element.".length) : null;
  return name && (ELEMENTS as readonly string[]).includes(name) ? (name as Element) : null;
}

export function StatBreakdown({
  derivations,
  locale,
  heading = true,
}: {
  derivations: Derivation[];
  locale: Locale;
  /**
   * As derivações são partidas entre as duas colunas que flanqueiam a carta, e
   * duas metades da mesma lista não podem repetir o título — é uma seção só,
   * dividida por razão de layout.
   */
  heading?: boolean;
}) {
  const t = translator(locale);

  return (
    <section className="why">
      {heading ? (
        <div className="why-heading">
          <h2>{t("why.title")}</h2>
          <HelpButton
            title={t(HELP.why.titleKey)}
            body={t(HELP.why.bodyKey)}
            label={t("help.trigger")}
            align="right"
            steps={stepsForSection("why")}
            stepByStepLabel={t("help.stepByStep")}
          />
        </div>
      ) : null}
      <ul>
        {derivations.map((item) => {
          const element = elementOf(item.value);
          return (
          <li key={item.labelKey}>
            <span className="why-label">{t(item.labelKey as MessageKey)}</span>
            {/*
              `value` guarda uma chave i18n quando o valor é um termo do domínio
              (tipo, raridade) e o texto cru quando é número. Traduzir o que não
              é chave devolveria a própria string, então a checagem evita um
              "250" virar chave inexistente.
            */}
            <strong className="why-value">
              {element ? <TypeIcon element={element} size={16} /> : null}
              {item.value.includes(".") ? t(item.value as MessageKey) : item.value}
            </strong>
            {/*
              Números viram texto com separador de milhar aqui, e não no
              construtor da carta: separador depende do idioma, e o domínio é
              puro — não conhece locale.
            */}
            <span className="why-reason">
              {t(item.reasonKey as MessageKey, localize(item.reasonParams, locale))}
            </span>
          </li>
          );
        })}
      </ul>
    </section>
  );
}
