"use client";

import { useState } from "react";
import { AXES } from "@/lib/cards/ratings";
import type { Card } from "@/lib/cards/types";
import { radarGeometry, radarSector } from "@/lib/radar";
import { SIDE_COLORS, SIDE_MARKERS, markerPath } from "@/lib/viz/series";
import { TypeIcon } from "@/components/card/TypeIcon";
import { translator, type Locale, type MessageKey } from "@/lib/i18n/dictionaries";

const SIZE = 240;

/**
 * Radar comparativo de batalha: dois polígonos sobrepostos no mesmo eixo, mais a
 * tabela eixo a eixo que responde a pergunta que o radar sozinho não responde.
 *
 * **A cor da série não é a cor do tipo** — ver `lib/viz/series.ts` para os
 * números que provam por quê. Resumo: dois devs de JavaScript são os dois
 * `electric`, e o radar desenhava dois polígonos idênticos. Agora cada lado tem
 * um slot fixo (azul/laranja, validados), o tipo continua presente no disco ao
 * lado do nome, e o vértice de cada lado tem forma própria — assim a identidade
 * sobrevive a daltonismo, impressão em cinza e `forced-colors`.
 *
 * A sobreposição mostra de relance *que* os perfis têm formatos diferentes. Ela
 * é ruim para dizer *quanto* — comparar duas áreas irregulares a olho não
 * funciona, e nos eixos onde os dois estão perto os polígonos se encavalam. Por
 * isso a tabela embaixo, com uma linha por eixo: dois pontos numa mesma régua,
 * ligados por um traço cujo comprimento **é** a vantagem. Ali "quem é mais
 * forte em Alcance" se lê sem hover e sem estimar área.
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
  const geo = geoA; // rings/labels/sectors são compartilhados

  const dimmed = (i: number) => active !== null && active !== i;

  return (
    <figure className="battle-radar">
      <figcaption className="battle-radar-caption">
        <h2>{t("battle.radar")}</h2>
        <p>{t("battle.radarCaption")}</p>
      </figcaption>

      {/*
        Legenda sempre presente, porque são duas séries. O nome vai em token de
        texto e nunca na cor da série: o laranja e o azul são legíveis como
        marca de 10px e ruins como texto de 13px sobre a superfície escura. Quem
        carrega a identidade é o marcador ao lado — que é a mesma forma desenhada
        nos vértices do radar, não uma bolinha genérica.
      */}
      <div className="battle-radar-legend">
        {(["a", "b"] as const).map((side) => {
          const card = side === "a" ? a : b;
          return (
            <span key={side} className="battle-radar-legend-item">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path
                  d={markerPath(SIDE_MARKERS[side], 7, 7, 5)}
                  fill={SIDE_COLORS[side]}
                />
              </svg>
              <TypeIcon element={card.element} size={14} />
              {card.name}
            </span>
          );
        })}
      </div>

      <div className="battle-radar-svg-wrap">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="battle-radar-svg" role="img"
          aria-label={`${t("battle.radar")}: ${a.name}, ${b.name}`}>
          {geo.rings.map((ring, i) => (
            <polygon key={i} points={ring} className="radar-grid" />
          ))}

          {geo.axes.map((end, i) => (
            <line
              key={i}
              x1={geo.center}
              y1={geo.center}
              x2={end.x}
              y2={end.y}
              className="radar-spoke"
            />
          ))}

          {active !== null && (
            <polygon points={geo.sectors[active]} className="battle-radar-sector" />
          )}

          {/*
            Preenchimento leve (16%) em vez dos 28% de antes: são duas áreas que
            se cruzam, e a região de sobreposição soma as duas. A 28% cada, o
            miolo virava um bloco chapado onde nenhum dos dois contornos se
            lia — que é justamente onde a comparação acontece.
          */}
          {(["a", "b"] as const).map((side) => (
            <polygon
              key={side}
              points={side === "a" ? geoA.points : geoB.points}
              className="battle-radar-shape"
              style={{
                fill: SIDE_COLORS[side],
                fillOpacity: active !== null ? 0.1 : 0.16,
                stroke: SIDE_COLORS[side],
                strokeOpacity: active !== null ? 0.55 : 1,
              }}
            />
          ))}

          {(["a", "b"] as const).map((side) =>
            (side === "a" ? geoA : geoB).vertices.map((v, i) => (
              <path
                key={`${side}-${i}`}
                d={markerPath(SIDE_MARKERS[side], v.x, v.y, active === i ? 5 : 4)}
                fill={SIDE_COLORS[side]}
                className="battle-radar-marker"
                opacity={dimmed(i) ? 0.3 : 1}
              />
            )),
          )}

          {geo.labels.map((l, i) => (
            <text
              key={i}
              x={l.x}
              y={l.y}
              textAnchor={l.anchor}
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
              className="battle-radar-hitzone"
              tabIndex={0}
              role="button"
              aria-label={`${labels[i]}: ${a.name} ${valuesA[i]}, ${b.name} ${valuesB[i]}`}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              onClick={() => setActive((prev) => (prev === i ? null : i))}
            />
          ))}
        </svg>
      </div>

      <AxisCompare
        a={a}
        b={b}
        valuesA={valuesA}
        valuesB={valuesB}
        labels={labels}
        active={active}
        onActive={setActive}
        locale={locale}
      />
    </figure>
  );
}

/**
 * Uma linha por eixo: os dois valores numa régua só, ligados por um traço.
 *
 * É a "table view" do radar e um gráfico ao mesmo tempo — `<table>` de verdade,
 * com `<th scope="row">` por eixo, então leitor de tela lê a comparação linha a
 * linha sem depender de nenhuma geometria.
 *
 * Os números são o índice 0–99, e não a métrica crua, porque é o índice que os
 * pontos desenham. Imprimir "254.000 estrelas" ao lado de um ponto posicionado
 * por log(254.000) seria uma legenda que discorda do próprio gráfico. A legenda
 * da tabela diz o que o índice é.
 */
function AxisCompare({
  a,
  b,
  valuesA,
  valuesB,
  labels,
  active,
  onActive,
  locale,
}: {
  a: Card;
  b: Card;
  valuesA: number[];
  valuesB: number[];
  labels: string[];
  active: number | null;
  onActive: (i: number | null) => void;
  locale: Locale;
}) {
  const t = translator(locale);

  return (
    <table className="axis-compare">
      <caption>
        {t("battle.axisCompare")} <span>{t("radar.normalized")}</span>
      </caption>
      <thead>
        <tr>
          <th scope="col">{t("radar.axis")}</th>
          <th scope="col" className="axis-compare-name">{a.name}</th>
          <th scope="col">
            <span className="visually-hidden">{t("battle.lead")}</span>
          </th>
          <th scope="col" className="axis-compare-name">{b.name}</th>
        </tr>
      </thead>
      <tbody>
        {labels.map((label, i) => {
          const va = valuesA[i];
          const vb = valuesB[i];
          const lo = Math.min(va, vb);
          const hi = Math.max(va, vb);
          const leader = va === vb ? null : va > vb ? "a" : "b";

          return (
            <tr
              key={label}
              data-active={active === i || undefined}
              data-dim={(active !== null && active !== i) || undefined}
              onMouseEnter={() => onActive(i)}
              onMouseLeave={() => onActive(null)}
            >
              <th scope="row">{label}</th>
              <td className="axis-compare-value" data-lead={leader === "a" || undefined}>
                {va}
              </td>
              <td className="axis-compare-track-cell">
                <span className="axis-compare-track" aria-hidden="true">
                  <span className="axis-compare-rail" />
                  {/* O traço entre os dois pontos: o comprimento dele é a vantagem. */}
                  <span
                    className="axis-compare-link"
                    style={{ left: `${lo}%`, width: `${hi - lo}%` }}
                  />
                  {(["a", "b"] as const).map((side) => (
                    <span
                      key={side}
                      className="axis-compare-dot"
                      data-shape={SIDE_MARKERS[side]}
                      style={{
                        left: `${side === "a" ? va : vb}%`,
                        background: SIDE_COLORS[side],
                      }}
                    />
                  ))}
                </span>
                <span className="visually-hidden">
                  {leader === null
                    ? t("battle.tie")
                    : `${leader === "a" ? a.name : b.name} ${t("battle.lead")} +${hi - lo}`}
                </span>
              </td>
              <td className="axis-compare-value" data-lead={leader === "b" || undefined}>
                {vb}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
