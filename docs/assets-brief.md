# Briefing de arte

## Regra inegociável

Nenhum asset da Pokémon Company. Nenhum ícone dos repositórios de referência — o
`trading-card-generator` credita ILKCMP e o `pokemon-card-generator` credita TheDuckTamerBlanks,
ambos ilustradores de fã. **O que foi extraído deles é especificação numérica de posição e tamanho,
não arquivo.** Toda moldura, ícone de tipo e ícone de energia deste projeto é arte original.

## O que precisa existir

| Asset | Quantidade | Destino |
|---|---|---|
| Moldura de carta | 7 (uma por elemento) | `public/assets/frames/` |
| Moldura full-art | 7 (uma por elemento) | `public/assets/frames/fullart-*` |
| Ícone de energia/custo | 7 | `public/assets/energy/` |
| Ícone de tipo (pequeno — fraqueza/resistência/recuo) | 7 + 1 de recuo | `public/assets/icons/` |
| Overlay de foil | 12 (dois por tier a partir de `rare`) | `public/assets/frames/foil-*` e `fullart-foil-*` |
| Overlay metálico | 2 (ouro e prata) | `public/assets/frames/metal-*` |
| Overlay de borda | 2 (polida e dupla) | `public/assets/frames/edge-*` |
| Fontes | 1-2 famílias, licença livre para embed | `public/assets/fonts/` |

O foil deixou de ser "1-2 só nas raridades altas": no TCG a `rare` já vem com
holográfico básico, então são **seis** tiers com foil — e dois arquivos por
tier, porque o foil recua sobre a janela da arte e a janela do full-art é outra.
Somaram-se ainda as molduras full-art e os dois metais, que são o que distingue
os tiers de ilustração entre si. Tudo gerado por `scripts/build-assets.mjs`.

Tipos: são **18**, não os 7 elementos originais, e `neutral` virou `normal` —
`normal, fire, water, grass, electric, ice, fighting, poison, ground, flying,
psychic, bug, rock, ghost, dragon, dark, steel, fairy`. Ver o adendo na seção 4.4
da RFC.

Os ícones de tipo são os primeiros assets do projeto que **não** são gerados por
código: chegaram prontos como SVG em `scripts/assets/types/`, já no formato de
disco colorido com glifo branco. Cada um vira duas saídas — um PNG para o Satori
compor na carta e uma cópia do SVG em `public/assets/types/` para a interface web
usar sem rasterizar. A paleta de `palette.json` foi extraída deles, e não o
contrário.

### Revisão v2

A segunda leva trocou os 18 ícones. O disco continua original — cor chapada,
realce radial no alto à esquerda, sombra vertical e um aro branco a 22% —, mas o
**glifo deixou de ser desenhado à mão e passou a vir do [Lucide](https://lucide.dev)**,
sob licença ISC. É a única arte de terceiros no projeto, e o crédito está no
README junto do aviso de copyright.

Duas consequências que valem registro:

- Os SVGs vêm em `width`/`viewBox` de **64**, não de 256 como a v1. O PNG de
  energia não herda mais esse número: `build-assets.mjs` fixa o lado em
  `ENERGY_PX`, senão trocar a arte mudaria em silêncio a resolução do que o
  Satori compõe.
- Os discos da v2 são bem mais saturados que os da v1 (`fire` foi de `#E4613E`
  para `#FF3B14`). Como `palette.json` é extraída do disco, **as molduras
  mudaram junto** — a regra de fonte única foi mantida, e é ela que fez a carta
  inteira acompanhar a troca dos ícones.

## Caminho escolhido — a decidir

O RFC seção 8 deixou três caminhos abertos e **recomenda começar pelo C**:

**C — moldura vetorial única (SVG), recolorida por variável por tipo, com holo/foil como camada
PNG separada só nos tiers altos.** Não multiplica tipo × raridade, fidelidade alta o suficiente,
fácil de expandir. Migrar para o caminho A (arte original desenhada à mão, por tipo) depois que o
projeto validar tração — é o de menor custo de troca.

Os outros: **A** = arte original comissionada/desenhada (melhor marca, mais trabalho manual);
**B** = geração via IA, uma base por raridade (rápido de iterar, inconsistente entre gerações).

**Ainda não decidido.** Definir antes de qualquer trabalho de arte.

## Restrições técnicas

- A moldura é colada **por cima** da arte central e precisa ter a "janela" recortada com bordas
  transparentes (ver [`layout-spec.md`](layout-spec.md)) — PNG com alpha, não JPEG.
- Satori não suporta `mask-image` do CSS. Qualquer recorte suave tem que ser assado em `sharp`
  no servidor antes de entrar na composição.
- Peso importa: os assets viajam em toda geração serverless. Otimizar (webp onde couber, PNG-8
  quando a paleta permitir).
- A paleta segue a lógica dos 18 tipos, **não** a paleta pessoal do autor — o produto tem
  identidade visual própria (RFC 9.3).
