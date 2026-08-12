# Referência de foil — técnica derivada do ReflectiveCard (React Bits)

Fonte: `DavidHDev/react-bits`, `src/ts-default/Components/ReflectiveCard/`. MIT + Commons Clause.

**O que foi descartado:** o componente original alimenta o reflexo com a webcam do visitante (`navigator.mediaDevices.getUserMedia`) e traz conteúdo de crachá (nome, cargo, ID) mais ícones `lucide-react`. Nada disso entra. Aproveita-se só a pilha de filtro.

**O que foi mantido:** o filtro SVG que produz relevo metálico com luz especular. É isso que diferencia foil de TCG de um gradiente animado.

```
feTurbulence      type="turbulence" baseFrequency=0.03/noiseScale numOctaves=2   → ruído procedural
feColorMatrix     luminanceToAlpha                                               → ruído vira mapa alpha
feDisplacementMap scale=displacementStrength (20) xChannel=R yChannel=G          → ondula a superfície
feSpecularLighting surfaceScale=20 specularConstant=1.2 specularExponent=20
                   lightingColor=#ffffff + fePointLight                          → brilho especular
feComposite       operator="in"                                                  → recorta o brilho
feBlend           mode="screen"                                                  → funde com a superfície
```

## Adaptação para o gitmon

| Original | Aqui |
|---|---|
| `<video>` com webcam como camada de reflexo | nenhuma: o que está embaixo é o próprio PNG da carta |
| `fePointLight` em posição fixa `x=0 y=0 z=300` | `x`/`y` seguem o ponteiro, reaproveitando a posição que o `TiltCard` já calcula |
| Loop automático | sem loop: a luz só se move com o cursor |
| Aplicado ao card inteiro como container | camadas `position: absolute; inset: 0` **sobre o PNG**, dentro do `.tilt-card` existente (RFC 7.1) |
| Sempre ativo | só quando `hasFoil(rarity)` é true, e com intensidade por tier (`foilIntensity`) |

## O que está implementado

`components/card/TiltCard.tsx` + `.tilt-*` em `app/globals.css`. Quatro camadas,
cada uma com um trabalho distinto — a separação importa, porque foi tentar fazer
uma camada só resolver cor **e** luz que produziu a primeira versão enevoada:

| Camada | Papel | Blend |
|---|---|---|
| `.tilt-foil` | relevo especular (o filtro acima), mascarado em volta do ponteiro | `screen` |
| `.tilt-spectral` | faixas de arco-íris que varrem com a inclinação | `color` |
| `.tilt-sheen` | lâmina diagonal, o reflexo duro da fonte de luz | `overlay` |
| `.tilt-grain` | granulado fixo, tira a lisura de gradiente CSS | `overlay` |

Duas decisões que custaram tentativa e erro:

- **`mix-blend-mode: color` no espectro, não `color-dodge` nem `hard-light`.** A
  arte destas cartas é clara, e qualquer modo que some luz satura para branco e
  enevoa nome, stats e rosto. `color` troca só matiz e saturação, preserva a
  luminosidade do que está embaixo, e por isso o texto continua legível com a
  carta inteira em arco-íris.
- **O espectro e o relevo são mascarados por um radial preso ao ponteiro.**
  Espalhados pela carta inteira eles leem como filtro de foto; concentrados num
  ponto que se move, leem como reflexo.

O `feDisplacementMap` da pilha original, que a primeira implementação tinha
descartado, voltou — mas deslocando **ruído por ruído** (um `feTurbulence`
anisotrópico ondulado por outro de frequência baixa), e não a `SourceGraphic`
como no React Bits. Lá a fonte é o vídeo da webcam; aqui a fonte é um `<rect>`
sólido, e deslocar um retângulo de cor uniforme não produz nada.

A frequência anisotrópica (`baseFrequency="0.004 0.09"`) é o que dá linhas em vez
de chuvisco: é o padrão do foil linear do TCG.

## Movimento reduzido

`prefers-reduced-motion: reduce` já zera transições globalmente em
`app/globals.css`; a camada vira brilho estático, não some. Quem faz isso
acontecer é o `TiltCard` **não escrever nada**: o laço de rAF nem começa, então
não há custom property inline vencendo a regra de media query que monta o brilho
parado.
