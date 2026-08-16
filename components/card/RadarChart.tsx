"use client";

import { useState } from "react";
import type { AxisRating } from "@/lib/cards/ratings";
import { radarGeometry, radarSector } from "@/lib/radar";
import { HelpButton } from "@/components/ui/HelpButton";
import { HELP, stepsForSection } from "@/lib/guide/help";
import { translator, type Locale, type MessageKey } from "@/lib/i18n/dictionaries";

/**
 * Assinatura de perfil ou repositório em cinco eixos.
 *
 * Os eixos vêm do próprio `ratings` (e não de uma constante global): o perfil
 * assina `reach/community/volume/veterancy/breadth` e o repositório troca a
 * amplitude por `activity`, então quem desenha não pode presumir o conjunto
 * fixo — `ratings.ts` é a única fonte do que cada sujeito assina.
 *
 * Decisões que vêm de `lib/cards/ratings.ts` e não são estéticas:
 *
 * - **Sem marcação numérica nos eixos.** Os cinco eixos têm escalas
 *   independentes e tetos escolhidos por nós; uma régua numerada prometeria uma
 *   precisão que a normalização não sustenta. Os anéis de grade existem só para
 *   dar profundidade, e por isso não são rotulados.
 * - **Uma série só, logo sem legenda.** O título nomeia o que está plotado.
 *
 * O que mudou: os números **saíram do hover**. Antes eles moravam numa
 * `<table class="visually-hidden">` e num tooltip — ou seja, a única forma de
 * ler um valor com os olhos era acertar o mouse em cima de um setor. Tooltip
 * complementa, nunca é o único caminho para o dado. Agora a mesma tabela é
 * visível abaixo do radar, com uma barra por eixo, e continua sendo `<table>` de
 * verdade para leitor de tela. O radar dá a forma; a tabela dá o dado — que é
 * exatamente o que `ratings.ts` sempre defendeu, só que agora dá de fato.
 *
 * A régua da tabela é honesta sobre o que é: a legenda diz "índice 0–99, escala
 * logarítmica" e o número cru fica ao lado. A objeção de `ratings.ts` era a
 * régua **no radar**, onde a forma promete comparação entre eixos; numa lista,
 * cada eixo é lido sozinho e o índice não mente sobre nada.
 */
/**
 * O número cru, pronto para exibir.
 *
 * `Math.floor` pelo mesmo motivo que `profile.ts` já aplica na linha de recuo:
 * `yearsSince` devolve fração, e "14,937808668117981" não é dado, é vazamento de
 * implementação. Enquanto o valor vivia escondido no tooltip dava para não
 * reparar; numa coluna ao lado de "254.470" e "316.307", um "14,945" em pt-BR lê
 * como quatorze mil. Os outros quatro eixos já são inteiros, então o piso não
 * muda nada neles.
 */
function formatRaw(raw: number, locale: Locale): string {
  return Math.floor(raw).toLocaleString(locale);
}

export function RadarChart({
  ratings,
  locale,
  kind = "profile",
}: {
  ratings: AxisRating[];
  locale: Locale;
  /**
   * Qual assinatura está plotada. Só muda o título e a legenda; a geometria
   * já é derivada dos eixos presentes em `ratings`.
   */
  kind?: "profile" | "repo";
}) {
  const t = translator(locale);
  const [active, setActive] = useState<number | null>(null);

  const size = 240;

  const axes = ratings.map((r) => r.axis);
  const values = ratings.map((r) => r.value);
  const labels = axes.map((a) => t(`axis.${a}` as MessageKey));
  const geo = radarGeometry(values, labels, size);

  /** O eixo mais forte é o único rotulado por destaque — rótulo seletivo, não em todo ponto. */
  const peak = values.reduce((best, v, i) => (v > values[best] ? i : best), 0);

  const dimmed = (i: number) => active !== null && active !== i;

  return (
    <figure className="radar">
      <figcaption>
        <div className="radar-title-row">
          <h2>{t(kind === "repo" ? "radar.title.repo" : "radar.title")}</h2>
          <HelpButton
            title={t(HELP.radar.titleKey)}
            body={t(HELP.radar.bodyKey)}
            label={t("help.trigger")}
            align="right"
            steps={stepsForSection("radar")}
            stepByStepLabel={t("help.stepByStep")}
          />
        </div>
        <p>{t(kind === "repo" ? "radar.caption.repo" : "radar.caption")}</p>
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

          <polygon
            points={geo.points}
            className="radar-shape"
            style={{
              fillOpacity: active !== null ? 0.18 : 0.28,
              transition: "fill-opacity .25s ease",
            }}
          />

          {/*
            Anel de 2px na cor da superfície em volta de cada vértice. Não é
            contorno decorativo: onde o vértice cai em cima da linha do polígono
            ou de um raio da grade, sem o anel ele vira um engrossamento da linha
            em vez de um ponto. O anel é o separador, e é a cor do fundo que
            separa — nunca uma borda desenhada.
          */}
          {geo.vertices.map((v, i) => (
            <circle
              key={i}
              cx={v.x}
              cy={v.y}
              r={active === i ? 4.5 : 4}
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

          {/*
            O setor inteiro é o alvo, e não o vértice de 8px: mirar num ponto
            desse tamanho é exigir pontaria. `tabIndex` porque hover não pode ser
            o único jeito de chegar no destaque — teclado mostra o mesmo que o
            mouse.
          */}
          {axes.map((axis, i) => (
            <polygon
              key={i}
              points={radarSector(geo.center, geo.radius + 17, i, axes.length)}
              fill="transparent"
              className="radar-hitzone"
              tabIndex={0}
              role="button"
              aria-label={`${labels[i]}: ${formatRaw(ratings[i].raw, locale)}`}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              onClick={() => setActive((prev) => (prev === i ? null : i))}
            />
          ))}
        </svg>
      </div>

      {/*
        A tabela que era escondida, agora visível. Mesma marcação semântica de
        antes — `<th scope="row">` por eixo — então o leitor de tela não perdeu
        nada; quem enxerga é que ganhou o número sem precisar de mouse.
      */}
      <table className="radar-values">
        <caption>
          {t("radar.values")} <span>{t("radar.normalized")}</span>
        </caption>
        <tbody>
          {ratings.map((rating, i) => (
            <tr
              key={rating.axis}
              data-active={active === i || undefined}
              data-peak={i === peak || undefined}
              data-dim={dimmed(i) || undefined}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              <th scope="row">{t(`axis.${rating.axis}` as MessageKey)}</th>
              <td className="radar-meter-cell">
                {/*
                  A barra é redundante com o número ao lado, de propósito: o
                  número diz quanto, a barra diz quanto **comparado aos outros
                  quatro eixos** — que é a leitura que o radar dá de relance e
                  que uma coluna de números sozinha não dá.
                */}
                <span className="radar-meter" aria-hidden="true">
                  <span
                    className="radar-meter-fill"
                    style={{ width: `${Math.max(2, rating.value)}%` }}
                  />
                </span>
              </td>
              <td className="radar-raw">{formatRaw(rating.raw, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
