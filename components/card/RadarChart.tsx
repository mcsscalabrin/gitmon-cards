import { AXES, gridPoints, labelPosition, polygonPoints } from "@/lib/cards/ratings";
import type { AxisRating } from "@/lib/cards/ratings";
import { translator, type Locale, type MessageKey } from "@/lib/i18n/dictionaries";

/**
 * Assinatura do perfil em cinco eixos.
 *
 * Decisões que vêm de `lib/cards/ratings.ts` e não são estéticas:
 *
 * - **Sem marcação numérica nos eixos.** Os cinco eixos têm escalas
 *   independentes e tetos escolhidos por nós; uma régua numerada prometeria uma
 *   precisão que a normalização não sustenta. Os anéis de grade existem só para
 *   dar profundidade, e por isso não são rotulados.
 * - **Os números reais ficam fora daqui**, na lista de derivações ao lado. O
 *   radar dá a forma; a lista dá o dado.
 * - **Uma série só, logo sem legenda.** O título nomeia o que está plotado.
 * - **`<table>` escondida** com os valores crus: a forma é inacessível para
 *   leitor de tela, e cor/geometria nunca podem ser o único caminho para o dado.
 */
export function RadarChart({
  ratings,
  locale,
}: {
  ratings: AxisRating[];
  locale: Locale;
}) {
  const t = translator(locale);

  const size = 240;
  const center = size / 2;
  const radius = 82;

  return (
    <figure className="radar">
      <figcaption>
        <h2>{t("radar.title")}</h2>
        <p>{t("radar.caption")}</p>
      </figcaption>

      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="radar-svg"
        role="img"
        aria-label={t("radar.title")}
      >
        {/* Grade recessiva: só profundidade, sem valor associado. */}
        {[0.25, 0.5, 0.75, 1].map((step) => (
          <polygon
            key={step}
            points={gridPoints(AXES.length, radius * step, center)}
            className="radar-grid"
          />
        ))}

        {AXES.map((_, index) => {
          const { x, y } = labelPosition(index, AXES.length, radius, center);
          return (
            <line
              key={index}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              className="radar-spoke"
            />
          );
        })}

        <polygon points={polygonPoints(ratings, radius, center)} className="radar-shape" />

        {ratings.map((rating, index) => {
          const { x, y } = labelPosition(index, AXES.length, (rating.value / 99) * radius, center);
          return <circle key={rating.axis} cx={x} cy={y} r={3.5} className="radar-vertex" />;
        })}

        {AXES.map((axis, index) => {
          const { x, y, anchor } = labelPosition(index, AXES.length, radius + 18, center);
          return (
            <text
              key={axis}
              x={x}
              y={y}
              textAnchor={anchor}
              dominantBaseline="middle"
              className="radar-label"
            >
              {t(`axis.${axis}` as MessageKey)}
            </text>
          );
        })}
      </svg>

      <table className="visually-hidden">
        <caption>{t("radar.title")}</caption>
        <tbody>
          {ratings.map((rating) => (
            <tr key={rating.axis}>
              <th scope="row">{t(`axis.${rating.axis}` as MessageKey)}</th>
              <td>{rating.raw.toLocaleString(locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
