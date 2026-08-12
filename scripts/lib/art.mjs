/**
 * Geradores de SVG para a arte das cartas — caminho C da RFC 8: uma moldura
 * vetorial única recolorida por elemento, com o foil como camada separada só nos
 * tiers altos.
 *
 * Tudo aqui é geometria original. Nada é derivado de asset da Pokémon Company
 * nem dos ícones de fã dos repositórios de referência (RFC 11) — o que foi
 * reaproveitado deles é a especificação de posição em `docs/layout-spec.md`,
 * que são números, não desenho.
 *
 * Sem texto: `sharp` rasteriza SVG via librsvg, e texto em SVG depende de fontes
 * do sistema — o que não é confiável em serverless. Todo texto é desenhado pelo
 * Satori em runtime, com as fontes embarcadas em public/assets/fonts.
 */

/** Mistura dois hex. `amount` = 0 devolve `a`, 1 devolve `b`. */
function mix(a, b, amount) {
  const parse = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const channel = (x, y) => Math.round(x + (y - x) * amount).toString(16).padStart(2, "0");
  return `#${channel(ar, br)}${channel(ag, bg)}${channel(ab, bb)}`;
}

/**
 * Moldura de um elemento. A janela da arte fica transparente (RFC 4.4, item 3).
 *
 * Com `fullArt`, a janela sobe até a borda e a arte passa por trás do nome e da
 * faixa de tipo. Os dois deixam de ser desenhados dentro da máscara — seriam
 * recortados junto com o resto — e voltam por cima da arte, o nome apoiado num
 * scrim escuro. É esse scrim que garante legibilidade sobre avatar claro.
 *
 * Abaixo da janela nada muda: ataques e status continuam sobre face opaca.
 */
export function frameSvg(layout, colors, { fullArt = false } = {}) {
  const { width: W, height: H, radius: R, border: B } = layout;
  const win = fullArt ? layout.fullArt.window : layout.window;
  const inner = { x: B, y: B, w: W - B * 2, h: H - B * 2, r: R - 6 };
  const bezel = 4;

  /** Altura da faixa do nome. A janela começa exatamente onde ela termina. */
  const nameBand = win.y - inner.y;

  const typeStrip = `<rect x="${layout.typeStrip.x}" y="${layout.typeStrip.y}" width="${layout.typeStrip.width}"
          height="${layout.typeStrip.height}" rx="6" fill="${colors.base}" fill-opacity="${fullArt ? 0.62 : 0.2}"
          stroke="${colors.dark}" stroke-opacity="${fullArt ? 0.55 : 0.3}" stroke-width="1"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="borda" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="${colors.base}"/>
      <stop offset="0.45" stop-color="${colors.dark}"/>
      <stop offset="1" stop-color="${colors.base}"/>
    </linearGradient>
    <linearGradient id="face" x1="0" y1="0" x2="0.2" y2="1">
      <stop offset="0" stop-color="${mix(colors.light, "#FFFFFF", 0.35)}"/>
      <stop offset="0.5" stop-color="${colors.light}"/>
      <stop offset="1" stop-color="${mix(colors.light, colors.base, 0.34)}"/>
    </linearGradient>
    <linearGradient id="faixa" x1="0" y1="0" x2="1" y2="0.6">
      <stop offset="0" stop-color="${colors.base}" stop-opacity="0.72"/>
      <stop offset="0.7" stop-color="${colors.base}" stop-opacity="0.34"/>
      <stop offset="1" stop-color="${colors.base}" stop-opacity="0.5"/>
    </linearGradient>
    <radialGradient id="brilho" cx="0.26" cy="0.1" r="0.7">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.34"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>

    <!-- Scrim do full-art: o nome precisa ser legível sobre avatar claro. -->
    <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${colors.ink}" stop-opacity="0.86"/>
      <stop offset="0.55" stop-color="${colors.ink}" stop-opacity="0.5"/>
      <stop offset="1" stop-color="${colors.ink}" stop-opacity="0"/>
    </linearGradient>

    <!-- Branco mantém, preto fura. É isto que abre a janela da arte. -->
    <mask id="janela">
      <rect x="0" y="0" width="${W}" height="${H}" fill="#FFFFFF"/>
      <rect x="${win.x}" y="${win.y}" width="${win.width}" height="${win.height}" rx="${win.radius}" fill="#000000"/>
    </mask>
  </defs>

  <g mask="url(#janela)">
    <rect x="0" y="0" width="${W}" height="${H}" rx="${R}" fill="url(#borda)"/>
    <rect x="3" y="3" width="${W - 6}" height="${H - 6}" rx="${R - 3}" fill="none"
          stroke="#FFFFFF" stroke-opacity="0.28" stroke-width="1.5"/>

    <rect x="${inner.x}" y="${inner.y}" width="${inner.w}" height="${inner.h}" rx="${inner.r}" fill="url(#face)"/>
    <rect x="${inner.x}" y="${inner.y}" width="${inner.w}" height="${inner.h}" rx="${inner.r}" fill="url(#brilho)"/>
    <rect x="${inner.x + 0.75}" y="${inner.y + 0.75}" width="${inner.w - 1.5}" height="${inner.h - 1.5}"
          rx="${inner.r}" fill="none" stroke="${colors.dark}" stroke-opacity="0.4" stroke-width="1.5"/>

    ${
      fullArt
        ? ""
        : `<!-- Faixa do nome. O texto entra por cima, em runtime. A altura sai da
         posição da janela: as duas se encostam por construção, e mexer numa
         sem a outra é o erro clássico deste arquivo. -->
    <path d="M${inner.x} ${inner.y + inner.r} a${inner.r} ${inner.r} 0 0 1 ${inner.r} -${inner.r}
             h${inner.w - inner.r * 2} a${inner.r} ${inner.r} 0 0 1 ${inner.r} ${inner.r}
             v${nameBand - inner.r} h-${inner.w} z" fill="url(#faixa)"/>
    <line x1="${inner.x}" y1="${win.y}" x2="${inner.x + inner.w}" y2="${win.y}"
          stroke="${colors.dark}" stroke-opacity="0.35" stroke-width="1.5"/>

    <!-- Bisel da janela: o retângulo é maior que o furo, então sobra um anel. -->
    <rect x="${win.x - bezel}" y="${win.y - bezel}" width="${win.width + bezel * 2}"
          height="${win.height + bezel * 2}" rx="${win.radius + 2}" fill="${colors.ink}" fill-opacity="0.92"/>

    <!-- Faixa de tipo, logo abaixo da janela. -->
    ${typeStrip}`
    }

    <!-- Painel dos ataques. A divisória entre dois ataques é desenhada em runtime,
         porque depende de quantos ataques a carta tem. -->
    <rect x="${layout.attacks.left}" y="${layout.attacks.top - 8}"
          width="${layout.attacks.right - layout.attacks.left}"
          height="${layout.attacks.boxHeight * 2 + layout.attacks.gap + 8}" rx="10"
          fill="#FFFFFF" fill-opacity="0.42"/>

    <!-- Fileira de fraqueza / resistência / recuo. -->
    <rect x="${layout.attacks.left}" y="${layout.status.y}"
          width="${layout.attacks.right - layout.attacks.left}" height="${layout.status.height}" rx="8"
          fill="${colors.base}" fill-opacity="0.16" stroke="${colors.dark}" stroke-opacity="0.28" stroke-width="1"/>
    ${[1, 2]
      .map((i) => {
        const x = layout.attacks.left + ((layout.attacks.right - layout.attacks.left) / 3) * i;
        return `<line x1="${x}" y1="${layout.status.y + 7}" x2="${x}" y2="${layout.status.y + layout.status.height - 7}" stroke="${colors.dark}" stroke-opacity="0.28" stroke-width="1"/>`;
      })
      .join("\n    ")}

    <line x1="${layout.footer.left}" y1="${layout.footer.top - 6}" x2="${layout.footer.right}"
          y2="${layout.footer.top - 6}" stroke="${colors.dark}" stroke-opacity="0.25" stroke-width="1"/>
  </g>

  ${
    fullArt
      ? `<!-- Fora da máscara, portanto por cima da arte. -->
  <path d="M${win.x} ${win.y + win.radius} a${win.radius} ${win.radius} 0 0 1 ${win.radius} -${win.radius}
           h${win.width - win.radius * 2} a${win.radius} ${win.radius} 0 0 1 ${win.radius} ${win.radius}
           v${layout.fullArt.scrimHeight - win.radius} h-${win.width} z" fill="url(#scrim)"/>
  ${typeStrip}`
      : ""
  }

  ${solda(win, colors)}
</svg>`;
}

/**
 * A solda: a transição entre a arte e a moldura.
 *
 * Era um retângulo arredondado com um traço de 2px, e é o que mais separava esta
 * carta de uma impressa. Numa carta de verdade a ilustração não está *colada* na
 * moldura, está **embutida** nela — há profundidade na junta, e o olho lê isso
 * antes de ler qualquer outra coisa do acabamento.
 *
 * São três coisas, e nenhuma delas é o traço:
 *
 *   sombra   um traço grosso e desfocado, recortado para dentro da janela. É o
 *            que faz a arte parecer rebaixada sob a moldura em vez de impressa
 *            no mesmo plano. O recorte é obrigatório: sem ele o desfoque vaza
 *            para fora e suja a face da carta com um halo.
 *   fio      o traço de cor, agora com 1.5px e encostado no fio claro
 *   luz      um fio branco por dentro, no topo, onde a luz bate no bisel
 *
 * Tudo isto é desenhado **depois** da máscara, portanto por cima da arte — e por
 * isso vale igual no layout padrão e no full-art, onde a janela é quase a carta
 * inteira.
 */
function solda(win, colors) {
  const inset = (n) => ({
    x: win.x + n,
    y: win.y + n,
    width: win.width - n * 2,
    height: win.height - n * 2,
    radius: Math.max(1, win.radius - n),
  });

  const rect = (r, attrs) =>
    `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" rx="${r.radius}" fill="none" ${attrs}/>`;

  return `<defs>
    <filter id="soldaBlur"><feGaussianBlur stdDeviation="4"/></filter>
    <clipPath id="dentroDaJanela">
      <rect x="${win.x}" y="${win.y}" width="${win.width}" height="${win.height}" rx="${win.radius}"/>
    </clipPath>
  </defs>

  <g clip-path="url(#dentroDaJanela)">
    ${rect(inset(4), `stroke="${colors.ink}" stroke-opacity="0.5" stroke-width="9" filter="url(#soldaBlur)"`)}
  </g>
  ${rect(inset(0.75), `stroke="${colors.base}" stroke-opacity="0.9" stroke-width="1.5"`)}
  ${rect(inset(2), `stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="1"`)}`;
}

const METALS = {
  gold: { bright: "#FFF3B0", mid: "#FFD76A", deep: "#C9A227" },
  silver: { bright: "#F7FAFD", mid: "#E8EEF5", deep: "#C8CDD4" },
};

export const METAL_TONES = Object.keys(METALS);

/**
 * Camada metálica, aplicada por cima da moldura nos tiers que o TCG trata como
 * texturizados. É o que separa `ultra_rare` (prata) de
 * `special_illustration_rare` (ouro) quando os dois usam o mesmo full-art, e o
 * que dá à `hyper_rare` o aspecto folheado sobre o layout padrão.
 *
 * Mesma restrição do foil: só alpha, nenhum pixel opaco. O Satori não tem
 * `mix-blend-mode`, então qualquer área escura viraria véu cinza em vez de
 * metal. O contorno é desenhado como anel de traço, não como retângulo cheio.
 */
export function metalSvg(layout, tone) {
  const metal = METALS[tone];
  if (!metal) {
    throw new Error(`Tom metálico desconhecido: ${tone}`);
  }

  const { width: W, height: H, radius: R, border: B } = layout;
  const inner = { x: B, y: B, w: W - B * 2, h: H - B * 2, r: R - 6 };

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="gilt" x1="0" y1="0" x2="0.7" y2="1">
      <stop offset="0" stop-color="${metal.bright}" stop-opacity="0.95"/>
      <stop offset="0.28" stop-color="${metal.deep}" stop-opacity="0.7"/>
      <stop offset="0.52" stop-color="${metal.bright}" stop-opacity="0.98"/>
      <stop offset="0.74" stop-color="${metal.deep}" stop-opacity="0.66"/>
      <stop offset="1" stop-color="${metal.mid}" stop-opacity="0.9"/>
    </linearGradient>
    <linearGradient id="lustro" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="${metal.mid}" stop-opacity="0"/>
      <stop offset="0.4" stop-color="${metal.bright}" stop-opacity="0.16"/>
      <stop offset="0.52" stop-color="${metal.bright}" stop-opacity="0.3"/>
      <stop offset="0.64" stop-color="${metal.bright}" stop-opacity="0.14"/>
      <stop offset="1" stop-color="${metal.mid}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Anel folheado sobre a borda. Traço, não preenchimento: o miolo da carta
       precisa continuar transparente. -->
  <rect x="${B / 2}" y="${B / 2}" width="${W - B}" height="${H - B}" rx="${R - 3}"
        fill="none" stroke="url(#gilt)" stroke-width="${B}"/>

  <!-- Fio interno, onde o metal encosta na face. -->
  <rect x="${inner.x}" y="${inner.y}" width="${inner.w}" height="${inner.h}" rx="${inner.r}"
        fill="none" stroke="${metal.bright}" stroke-opacity="0.55" stroke-width="1.5"/>

  <!-- Lustro diagonal atravessando a carta inteira. -->
  <rect x="0" y="0" width="${W}" height="${H}" rx="${R}" fill="url(#lustro)"/>
</svg>`;
}

export const EDGE_STYLES = ["polished", "double"];

/**
 * Tratamento de borda por tier.
 *
 * Existe porque contagem e cor de estrela a 14px não sobrevivem a um thumbnail
 * de feed, e o feed é o destino principal da carta. O tier precisava se
 * expressar também em **superfície e borda** — a superfície é o foil, e a borda
 * é isto.
 *
 * É uma camada separada e **sem elemento**, na mesma convenção do metal e pelo
 * mesmo motivo: a RFC 8 escolheu o caminho C justamente para não multiplicar
 * tipo × raridade. Dois arquivos cobrem os oito tiers em vez de 18 × 8.
 *
 *   polished   o anel da borda clareia — a moldura lê como polida
 *   double     o mesmo anel, mais um fio interno traçando a carta por dentro
 *
 * `double` é literal de propósito: no TCG a Double Rare tem moldura articulada, e
 * um segundo fio é o que separa `rare` de `double_rare` a 150px, onde a
 * diferença de uma estrela para duas some. As duas eram indistinguíveis antes.
 *
 * Os tiers com metal não recebem borda: o anel folheado já é o tratamento da
 * borda deles, e somar os dois só apaga o folheado.
 */
export function edgeSvg(layout, style) {
  if (!EDGE_STYLES.includes(style)) {
    throw new Error(`Estilo de borda desconhecido: ${style}`);
  }

  const { width: W, height: H, radius: R, border: B } = layout;
  const inner = { x: B, y: B, w: W - B * 2, h: H - B * 2, r: R - 6 };

  /* Recuo do fio interno: entre a borda e a coluna 40..460 dos blocos, então
     ele contorna a carta inteira sem cruzar janela, ataques nem status. */
  const keyline = 9;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <!--
      Lustro, não alvejante. A primeira calibração ia a 0.40 no pico e a moldura
      da rare saía rosa-clara: o tier ficava legível às custas do elemento, que é
      a outra metade da identidade da carta. O anel tem que ler como luz correndo
      na borda, com a cor do tipo ainda por baixo.
    -->
    <linearGradient id="polido" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="${style === "double" ? 0.3 : 0.24}"/>
      <stop offset="0.34" stop-color="#FFFFFF" stop-opacity="0.04"/>
      <stop offset="0.63" stop-color="#FFFFFF" stop-opacity="0.19"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0.06"/>
    </linearGradient>
  </defs>

  <!-- Anel da borda. Traço e não preenchimento: o miolo da carta continua
       transparente, como no metal. -->
  <rect x="${B / 2}" y="${B / 2}" width="${W - B}" height="${H - B}" rx="${R - 3}"
        fill="none" stroke="url(#polido)" stroke-width="${B}"/>

  <!-- Fio claro onde a borda encosta na face. -->
  <rect x="${inner.x}" y="${inner.y}" width="${inner.w}" height="${inner.h}" rx="${inner.r}"
        fill="none" stroke="#FFFFFF" stroke-opacity="0.45" stroke-width="1.5"/>
${
  style === "double"
    ? `
  <!-- O segundo fio. Traço escuro, não área escura: uma linha composta por cima
       é uma linha; um retângulo translúcido escuro viraria véu cinza, que é o
       que o Satori sem mix-blend-mode faz com qualquer sombra chapada. -->
  <rect x="${inner.x + keyline}" y="${inner.y + keyline}" width="${inner.w - keyline * 2}"
        height="${inner.h - keyline * 2}" rx="${Math.max(2, inner.r - keyline)}"
        fill="none" stroke="#1A1614" stroke-opacity="0.34" stroke-width="1.5"/>
  <rect x="${inner.x + keyline + 2}" y="${inner.y + keyline + 2}" width="${inner.w - keyline * 2 - 4}"
        height="${inner.h - keyline * 2 - 4}" rx="${Math.max(1, inner.r - keyline - 2)}"
        fill="none" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="1"/>`
    : ""
}
</svg>`;
}

/** Glifos dos ícones de energia. Geometria primitiva, desenhada aqui do zero. */
const GLYPHS = {
  neutral: '<circle cx="12" cy="12" r="6.2" fill="none" stroke-width="3.4"/>',
  // Chama com recorte no topo e base assimétrica: a gota da água é o outro glifo
  // arredondado do conjunto, e os dois precisam ser distinguíveis a 19px.
  fire: '<path d="M12.6 1.8c.4 3.4-1.2 4.6-.5 6.3.5 1.2 1.8.9 2-.5 2.8 2.2 3.6 6.1 1.4 9-2.3 3-7.4 3.3-10 .5-2.4-2.6-2-6.5.3-8.9-.2 1.6.6 2.4 1.5 2.2 1.4-.3 1.2-2.6 5.3-8.6z"/>',
  water: '<path d="M12 3.2c3.4 5 5.4 7.6 5.4 10.4a5.4 5.4 0 1 1-10.8 0c0-2.8 2-5.4 5.4-10.4z"/>',
  grass: '<path d="M20.4 3.2C6.6 6.4 4.2 13.4 8.6 18.2c2.8 3 9.6 1 11.8-15zM9 18.6c1.2-4.2 3.6-7.4 7-9.6"  stroke-width="1.6"/>',
  electric: '<path d="M13.4 2.2 5.6 13.4h4.6l-1.8 8.4 8.4-11.6h-4.6z"/>',
  psychic:
    '<path d="M12 18.6a6.6 6.6 0 1 1 6.6-6.6c0 2.4-1.9 4-3.9 4s-3.3-1.4-3.3-3.1c0-1.4 1-2.4 2.2-2.4" fill="none" stroke-width="2.6" stroke-linecap="round"/>',
  fighting:
    '<path d="M12 1.8 14.6 9 22 11.6 14.6 14.2 12 21.6 9.4 14.2 2 11.6 9.4 9z"/>',
};

/** Ícone de energia: disco recolorido + glifo do elemento. */
export function energySvg(colors, glyphKey, size = 48) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
  <defs>
    <radialGradient id="disco" cx="0.34" cy="0.28" r="0.85">
      <stop offset="0" stop-color="${colors.base}"/>
      <stop offset="1" stop-color="${colors.dark}"/>
    </radialGradient>
  </defs>
  <circle cx="12" cy="12" r="11.2" fill="url(#disco)" stroke="#FFFFFF" stroke-opacity="0.85" stroke-width="1.4"/>
  <g fill="#FFFFFF" fill-opacity="0.95" stroke="#FFFFFF" stroke-opacity="0.95" stroke-width="0" stroke-linejoin="round">
    ${GLYPHS[glyphKey]}
  </g>
</svg>`;
}

/** Pip de custo de recuo. Cinza, fora da lógica de elementos de propósito. */
export function retreatSvg(size = 48) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="11.2" fill="#8A8F98" stroke="#FFFFFF" stroke-opacity="0.8" stroke-width="1.4"/>
  <path d="M9.4 6.6 15.2 12l-5.8 5.4" fill="none" stroke="#FFFFFF" stroke-width="2.8"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

/*
 * ---------------------------------------------------------------------------
 * Foil
 * ---------------------------------------------------------------------------
 *
 * O perfil de cada tier **não** mora aqui: está em `lib/cards/foil.json`, que é
 * lido tanto por `scripts/build-assets.mjs` quanto por `lib/cards/rarity.ts`.
 * Antes havia duas escadas — um `gain` de 0.7 a 1.65 neste arquivo e um
 * `foilIntensity()` de 0.42 a 1 no runtime — que descreviam a mesma coisa com
 * números diferentes e podiam divergir sem que nada quebrasse.
 */

/**
 * Ruído anisotrópico: linhas, não chuvisco.
 *
 * 0.006 na horizontal contra 0.085 na vertical estica o ruído em faixas de ~12px
 * de período — o padrão do foil linear do TCG. Ruído isotrópico nesta escala lê
 * como chuvisco de televisão, não como metal escovado. Os mesmos números e as
 * mesmas sementes alimentam o relevo e a máscara do espectro, e é isso que faz a
 * cor viver **nas cristas** em vez de flutuar por cima delas como um segundo
 * adesivo.
 */
const GRAIN_FREQUENCY = "0.003 0.22";
const WAVE_FREQUENCY = "0.007";
const DISPLACE_SCALE = 6;

/**
 * Curva de resposta do relevo, amostrada em seis pontos (`feFuncA type="table"`).
 *
 * Convexa de propósito: `t^1.7` esmaga o meio da faixa e preserva o topo, então
 * a luz sai como cintilância nas cristas em vez de véu branco sobre a carta
 * inteira. Uma rampa linear com ganho suficiente para as cristas aparecerem
 * levantava o fundo junto e enevoava o texto impresso — que é exatamente o risco
 * registrado no plano do revamp.
 */
const RELIEF_CURVE = [0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => t ** 2.4);

/** Quantas vezes o ciclo de bandas se repete ao longo da diagonal. */
const SPECTRAL_SWEEPS = 2.5;

/**
 * Quanto do relevo sobrevive dentro da janela da arte.
 *
 * A primeira versão aplicava as quatro camadas uniformemente na carta inteira, e
 * o resultado foi o risco que o plano do revamp já previa: sobre o avatar o
 * relevo vira névoa de linhas brancas e o rosto some. Não é problema de
 * intensidade — em qualquer força que leia como foil, um retrato por baixo é
 * apagado.
 *
 * O que fica atenuado é só o **relevo e o granulado**, que somam luz branca e
 * comem detalhe. O espectro e a lâmina atravessam a janela inteiros: cor sobre
 * foto ainda lê como holográfico e não destrói contorno. É, aliás, o que a carta
 * de verdade faz — o brilho que atravessa a ilustração é colorido, e o grão
 * metálico vive na superfície ao redor dela.
 */
const ART_WINDOW_RELIEF = 0.26;

/**
 * Camada de foil, aplicada por cima da moldura nos seis tiers a partir de `rare`
 * (RFC 8, caminho C). No TCG a Rare já vem com holográfico básico, por isso o
 * corte não é mais só nos dois tiers do topo.
 *
 * São quatro camadas, e cada uma existe por um motivo distinto — as mesmas
 * quatro da pilha ao vivo em `components/card/TiltCard.tsx`, congeladas num
 * ângulo fixo:
 *
 *   relevo     ruído anisotrópico aceso por uma luz especular parada
 *   espectro   faixas de cor mascaradas pelo mesmo ruído, varrendo a diagonal
 *   lâmina     o reflexo duro da fonte de luz, atravessando a carta
 *   granulado  poeira fina por cima, para nada ler como gradiente
 *
 * A luz é **estática**, e é `feDistantLight` e não `fePointLight`: a imagem
 * exportada não anima (`docs/decisions.md`), então o que a versão ao vivo obtém
 * movendo a luz aqui se obtém escolhendo um ângulo e congelando nele. Luz
 * pontual foi tentada primeiro e ilumina o grão só em volta do ponto — as linhas
 * apareciam num terço da carta e sumiam no resto. Luz distante não tem posição,
 * só direção, então o grão fica parelho de borda a borda; o ponto quente que ela
 * não dá é justamente o trabalho da lâmina, que é uma camada separada.
 *
 * Com `fullArt`, a atenuação da janela cobre quase a carta inteira, e é por isso
 * que existe um PNG por variante: `foil-<tier>.png` e `fullart-foil-<tier>.png`,
 * na mesma convenção das molduras.
 *
 * Tudo continua sendo alpha — nenhum pixel opaco, nenhum preto. O Satori compõe
 * imagem com alpha simples e não tem `mix-blend-mode`: qualquer área escura
 * viraria véu cinza por cima da carta em vez de brilho. Por isso o granulado
 * nasce de `luminanceToAlpha` (que devolve preto com alpha variável) e é
 * imediatamente recolorido de branco por um `feFlood` + `feComposite operator="in"`
 * — o que sobra do ruído é só a máscara dele.
 */
export function foilSvg(layout, profile, { fullArt = false } = {}) {
  const { width: W, height: H, radius: R } = layout;
  const win = fullArt ? layout.fullArt.window : layout.window;

  const { intensity, bands } = profile ?? {};
  if (typeof intensity !== "number" || !Array.isArray(bands) || bands.length === 0) {
    throw new Error(`Perfil de foil inválido: ${JSON.stringify(profile)}`);
  }

  /** Cinza opaco cujo valor de luminância é o fator de atenuação da máscara. */
  const attenuation = Math.round(ART_WINDOW_RELIEF * 255)
    .toString(16)
    .padStart(2, "0")
    .repeat(3);

  /*
   * Uma escada só. `intensity` vem de `foil.json` (0.42 na `rare`, 1 na
   * `hyper_rare`) e multiplica as quatro camadas, então subir um tier clareia o
   * foil impresso e o foil ao vivo na mesma proporção.
   */
  const reliefAmplitude = 1.4 + 1.8 * intensity;
  const reliefTable = RELIEF_CURVE.map((v) => Math.min(1, v * reliefAmplitude).toFixed(4)).join(" ");

  const spectralStops = spectral(bands, intensity);

  /** Uma lâmina de luz: transparente → clara → transparente. */
  const blade = (center, halfWidth, peak) =>
    [
      `<stop offset="${clamp01(center - halfWidth).toFixed(3)}" stop-color="#FFFFFF" stop-opacity="0"/>`,
      `<stop offset="${clamp01(center).toFixed(3)}" stop-color="#FFFFFF" stop-opacity="${(peak * intensity).toFixed(3)}"/>`,
      `<stop offset="${clamp01(center + halfWidth).toFixed(3)}" stop-color="#FFFFFF" stop-opacity="0"/>`,
    ].join("\n      ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <!--
      Relevo especular. A região do filtro sobra 10% para cada lado porque o
      feDisplacementMap empurra pixels para fora da caixa: com a região justa a
      ondulação some cortada nas quatro bordas, que é justamente onde a moldura
      está.
    -->
    <filter id="relevo" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="${GRAIN_FREQUENCY}" numOctaves="3" seed="7" result="grao"/>
      <feTurbulence type="turbulence" baseFrequency="${WAVE_FREQUENCY}" numOctaves="2" seed="3" result="onda"/>
      <feDisplacementMap in="grao" in2="onda" scale="${DISPLACE_SCALE}" xChannelSelector="R" yChannelSelector="G" result="ondulado"/>
      <feColorMatrix in="ondulado" type="luminanceToAlpha" result="altura"/>
      <feSpecularLighting in="altura" surfaceScale="4" specularConstant="0.9" specularExponent="22"
                          lighting-color="#FFFFFF" result="luz">
        <feDistantLight azimuth="250" elevation="52"/>
      </feSpecularLighting>
      <feComposite in="luz" in2="altura" operator="in" result="cristas"/>
      <feComponentTransfer in="cristas">
        <feFuncA type="table" tableValues="${reliefTable}"/>
      </feComponentTransfer>
    </filter>

    <!--
      Máscara do espectro: o mesmo ruído, em tom de cinza, comprimido em
      0.42..1. O piso não é zero de propósito — a cor precisa existir no vale
      também, senão o espectro vira listra em vez de superfície.
    -->
    <filter id="cristas" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="${GRAIN_FREQUENCY}" numOctaves="3" seed="7" result="grao"/>
      <feTurbulence type="turbulence" baseFrequency="${WAVE_FREQUENCY}" numOctaves="2" seed="3" result="onda"/>
      <feDisplacementMap in="grao" in2="onda" scale="${DISPLACE_SCALE}" xChannelSelector="R" yChannelSelector="G" result="ondulado"/>
      <feColorMatrix in="ondulado" type="luminanceToAlpha" result="altura"/>
      <feFlood flood-color="#FFFFFF" result="branco"/>
      <feComposite in="branco" in2="altura" operator="in" result="linhas"/>
      <feComponentTransfer in="linhas">
        <feFuncA type="linear" slope="0.58" intercept="0.42"/>
      </feComponentTransfer>
    </filter>
    <mask id="linhas">
      <rect x="0" y="0" width="${W}" height="${H}" filter="url(#cristas)"/>
    </mask>

    <!--
      Superfície: tudo menos a janela da arte. A borda é desfocada porque um
      degrau seco na intensidade do foil bem na moldura da janela lê como defeito
      de impressão, e não como o brilho passando por baixo da ilustração.
    -->
    <filter id="suavizar">
      <feGaussianBlur stdDeviation="7"/>
    </filter>
    <mask id="superficie">
      <rect x="0" y="0" width="${W}" height="${H}" fill="#FFFFFF"/>
      <rect x="${win.x}" y="${win.y}" width="${win.width}" height="${win.height}" rx="${win.radius}"
            fill="#${attenuation}" filter="url(#suavizar)"/>
    </mask>

    <!--
      Granulado: ruído fino, recolorido de branco. A frequência é 0.5 e não 0.7
      porque a 0.7 o grão tem ~1px e some no reamostramento de qualquer
      visualização abaixo de 100% — pagava 80 KB por camada invisível.
    -->
    <filter id="granulado" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="1" seed="11" result="poeira"/>
      <feColorMatrix in="poeira" type="luminanceToAlpha" result="alfa"/>
      <feComponentTransfer in="alfa" result="esparso">
        <feFuncA type="table" tableValues="0 ${(0.09 * intensity).toFixed(3)} ${(0.26 * intensity).toFixed(3)} ${(0.52 * intensity).toFixed(3)}"/>
      </feComponentTransfer>
      <feFlood flood-color="#FFFFFF" result="branco"/>
      <feComposite in="branco" in2="esparso" operator="in"/>
    </filter>

    <!--
      Espectro. As bandas se repetem ${SPECTRAL_SWEEPS} vezes ao longo da
      diagonal em vez de uma só: no foil linear de verdade o matiz volta várias
      vezes na mesma carta, e um único arco de quatro paradas lê como gradiente
      de fundo de site.
    -->
    <linearGradient id="espectro" x1="0" y1="1" x2="1" y2="0">
      ${spectralStops}
    </linearGradient>

    <linearGradient id="lamina" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/>
      ${blade(0.38, 0.24, 0.08)}
      ${blade(0.38, 0.045, 0.3)}
      ${blade(0.67, 0.022, 0.17)}
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>

    <!-- Os filtros substituem o desenho do elemento inteiro e ignoram o rx;
         quem devolve o canto arredondado da carta é este recorte. -->
    <clipPath id="carta">
      <rect x="0" y="0" width="${W}" height="${H}" rx="${R}"/>
    </clipPath>
  </defs>

  <!-- Na ordem das quatro camadas. Relevo e granulado recuam sobre a arte
       (mask superficie); espectro e lâmina atravessam a janela inteiros. -->
  <g clip-path="url(#carta)">
    <g mask="url(#superficie)">
      <rect x="0" y="0" width="${W}" height="${H}" filter="url(#relevo)"/>
    </g>
    <g mask="url(#linhas)">
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#espectro)"/>
    </g>
    <rect x="0" y="0" width="${W}" height="${H}" fill="url(#lamina)"/>
    <g mask="url(#superficie)">
      <rect x="0" y="0" width="${W}" height="${H}" filter="url(#granulado)"/>
    </g>
  </g>
</svg>`;
}

/**
 * Paradas do gradiente espectral.
 *
 * A opacidade oscila junto com a repetição das bandas: ciclos alternados chegam
 * mais fortes que os vizinhos. Sem essa onda a repetição vira papel de parede —
 * o olho encontra o período e o efeito deixa de ler como reflexo.
 */
function spectral(bands, intensity) {
  const count = Math.round(bands.length * SPECTRAL_SWEEPS);

  return Array.from({ length: count + 1 }, (_, i) => {
    const t = i / count;
    const wave = 0.6 + 0.4 * Math.sin(t * Math.PI * 1.7 + 0.5);
    const opacity = 0.46 * intensity * wave;
    return `<stop offset="${t.toFixed(3)}" stop-color="${bands[i % bands.length]}" stop-opacity="${opacity.toFixed(3)}"/>`;
  }).join("\n      ");
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

export const GLYPH_KEYS = Object.keys(GLYPHS);
