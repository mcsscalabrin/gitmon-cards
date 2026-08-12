"use client";

import { useState } from "react";
import { AXES } from "@/lib/cards/ratings";
import type { Card } from "@/lib/cards/types";
import { ELEMENT_COLORS } from "@/lib/cards/elements";
import { radarGeometry, radarSector } from "@/lib/radar";
import { translator, type Locale, type MessageKey } from "@/lib/i18n/dictionaries";

const SIZE = 240;

/**
 * Radar comparativo de batalha: dois polígonos sobrepostos no mesmo eixo.
 *
 * A sobreposição mostra visualmente onde cada oponente leva vantagem — a forma
 * do polígono é a "assinatura" do perfil, e onde um polígono se estende além
 * do outro, aquele lado domina naquele eixo.
 */
export function BattleRadar({
  a,
  b,
  locale,
}: {
  a: Card;
  b: Card;
  locale: Locale;
}) {
  const t = translator(locale);
  const [active, setActive] = useState<number | null>(null);

  const ratingsA = a.ratings ?? [];
  const ratingsB = b.ratings ?? [];

  const valuesA = AXES.map((_, i) => ratingsA[i]?.value ?? 0);
  const valuesB = AXES.map((_, i) => ratingsB[i]?.value ?? 0);
  const labels = AXES.map((ax) => t(`axis.${ax}` as MessageKey));

  const geoA = radarGeometry(valuesA, labels, SIZE);
  const geoB = radarGeometry(valuesB, labels, SIZE);
  const geo = geoA; // rings/labels/sectors are shared

  const colorsA = ELEMENT_COLORS[a.element];
  const colorsB = ELEMENT_COLORS[b.element];

  return (
    <figure className="battle-radar">
      <figcaption className="battle-radar-caption">
        <h2>{t("battle.radar")}</h2>
        <p>{t("battle.radarCaption")}</p>
      </figcaption>

      <div className="battle-radar-legend">
        <span className="battle-radar-legend-item">
          <span className="battle-radar-dot" style={{ background: colorsA.base }} />
          {a.name}
        </span>
        <span className="battle-radar-legend-item">
          <span className="battle-radar-dot" style={{ background: colorsB.base }} />
          {b.name}
        </span>
      </div>

      <div className="battle-radar-svg-wrap">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="battle-radar-svg">
          {geo.rings.map((ring, i) => (
            <polygon key={i} points={ring} className="radar-grid" />
          ))}

          {active !== null && (
            <polygon
              points={geo.sectors[active]}
              className="battle-radar-sector"
              style={{ fill: `${colorsA.base}18`, stroke: `${colorsA.base}40` }}
            />
          )}

          <polygon
            points={geoA.points}
            className="battle-radar-shape"
            style={{
              fill: `${colorsA.base}${active !== null ? "22" : "30"}`,
              stroke: colorsA.base,
              strokeOpacity: active !== null ? 0.55 : 1,
            }}
          />
          <polygon
            points={geoB.points}
            className="battle-radar-shape"
            style={{
              fill: `${colorsB.base}${active !== null ? "22" : "30"}`,
              stroke: colorsB.base,
              strokeOpacity: active !== null ? 0.55 : 1,
            }}
          />

          {geoA.vertices.map((v, i) => (
            <circle
              key={`a-${i}`}
              cx={v.x}
              cy={v.y}
              r={active === i ? 3.5 : 2}
              fill={colorsA.base}
              opacity={active !== null && active !== i ? 0.3 : 1}
              style={{ transition: "r .2s ease, opacity .25s ease" }}
            />
          ))}
          {geoB.vertices.map((v, i) => (
            <circle
              key={`b-${i}`}
              cx={v.x}
              cy={v.y}
              r={active === i ? 3.5 : 2}
              fill={colorsB.base}
              opacity={active !== null && active !== i ? 0.3 : 1}
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
              style={{ transition: "fill .2s ease" }}
            >
              {l.label}
            </text>
          ))}

          {AXES.map((_, i) => (
            <polygon
              key={i}
              points={radarSector(geo.center, geo.radius + 17, i, AXES.length)}
              fill="transparent"
              className="battle-radar-hitzone"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onClick={() => setActive((prev) => (prev === i ? null : i))}
            />
          ))}
        </svg>

        {active !== null && (
          <div className="battle-radar-tooltip">
            <div className="battle-radar-tooltip-label">{labels[active]}</div>
            <div className="battle-radar-tooltip-values">
              <span style={{ color: colorsA.base }}>
                {a.name}: {valuesA[active]}
              </span>
              <span style={{ color: colorsB.base }}>
                {b.name}: {valuesB[active]}
              </span>
            </div>
          </div>
        )}
      </div>
    </figure>
  );
}
