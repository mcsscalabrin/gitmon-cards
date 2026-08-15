import { formatCount } from "@/lib/cards/format";
import { PROJECT_REPO_URL, SPONSOR_URL } from "@/lib/config";
import { translator, type Locale } from "@/lib/i18n/dictionaries";

/**
 * Faixa de apoio: favoritar o repositório e patrocinar, lado a lado.
 *
 * Fica acima do rodapé e **fora** da imagem exportada (RFC 9.6) — como o link de
 * sponsor sempre esteve. O que muda é o peso: um link de texto no rodapé é
 * ignorável por construção, e o pedido era incentivar de verdade.
 *
 * O contador é opcional. Sem token ou com a API fora do ar, `stars` chega `null`
 * e o botão vira só "Favoritar no GitHub" — a ação continua disponível, o número
 * é que não é inventado (ver `getProjectStars`).
 */
export function SupportBand({
  locale,
  stars,
  compact = false,
}: {
  locale: Locale;
  stars: number | null;
  /**
   * Uma linha só, sem o parágrafo. É o formato da home, onde a página inteira
   * cabe numa tela e cada bloco tem um orçamento de altura — e onde a explicação
   * não faz falta, porque o pedido está a dois cliques de distância do que a
   * pessoa acabou de ver funcionar.
   */
  compact?: boolean;
}) {
  const t = translator(locale);

  return (
    <aside className="support-band" data-compact={compact || undefined}>
      <div className="support-copy">
        <h2>{t("support.title")}</h2>
        {compact ? null : <p>{t("support.description")}</p>}
      </div>

      <div className="support-actions">
        <a
          className="support-star"
          href={PROJECT_REPO_URL}
          target="_blank"
          rel="noreferrer noopener"
        >
          <span className="support-star-glyph" aria-hidden="true">
            ★
          </span>
          <span className="support-star-label">
            {t("support.star")}
            {stars !== null ? (
              <b>
                {formatCount(stars)} {t("support.stars")}
              </b>
            ) : null}
          </span>
        </a>

        <a
          className="button"
          href={SPONSOR_URL}
          target="_blank"
          rel="noreferrer noopener"
        >
          {t("home.sponsor")}
        </a>
      </div>
    </aside>
  );
}
