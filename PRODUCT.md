# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primário: o desenvolvedor gerando a própria carta.** Chega pelo link de alguém
ou pelo repositório, digita o próprio usuário e quer se ver virar carta. A
entrada é sempre o próprio perfil; a permanência vem de gerar a carta de gente
conhecida, comparar e batalhar.

O visitante nunca faz login e nunca tem conta — o token do GitHub é do servidor.
Não há usuário autenticado, nem estado por pessoa: qualquer carta é uma URL que
qualquer um pode abrir.

## Product Purpose

Transformar dado real da API do GitHub numa carta de TCG, servida como **URL de
imagem estática, embutível e que se atualiza sozinha**.

Sucesso é a pessoa querer mostrar a carta — primeiro postando em feed social,
depois embutindo no próprio README. O produto não retém ninguém: entrega uma
imagem e some.

## Positioning

Todo número da carta é **derivado de dado da API por fórmula fixa e documentada**
(RFC 6.1 e 6.2), e nenhum texto é inventado — nomes de ataque são nomes de
repositório ou logins reais de contribuidor, e o rodapé é template a partir dos
números. Um gerador vizinho que sorteasse stats ou escrevesse flavor text não
poderia copiar essa afirmação.

Os dois corolários que sustentam a posição:

- **Sem login.** O token é do servidor, então a carta de qualquer pessoa existe
  sem que ela precise participar.
- **A URL se atualiza sozinha.** O README de alguém mostra o estado de hoje, não
  o do dia em que colou o link.

## Operating Context

A carta viaja em dois lugares, nesta ordem de prioridade:

1. **Feed social** (X, LinkedIn, Bluesky) — destino principal. Imagem grande,
   vista isolada, rolada rápido. É onde a carta precisa ganhar atenção sozinha,
   sem o contexto do site em volta.
2. **README de repositório** — destino secundário e o formato original. Vista a
   ~300px de largura, inline ao lado de texto, sobre tema claro **ou** escuro do
   GitHub, que o produto não controla.

O site em volta (busca, radar, painel de derivações, batalha, abertura de pacote)
existe para produzir e explicar a carta. Ele **não** viaja junto: o PNG exportado
é deliberadamente limpo.

## Capabilities and Constraints

**O que existe hoje:** carta de perfil e de repositório, batalha 1v1 com
resultado imutável e compartilhável, duelo 1v1 dirigido e Speed Duel completo
em arena estilo Duel Links (decks de devs do GitHub, fases, posições e
magias/armadilhas), site bilíngue PT/EN com toggle manual, radar de assinatura
do perfil, painel de derivações, abertura de pacote, foil holográfico ao vivo
seguindo o ponteiro.

**Restrições técnicas travadas:**

- A imagem é composta por **Satori + sharp**, não por browser headless (RFC 4.3).
  Satori não implementa `min-width: auto`, `text-overflow: ellipsis` nem
  `mask-image`. Larguras são explícitas em `layout.json`, texto é truncado na
  origem, e qualquer recorte suave é assado em `sharp` antes da composição.
- **A complexidade visual é resolvida antes**, como arte estática pré-renderizada.
  O servidor só posiciona texto e cola imagem recortada sobre moldura PNG.
- Canvas da carta: **500×700**. `layout.json` e `palette.json` são fonte única,
  lidas pelo build e pelo runtime.
- **A imagem exportada é limpa (RFC 9.6).** Sem marca d'água, sem link de
  patrocínio, sem animação, sem afordância de navegação. `derivations` e
  `ratings` são opcionais no domínio precisamente porque o renderizador de
  imagem nunca os lê.
- **Tom técnico-neutro (RFC 9.2).** Sem piada, sem humanização, sem flavor text
  inventado no estilo TCG.
- Mudança de formato da carta exige subir `CARD_VERSION`, senão carta velha em
  cache quebra ao renderizar.

**Vocabulário do domínio:** 18 tipos (não 7 elementos — ver adendo da RFC 4.4),
8 tiers de raridade na escada do TCG Pokémon, PS, ataques, fraqueza, resistência,
recuo, número de série.

**Explicitamente indeciso:** deploy e domínio não feitos (Q12); provedor de Redis
não escolhido (Q11); aval do desvio de dano na batalha (Q9); os 3 perfis de
exemplo da home são fixos no código (Q10).

## Brand Commitments

- **Identidade autônoma (RFC 9.3).** A marca do produto não herda a paleta
  pessoal do autor. A paleta das cartas é ainda outra coisa: segue os 18 tipos.
- **Toda a arte é original.** Nenhum asset da Pokémon Company, nenhum ícone de fã
  dos repositórios de referência — nem como placeholder temporário. As cores dos
  18 tipos são **extraídas do disco colorido do próprio ícone** de cada tipo, não
  escolhidas à mão, o que torna ícone e moldura a mesma cor por construção.
- Nome: **Gitmon Cards**. Licença MIT, autor Matheus Scalabrin.
- Destino é um subdomínio de `scalabrin.dev`; **sem hardcode de domínio** em
  lugar nenhum.
- **i18n desde a primeira tela** (RFC 9.1), toggle manual PT/EN, sem auto-detect.

**Preferência permanente de direção visual (escolhida em 12/08/2026).** Diante de
uma rodada de direções alternativas, o autor escolheu deliberadamente o **padrão
da categoria**: a carta de TCG no arranjo que a pessoa já espera — moldura, janela
de arte, pips de energia, faixa de status — executada com o melhor acabamento
possível. Isso é compromisso, não falta de ambição, e alinha com a RFC 5, que já
declarava fidelidade visual ao TCG como objetivo.

Consequência para trabalho futuro: convenção é o compromisso. Nada de ironia,
nada de quirk contrabandeado, nada de "reinterpretar" a moldura para parecer
autoral. Quem quiser trocar o mundo visual precisa reabrir esta decisão com o
autor, não contorná-la em execução.

**Régua de craft.** A carta deve poder sentar ao lado destes três sem parecer
amadora:

1. **Pokémon TCG moderno** (era Scarlet & Violet) — texturas de foil por tier,
   integração arte/moldura, hierarquia tipográfica densa que ainda lê à distância.
2. **Topps / Panini chrome** — acabamento metálico e **numeração serializada como
   elemento de design**, não como rodapé.
3. **Spotify Wrapped / GitHub Skyline** — a régua de artefato-de-stat feito para
   feed: lê em um segundo no scroll, funciona pequeno, e o número é o herói.

## Evidence on Hand

- Dados reais da API do GitHub, sem fixture inventada em produção.
- Arte original versionada em `public/assets/`: 18 molduras por tipo, 18 full-art,
  6 foil, 2 metais, 18 ícones de energia, 18 ícones de tipo em SVG.
- Fonte da carta: M PLUS Rounded 1c (SIL OFL 1.1), subsetada para latim.
- Calibração de raridade contra perfis reais **medidos pela API**, não estimados,
  registrada no cabeçalho de `lib/cards/rarity.ts`.
- 106 testes unitários e 13 e2e.

**Ausências que trabalho futuro não pode fabricar:** não há usuários, métricas de
uso, depoimentos, imprensa nem benchmarks — o produto nunca foi publicado. O
repositório tem 2 estrelas. Nada disso pode aparecer como prova social.

## Product Principles

1. **O dado fala por si.** Nenhum número sem fórmula, nenhum texto sem origem na
   API. Fidelidade ao dado vem antes de fidelidade ao TCG.
2. **A imagem que viaja é limpa.** Tudo que explica, navega ou monetiza fica no
   site. O PNG no README de outra pessoa não carrega o produto junto.
3. **A raridade é o gancho.** É o que faz a pessoa querer mostrar a carta, e por
   isso a escada precisa continuar significando alguma coisa no topo.
4. **Complexidade resolvida antes, não em runtime.** Arte pré-renderizada, não
   composição cara por request.
5. **Sem login, sem estado por pessoa.** Qualquer carta é uma URL pública.

## Accessibility & Inclusion

- `prefers-reduced-motion: reduce` desliga toda animação; efeitos com movimento
  viram estado estático em vez de sumirem.
- Geometria nunca é o único caminho para o dado: o radar tem tabela equivalente
  escondida para leitor de tela.
- Ícones de tipo são sempre decorativos, com o nome do tipo escrito ao lado.
- A carta é imagem, então o texto dentro dela não é selecionável nem lido por
  leitor de tela — a tabela de stats ao lado no site é o caminho acessível.
- O PNG precisa se sustentar sobre tema claro **e** escuro do GitHub, que o
  produto não controla.
