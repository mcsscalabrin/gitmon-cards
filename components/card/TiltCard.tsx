"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { cardTreatment, foilBands, foilIntensity, hasFoil, hasTexture } from "@/lib/cards/rarity";
import type { ProfileAxis } from "@/lib/cards/ratings";
import { patternForAxis } from "@/lib/cards/tag";
import type { Rarity } from "@/lib/cards/types";
import {
  DEFAULT_LOCALE,
  translator,
  type Locale,
} from "@/lib/i18n/dictionaries";

/**
 * Carta interativa: inclinação 3D seguindo o mouse + pilha holográfica, e a
 * animação de revelação que toca a cada visita (RFC 7.1 e 7.2).
 *
 * CSS 3D transform, não Three.js — decisão travada na RFC 7.1. Mais leve e já
 * validada nos dois repositórios de referência.
 *
 * **O que gira é o próprio PNG gerado pelo servidor**, não uma reimplementação da
 * carta em DOM. O gitfut mantém as duas versões sincronizadas copiando as mesmas
 * porcentagens entre o componente React e o renderizador (RFC 4.2, item 3); aqui
 * o problema simplesmente não existe, porque só há uma carta. O custo é que o
 * texto não é selecionável — compensado pela tabela de stats ao lado.
 *
 * O ponteiro **não** entra no estado do React. Um `setState` por `pointermove`
 * re-renderiza a árvore inteira a cada movimento do mouse para escrever quatro
 * números que só o CSS lê; aqui um laço de `requestAnimationFrame` interpola a
 * posição e escreve direto nas custom properties do nó. A interpolação é o que dá
 * o peso de objeto físico: sem ela a carta salta para a posição do cursor, com
 * ela ela persegue o cursor e continua andando por alguns quadros depois que ele
 * para.
 *
 * Com `flippable`, um clique gira a carta e revela o verso (a arte da marca).
 * O flip é experiência do site — o PNG exportado continua só com a frente (RFC
 * 9.6). O eixo do flip mora num filho (`.tilt-inner`), então não disputa o
 * `transform` que o tilt e a revelação escrevem no `.tilt-card`.
 */

const MAX_TILT = 12;

/** Quanto do caminho até o alvo cada quadro percorre. Mais alto, mais seco. */
const EASE = 0.16;

/** Abaixo disto o movimento é invisível e o laço para, liberando a CPU. */
const EPSILON = 0.0015;

/**
 * Curva de resposta do relevo ao vivo, igual à que a build assa no PNG
 * (`RELIEF_CURVE` em `scripts/lib/art.mjs`). Convexa de propósito: esmaga o
 * meio da faixa e preserva o topo, então a luz sai como cintilância nas cristas
 * em vez de véu branco sobre a carta inteira. A mesma curva e a mesma amplitude
 * mantêm as duas pontas falando a mesma língua.
 */
const RELIEF_CURVE = [0, 0.2, 0.4, 0.6, 0.8, 1];

/** `tableValues` do `feFuncA`: a curva convexa, escalada pela intensidade do tier. */
function reliefTable(intensity: number): string {
  return RELIEF_CURVE.map(
    (t) => Math.min(1, t ** 2.4 * (1.4 + 1.8 * intensity)).toFixed(4),
  ).join(" ");
}

/** O arco-íris que sobrou do tempo em que o ao vivo não lia as bandas. */
const DEFAULT_SPECTRUM = [
  "hsl(348 92% 58%)",
  "hsl(45 96% 58%)",
  "hsl(140 82% 54%)",
  "hsl(192 94% 56%)",
  "hsl(268 90% 62%)",
  "hsl(320 92% 60%)",
];

/**
 * Gradiente espectral do `.tilt-spectral`, construído das bandas do tier
 * (`foil.json`) — as mesmas que `foilSvg()` assa no PNG exportado. Antes esta
 * camada usava o arco-íris fixo acima e o site desmentia a carta que exibia:
 * uma `hyper_rare` dourada no feed e colorida na página. Quatro cores por ciclo
 * de 30%, o mesmo período do arco-íris que substituíram.
 */
function spectralGradient(bands: string[]): string {
  const colors = bands.length === 4 ? bands : DEFAULT_SPECTRUM;
  const stops = colors.map((color, i) => `${color} ${(i * 7.5).toFixed(1)}%`).join(", ");
  return `repeating-linear-gradient(112deg, ${stops}, ${colors[0]} 30%)`;
}

interface Pointer {
  /** Posição do ponteiro dentro da carta, 0..1. */
  px: number;
  py: number;
  /** 0 parado, 1 com ponteiro em cima. Interpolado junto, para acender e apagar. */
  active: number;
}

export function TiltCard({
  src,
  alt,
  priority = false,
  rarity,
  axis,
  flippable = false,
  startFlipped = false,
  back = "/assets/backs/card-back.svg",
  locale,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  /**
   * Define a pilha holográfica e a sua intensidade. Opcional porque a home
   * monta as cartas de exemplo só com o caminho do PNG, sem carregar os dados —
   * lá a carta fica lisa, com inclinação e brilho, e sem foil.
   */
  rarity?: Rarity;
  /**
   * Eixo dominante da carta. Escolhe a **geometria** do padrão holográfico, do
   * mesmo jeito que escolhe o `patterns/<padrão>.png` do PNG impresso.
   *
   * Opcional pela mesma razão que `rarity`: a home monta as cartas de exemplo só
   * com o caminho do PNG. Sem ele a pilha cai no `linear`, que é o padrão mais
   * discreto e o do eixo mais comum — nunca fica sem geometria nenhuma.
   */
  axis?: ProfileAxis;
  /**
   * Liga o flip: um clique (ou Enter/Espaço) gira a carta e revela o verso.
   * Fica desligado na home, onde a carta é um link para o perfil.
   */
  flippable?: boolean;
  /**
   * A carta nasce virada, com o verso para cima. É o suspense do perfil: o
   * pacote abre e o que se revela é o verso, não os status — quem entrega a
   * frente é o gesto de virar. Vale só no primeiro render; dali em diante o
   * estado é do clique, e sem `flippable` isto não muda nada (não há verso).
   */
  startFlipped?: boolean;
  /**
   * Arte do verso. O mesmo PNG para qualquer carta — é o verso da marca.
   *
   * Qualquer caminho sob `/assets/` serve: a rewrite `/:owner/:repo.png` do
   * `next.config.ts` recorta essa pasta explicitamente, então o request chega a
   * `public/` sem virar carta de um repositório inexistente.
   */
  back?: string;
  /** Idioma dos rótulos de acessibilidade do flip. Obrigatório quando `flippable`. */
  locale?: Locale;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<SVGFEPointLightElement>(null);

  const [flipped, setFlipped] = useState(startFlipped);
  const t = translator(locale ?? DEFAULT_LOCALE);

  const target = useRef<Pointer>({ px: 0.5, py: 0.5, active: 0 });
  const current = useRef<Pointer>({ px: 0.5, py: 0.5, active: 0 });
  const frame = useRef<number | null>(null);

  // Um filtro SVG por carta: a home renderiza três, e `id` repetido faz todas
  // usarem o filtro da primeira.
  const filterId = `foil-${useId().replace(/:/g, "")}`;

  const foil = rarity !== undefined && hasFoil(rarity);
  const intensity = rarity === undefined ? 0 : foilIntensity(rarity);

  /*
   * O espectro ao vivo lê as bandas do tier, não um arco-íris fixo. É a mesma
   * ponte que `foilIntensity` faz para as opacidades: sem isto o site mostra
   * uma cor que a carta embaixo não tem.
   */
  const spectrum = useMemo(
    () => spectralGradient(rarity === undefined ? [] : foilBands(rarity)),
    [rarity],
  );

  /*
   * As duas camadas que o PNG impresso ganhou, espelhadas ao vivo. O eixo escolhe
   * a geometria, o tier decide se há relevo gravado — exatamente a mesma divisão
   * de `renderCard.tsx`. Sem isto o site mostraria um foil que a carta que ele
   * está exibindo não tem, que é o tipo de divergência que a RFC 4.2 existe para
   * impedir.
   */
  const pattern = patternForAxis(axis ?? "reach");
  /* O tier em vez de um booleano: a textura tem geometria própria por tier, e o
     CSS precisa saber qual PNG usar. */
  const texture = rarity !== undefined && hasTexture(rarity) ? rarity : null;
  /*
   * O full-art precisa chegar ao CSS pela mesma razão que chegou ao `foilSvg`:
   * ali a carta inteira é retrato, e o espectro que pousa bem sobre uma face
   * clara apaga um rosto. É a lição do `FULL_ART_SPECTRUM` do impresso, e sem
   * ela aqui as duas superfícies voltam a discordar.
   */
  const fullArt = rarity !== undefined && cardTreatment(rarity).fullArt;

  const paint = useCallback((node: HTMLDivElement, p: Pointer) => {
    const style = node.style;

    // Mouse à direita inclina para a direita: o eixo Y gira no mesmo sentido
    // do cursor, o eixo X no sentido inverso.
    style.setProperty("--tilt-x", `${(0.5 - p.py) * MAX_TILT * 2}deg`);
    style.setProperty("--tilt-y", `${(p.px - 0.5) * MAX_TILT * 2}deg`);
    style.setProperty("--glare-x", `${p.px * 100}%`);
    style.setProperty("--glare-y", `${p.py * 100}%`);
    style.setProperty("--active", `${p.active}`);

    /*
     * As faixas espectrais andam **mais** que o cursor, e na diagonal. É o que
     * separa holo de gradiente: no foil real a inclinação de poucos graus varre
     * o espectro inteiro, porque o que se move é o ângulo de refração e não a
     * textura. Um deslocamento 1:1 com o ponteiro lê como adesivo colado.
     */
    style.setProperty("--holo-shift", `${p.px * 180 - 40}%`);
    style.setProperty("--holo-drift", `${p.py * 140 - 20}%`);
    style.setProperty("--sheen-shift", `${(p.px * 0.6 + p.py * 0.4) * 200 - 50}%`);

    // A luz especular vive em atributo SVG, que custom property nenhuma alcança.
    const light = lightRef.current;
    if (light) {
      light.setAttribute("x", `${p.px * 100}`);
      light.setAttribute("y", `${p.py * 140}`);
    }
  }, []);

  const tick = useCallback(() => {
    const node = cardRef.current;
    if (!node) {
      frame.current = null;
      return;
    }

    const c = current.current;
    const t = target.current;

    c.px += (t.px - c.px) * EASE;
    c.py += (t.py - c.py) * EASE;
    c.active += (t.active - c.active) * EASE;

    const settled =
      Math.abs(t.px - c.px) < EPSILON &&
      Math.abs(t.py - c.py) < EPSILON &&
      Math.abs(t.active - c.active) < EPSILON;

    // Encosta no alvo em vez de chegar perto: parar a 0.001 de distância deixa
    // um resíduo de inclinação na carta em repouso.
    if (settled) {
      c.px = t.px;
      c.py = t.py;
      c.active = t.active;
    }

    paint(node, c);
    /*
     * Laço de rAF que se reagenda: `tick` se referencia antes de estar
     * declarado, e a regra avisa que o laço em curso continuaria chamando um
     * `tick` velho se ele mudasse. Aqui ele não muda — `paint` é
     * `useCallback(..., [])` logo acima, então a única dependência de `tick` é
     * estável para sempre e existe uma única identidade dele em toda a vida do
     * componente. Reescrever isso com ref só trocaria a garantia por indireção.
     */
    // eslint-disable-next-line react-hooks/immutability
    frame.current = settled ? null : requestAnimationFrame(tick);
  }, [paint]);

  /*
   * Sob `prefers-reduced-motion` o laço nunca roda, e é por isso que ele é a
   * porta de entrada de tudo: escrever as custom properties uma vez que fosse
   * deixaria valores inline no nó, que vencem a regra de media query do CSS e
   * apagariam o brilho estático que ela monta. Não pintar nada é o que deixa o
   * CSS no controle.
   */
  const start = useCallback(() => {
    if (frame.current !== null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    frame.current = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => {
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);

  function onMove(event: React.PointerEvent<HTMLDivElement>) {
    const node = cardRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    target.current = {
      px: (event.clientX - rect.left) / rect.width,
      py: (event.clientY - rect.top) / rect.height,
      active: 1,
    };
    start();
  }

  function reset() {
    target.current = { px: 0.5, py: 0.5, active: 0 };
    start();
  }

  function onFlip() {
    if (!flippable) return;
    setFlipped((prev) => !prev);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    // `role="button"` num `<div>` não dispara `onClick` por teclado; o Enter e o
    // Espaço precisam ser traduzidos à mão, como o botão nativo faria.
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onFlip();
    }
  }

  return (
    <div className="tilt-scene">
      <div
        ref={cardRef}
        className="tilt-card"
        data-foil={foil || undefined}
        role={flippable ? "button" : undefined}
        aria-pressed={flippable ? flipped : undefined}
        aria-label={flippable ? (flipped ? t("card.flipBack") : t("card.flip")) : undefined}
        tabIndex={flippable ? 0 : undefined}
        onClick={flippable ? onFlip : undefined}
        onKeyDown={flippable ? onKeyDown : undefined}
        onPointerMove={onMove}
        onPointerLeave={reset}
        onPointerCancel={reset}
        style={{ ["--foil" as string]: intensity, ["--spectrum" as string]: spectrum }}
      >
        <div className="tilt-inner" data-flipped={flipped || undefined}>
          <div className="tilt-face tilt-face-front">
            <img
              src={src}
              alt={alt}
              width={500}
              height={700}
              fetchPriority={priority ? "high" : "auto"}
            />
            {foil ? (
              <HoloFoil
                filterId={filterId}
                lightRef={lightRef}
                intensity={intensity}
                pattern={pattern}
                texture={texture}
                fullArt={fullArt}
              />
            ) : null}
            <span className="tilt-glare" aria-hidden="true" />
          </div>

          {/*
            O verso só existe quando a carta é virável. É decorativo — o nome do
            card continua sendo a frente —, então a imagem sai com `alt` vazio e
            a face com `aria-hidden`.
          */}
          {flippable ? (
            <div className="tilt-face tilt-face-back" aria-hidden="true">
              <img src={back} alt="" width={500} height={700} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Pilha holográfica ao vivo, por cima do PNG do servidor (RFC 7.1).
 *
 * Derivada do ReflectiveCard do React Bits, sem a webcam que o original usa como
 * fonte de reflexo — pedir câmera para mostrar brilho numa carta é troca ruim.
 * O que foi mantido é a pilha de filtro que faz a diferença entre foil e
 * gradiente animado: ruído procedural vira relevo, `feDisplacementMap` ondula
 * esse relevo, e `feSpecularLighting` o acende a partir de um ponto de luz.
 *
 * São quatro camadas, e cada uma existe por um motivo distinto:
 *
 *   `tilt-foil`      relevo especular — o grão metálico que reflete
 *   `tilt-spectral`  faixas de espectro — a cor que varre quando a carta inclina
 *   `tilt-pattern`   a geometria do eixo — o que separa duas cartas do mesmo tier
 *   `tilt-sheen`     lâmina diagonal — o reflexo duro da fonte de luz
 *   `tilt-grain`     granulado fixo — tira o aspecto liso de gradiente CSS
 *
 * `tilt-pattern` e `tilt-engraved` são as duas que chegaram junto com o segundo
 * eixo, e existem para o site não desmentir o PNG que ele está exibindo: o
 * impresso passou a ter cinco geometrias de padrão e relevo gravado nos três
 * tiers do topo, e uma pilha ao vivo com uma geometria só mostraria um foil que
 * a carta embaixo não tem.
 *
 * A luz **não** anima sozinha: `fePointLight` segue o ponteiro, reaproveitando a
 * posição que o tilt já calcula. Um brilho em loop foi exatamente o que o autor
 * do projeto rejeitou; aqui a carta fica inerte até ser tocada, e o reflexo anda
 * junto com a inclinação em vez de competir com ela.
 *
 * Ver `docs/foil-especular.md`.
 */
function HoloFoil({
  filterId,
  lightRef,
  intensity,
  pattern,
  texture,
  fullArt,
}: {
  filterId: string;
  lightRef: React.RefObject<SVGFEPointLightElement | null>;
  /** Força do foil (0..1): a curva convexa do relevo depende dela. */
  intensity: number;
  pattern: string;
  texture: Rarity | null;
  fullArt: boolean;
}) {
  return (
    <span
      className="tilt-holo"
      aria-hidden="true"
      data-pattern={pattern}
      data-texture={texture ?? undefined}
      data-fullart={fullArt || undefined}
    >
      <span className="tilt-foil">
        <svg className="tilt-foil-svg" viewBox="0 0 100 140" preserveAspectRatio="none">
          <defs>
            {/*
              A região passa de 100% para 140%: `feDisplacementMap` empurra pixels
              para fora da caixa, e com a região justa a ondulação some cortada
              nas quatro bordas — justamente onde a moldura da carta está.
            */}
            <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
              {/*
                Frequência anisotrópica: 0.004 na horizontal contra 0.09 na
                vertical estica o ruído em linhas. É o padrão do foil linear do
                TCG, e a razão de não usar um ruído isotrópico aqui — ruído
                quadrado a esta escala lê como chuvisco de televisão, não como
                metal escovado.
              */}
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.004 0.09"
                numOctaves="3"
                seed="7"
                result="grao"
              />
              {/* Onda lenta que serve de mapa de deslocamento para as linhas. */}
              <feTurbulence
                type="turbulence"
                baseFrequency="0.021"
                numOctaves="2"
                seed="3"
                result="onda"
              />
              <feDisplacementMap
                in="grao"
                in2="onda"
                scale="16"
                xChannelSelector="R"
                yChannelSelector="G"
                result="ondulado"
              />
              <feColorMatrix in="ondulado" type="luminanceToAlpha" result="relevo" />
              <feSpecularLighting
                in="relevo"
                surfaceScale="7"
                specularConstant="1.15"
                specularExponent="18"
                lightingColor="#ffffff"
                result="luz"
              >
                <fePointLight ref={lightRef} x="50" y="70" z="34" />
              </feSpecularLighting>
              <feComposite in="luz" in2="relevo" operator="in" result="cristas" />
              {/*
                A curva convexa (t^2.4 escalada pela intensidade) é o que separa
                cintilância de véu: sem ela, a luz especular levantava o fundo
                junto com as cristas e o relevo virava lavagem branca perto do
                ponteiro — o mesmo defeito que `RELIEF_CURVE` já resolveu no PNG
                assado. Mantém as duas pontas com a mesma resposta.
              */}
              <feComponentTransfer in="cristas">
                <feFuncA type="table" tableValues={reliefTable(intensity)} />
              </feComponentTransfer>
            </filter>
          </defs>
          <rect width="100" height="140" filter={`url(#${filterId})`} />
        </svg>
      </span>

      <span className="tilt-spectral" />
      <span className="tilt-pattern" />
      <span className="tilt-sheen" />
      {texture ? <span className="tilt-engraved" /> : null}
      <span className="tilt-grain" />
    </span>
  );
}
