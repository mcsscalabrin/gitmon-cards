# Revamp visual — plano

Plano de execução do revamp de carta e site. Direção resolvida com a skill
Impeccable; contexto de produto em [`PRODUCT.md`](../PRODUCT.md). O registro do
sistema **como ficou** continua sendo [`design-system.md`](design-system.md), que
só se atualiza depois de construído — nunca com a intenção.

## A descoberta que reordena tudo

O destino principal da carta passou a ser **feed social**, e no feed o PNG é o
produto inteiro: não há site em volta. Mas o foil holográfico de quatro camadas
vive só no site (`components/card/TiltCard.tsx`). O que chega no feed é o
`foil-<rarity>.png` estático assado por `scripts/build-assets.mjs`, que hoje é a
parte visualmente mais fraca do produto.

**O melhor efeito do projeto é invisível exatamente no momento que mais importa.**
É isso que coloca a carta exportada como fase 1, na frente do site.

## O que as travas realmente dizem

Verificado contra a RFC, não assumido:

| Trava | Situação real | Consequência |
|---|---|---|
| RFC 9.6, "imagem limpa" | É a seção de **monetização**: sponsor nunca na imagem exportada. Não diz nada sobre craft visual | Enriquecer o foil exportado **já é permitido**. Sem adendo |
| "sem animação" na imagem | Invariante real (`decisions.md`) | O foil melhor tem que ser **estático**. Nada de APNG/WebP animado |
| "nenhuma webfont" | Não aparece na RFC. É registro do estado atual em `design-system.md` | Decisão de performance, não de arquitetura. Muda com uma linha no design-system |

Nenhuma das cinco mudanças de carta altera o **formato do dado**, então nenhuma
exige subir `CARD_VERSION`.

## Direção travada

**Canon, comprometido.** A carta de TCG no arranjo que a pessoa já espera —
moldura, janela de arte, pips de energia, faixa de status — executada com o melhor
acabamento possível. Escolha deliberada do autor diante de alternativas; registrada
como compromisso de marca em `PRODUCT.md`. Alinha com a RFC 5, que já declarava
fidelidade visual ao TCG como objetivo.

Sem ironia, sem reinterpretação autoral da moldura, sem quirk contrabandeado.

**Régua de craft** — a carta tem que sentar ao lado destes três sem parecer amadora:

1. **Pokémon TCG moderno** — foil por tier, integração arte/moldura, hierarquia
   densa que ainda lê à distância.
2. **Topps / Panini chrome** — acabamento metálico e numeração serializada **como
   elemento de design**.
3. **Spotify Wrapped / GitHub Skyline** — lê em um segundo no scroll, funciona
   pequeno, o número é o herói.

---

## Fase 1 — a carta exportada — **FEITA**

Maior retorno: é o que viaja. Tudo aqui é `lib/cards/layout.json`,
`lib/og/renderCard.tsx` e `scripts/build-assets.mjs`.

Os cinco itens estão implementados, em cinco commits. O registro do sistema
**como ficou** está em [`design-system.md`](design-system.md), que é onde ele
deve ser lido; o que segue abaixo é o plano como foi escrito, mantido porque as
razões continuam valendo. Três coisas só apareceram construindo, e nenhuma
estava prevista aqui:

1. **O foil enterrava a arte.** O risco estava previsto na tabela de riscos, mas
   como questão de calibração. Não é: em qualquer força que leia como foil, um
   retrato por baixo é apagado. A saída foi separar as camadas que somam luz
   branca (relevo, granulado — recuam a 26% na janela) das que somam cor
   (espectro, lâmina — atravessam inteiras).
2. **A vertical do layout já estava no limite.** "Subir o piso de arte" não era
   uma folga esperando ser usada; exigiu recalcular o empilhamento inteiro.
3. **`rare` e `double_rare` eram a mesma carta**, e `hyper_rare` contra `rare` já
   lia depois da fase 1.1. O alvo declarado da 1.3 estava cumprido antes de ela
   começar, e o problema real era outro — só visível renderizando os oito tiers
   lado a lado a 150px.

### 1.1 Reassar o foil por tier

O que a camada ao vivo provou que funciona, congelado num ângulo:

- ruído **anisotrópico** (linhas, não chuvisco) como relevo base;
- faixa espectral que muda de matiz ao longo da carta;
- lâmina diagonal de sheen;
- granulado fino por cima, para não parecer gradiente.

Seis arquivos, um por tier com foil. A intensidade acompanha `foilIntensity()`,
que já existe e já é testada — o foil impresso e o foil ao vivo passam a ler a
mesma escada em vez de divergirem.

### 1.2 Serial como elemento de design — **nos dois estados**

Hoje: `#0042` a 13px no rodapé, ao lado do símbolo. Contra a régua Topps, é o
elemento mais desperdiçado da carta — e é a única coisa verdadeiramente escassa
que o produto tem, porque não pode ser recalculada.

A regra que evita o buraco:

> A composição do rodapé é desenhada **para a carta sem serial**. O serial é uma
> adição que a valoriza, nunca um slot que esvazia.

| Estado | Composição |
|---|---|
| **Com serial** (Redis) | Numeração serializada em peso alto, 3–4× a escala atual |
| **Sem serial** (dev, ou Redis fora) | O tier e o símbolo assumem o espaço; nada se desloca, nada fica vazio |

Isso mantém honesta a decisão já tomada: carta sem número é aceitável, carta com
número errado não é.

### 1.3 Raridade legível em um segundo

Contagem + cor de estrela a 13–18px não sobrevive a um thumbnail de feed. Alvo
declarado: **distinguir `hyper_rare` de `rare` sem ler texto**, num thumbnail.

O tier passa a se expressar em **superfície e borda**, não só em símbolo —
aproveitando a escada de tratamento que já existe (`cardTreatment`), que hoje só
diferencia full-art e metal.

### 1.4 Mais arte, e a solda arte/moldura

A janela é `390×300` num canvas `500×700`: **33% da carta**. Só 3 dos 8 tiers
recebem full-art. Contra a régua Pokémon moderno, é o ponto fraco do layout padrão.

Subir o piso de arte e tratar a transição arte/moldura, que hoje é um retângulo
arredondado com stroke.

### 1.5 HP como herói numérico

`hp.size: 34` contra `name.size: 30` — os dois competem e nenhum vence. Na régua
Wrapped, o número é o herói.

---

## Fase 2 — compartilhamento — **FEITA**

Entrou no escopo por decisão sua. **Tensão registrada:** na rodada de init você
escolheu "sem abrir frentes novas", e a opção citava OG do site como exemplo. OG
é o item mais barato e de maior alcance desta fase; incluí, mas é o primeiro
candidato a corte se você quiser manter a frente estreita.

O plano errou o custo do OG, e por uma razão que só aparece olhando: as tags já
existiam nas duas páginas desde antes, apontando para o `/<id>.png`. O item não
era "escrever `metadata`" — era descobrir que **a carta é 5:7 e as prévias de
link são 1.91:1**, e que o X e o LinkedIn cortavam pelo centro, comendo o
cabeçalho e o rodapé. A carta chegava decapitada exatamente no lugar de maior
alcance. Foi preciso uma imagem em paisagem, `renderCardOg`, que embute o PNG
real em vez de recompor a carta — o projeto só tem uma carta e é assim que
continua tendo (RFC 4.2).

| Item | Por quê | Custo |
|---|---|---|
| **OG na página da carta** | Colar a URL da página no X/LinkedIn passa a renderizar a carta. É o maior alcance por menos código | Baixo — `metadata` do Next, rota de imagem já existe |
| **Baixar PNG** | Feed-first exige o arquivo em mãos; hoje só há markdown de embed | Baixo |
| **Web Share API** | Compartilhar nativo no mobile, com fallback para copiar | Baixo |

O snippet de README continua onde está: é o destino secundário, não some.

---

## Fase 3 — o site — **FEITA**

O custo da webfont saiu **abaixo** do orçado: o plano contava ~43 KB por peso,
que é o TTF que o Satori consome. O navegador aceita WOFF2 — o mesmo subset
comprimido com Brotli — e são 14 KB por peso. Com dois pesos, 28 KB no total.

A 3.2 mudou de forma ao ser construída. "Usar `--element` em mais lugares" viraria
mais texto colorido, que é justamente o sintoma. O que faltava era **superfície**:
7% do tipo no fundo das caixas e 22% nas bordas mudam a temperatura da página
inteira sem uma palavra trocar de cor. É a mesma correção que a carta recebeu na
fase 1.3.

### 3.1 Webfont

Aprovado o custo de perf. **A face não é nova: é a da carta.** M PLUS Rounded 1c
já está versionada em `public/assets/fonts/`, já subsetada para latim (~43 KB por
peso) por `npm run fonts`.

O ganho é maior que tipografia: o site passa a falar a língua da carta em vez de
parecer um invólucro genérico em volta dela. Display e títulos na face da carta;
corpo e UI seguem na stack de sistema, onde ela é boa e custa zero.

### 3.2 Cor de elemento no resto da página

A auréola de tipo atrás da carta já existe. `--element` está disponível no painel
inteiro e ainda é usado quase só em texto de 13px.

---

## O que não muda

Fórmulas (travadas na RFC 6.1/6.2) · tom técnico-neutro (RFC 9.2) · i18n desde a
primeira tela · arte 100% original, nenhum asset da Pokémon Company · `layout.json`
e `palette.json` como fonte única · ausência de login e de estado por pessoa ·
imagem exportada sem sponsor, sem marca d'água e **sem animação**.

## Como verificar

A regra mais cara do projeto vale aqui inteira: **o que quebra em layout só quebra
olhando.**

- Carta: `PREVIEW=<dir> npm test` e olhar os PNGs — os 18 tipos e os 8 tiers.
  No PowerShell, `$env:PREVIEW="out"; npm test`.
- Site: `npm run dev` e olhar, nos dois idiomas e nos dois breakpoints.
- Feed: olhar a carta **reduzida a ~300px** e a ~600px. O alvo de 1 segundo se
  verifica no thumbnail, não no monitor inteiro.
- `npm run typecheck`, `npm test`, `npm run test:e2e` antes do PR. Não há CI.

## Riscos

| Risco | Mitigação |
|---|---|
| Foil mais forte prejudica legibilidade do texto impresso | A lição da camada ao vivo já está aprendida: modo que **soma luz** satura a arte clara e enevoa o texto. Verificar nos 18 tipos, não em um |
| Serial herói numa carta sem serial | Resolvido por construção: rodapé desenhado para o estado sem serial |
| Webfont atrasa a primeira pintura | Subset já existe; `font-display` e escopo restrito a display/títulos |
| Mais arte quebra o rodapé ou os ataques | `layout.json` é fonte única lida por build e runtime; mudar num lugar só é o erro clássico aqui |

## Decisões em aberto que este plano depende

- **Q11 / Q12** — provedor de Redis e deploy. O estado "sem serial" deixa de ser
  hipótese e vira estado desenhado, então o plano não trava esperando; mas em
  produção sem Redis, nenhuma carta terá o elemento novo.
- **Q10** — os 3 perfis de exemplo da home são fixos no código.
