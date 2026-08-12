"use client";

import { useState } from "react";
import { AXES } from "@/lib/cards/ratings";
import type { AxisRating } from "@/lib/cards/ratings";
import { radarGeometry, radarSector } from "@/lib/radar";
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
  const [active, setActive] = useState<number | null>(null);

  const size = 240;

  const values = ratings.map((r) => r.value);
  const labels = AXES.map((a) => t(`axis.${a}` as MessageKey));
  const geo = radarGeometry(values, labels, size);

  const dimmed = (i: number) => active !== null && active !== i;

  return (
    <figure className="radar">
      <figcaption>
        <h2>{t("radar.title")}</h2>
        <p>{t("radar.caption")}</p>
      </figcaption>

      <div className="radar-svg-wrap">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="radar-svg"
          role="img"
          aria-label={t("radar.title")}
        >
          {geo.rings.map((ring, i) => (
            <polygon key={i} points={ring} className="radar-grid" />
          ))}

          {active !== null && (
            <polygon
              points={geo.sectors[active]}
              className="radar-sector-active"
            />
          )}

          {geo.sectors.map((sector, i) => (
            <line
              key={i}
              x1={geo.center}
              y1={geo.center}
              x2={geo.vertices[i].x}
              y2={geo.vertices[i].y}
              className="radar-spoke"
            />
          ))}

          <polygon
            points={geo.points}
            className="radar-shape"
            style={{
              fillOpacity: active !== null ? 0.18 : 0.28,
              transition: "fill-opacity .25s ease",
            }}
          />

          {geo.vertices.map((v, i) => (
            <circle
              key={i}
              cx={v.x}
              cy={v.y}
              r={active === i ? 4 : 3.5}
              className="radar-vertex"
              opacity={dimmed(i) ? 0.3 : 1}
              style={{ transition: "r .2s ease, opacity .25s ease" }}
            />
          ))}

          {geo.labels.map((l, i) => (
            <text
              key={i}
              x={l.x}
              y={l.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="radar-label"
              fill={active === i ? "var(--text)" : "var(--text-faint)"}
              opacity={dimmed(i) ? 0.3 : 1}
              style={{ transition: "fill .2s ease, opacity .25s ease" }}
            >
              {l.label}
            </text>
          ))}

          {AXES.map((_, i) => (
            <polygon
              key={i}
              points={radarSector(geo.center, geo.radius + 17, i, AXES.length)}
              fill="transparent"
              className="radar-hitzone"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onClick={() => setActive((prev) => (prev === i ? null : i))}
            />
          ))}
        </svg>

        {active !== null && (
          <div className="radar-tooltip">
            <div className="radar-tooltip-label">{labels[active]}</div>
            <div className="radar-tooltip-value">
              {ratings[active].raw.toLocaleString(locale)}
            </div>
          </div>
        )}
      </div>

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
