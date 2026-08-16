# RFC — Gitmon Cards
### Gerador de cartas estilo Pokémon TCG a partir de dados reais do GitHub

**Status:** aprovado para implementação
**Autor:** Matheus Scalabrin
**Contexto:** este documento foi produzido numa sessão de planejamento com Claude (chat) e deve ser anexado a uma sessão do Claude Code para dar início à implementação.

---

## 1. O que é

Um gerador de cartas de trading card game (visual Pokémon TCG) a partir do perfil e dos repositórios reais de um usuário do GitHub. Segue a mesma fórmula de crescimento do **gitfut**: URL de imagem estática, sem login, embutível em qualquer README, que se atualiza sozinha.

```
gitmon.dev/<username>.png            → carta de perfil
gitmon.dev/<owner>/<repo>.png        → carta de repositório
gitmon.dev/battle/<battle-id>.png    → resultado estático de uma batalha (ver seção 7)
```

## 2. Repositórios de referência

| Repositório | Papel neste projeto |
|---|---|
| [Younesfdj/gitfut](https://github.com/Younesfdj/gitfut) | **Base do fork.** Fornece toda a arquitetura de dados, cache, geração de imagem e embed. Tema futebol (FUT cards) será trocado por tema Pokémon. |
| [bartduisters/trading-card-generator](https://github.com/bartduisters/trading-card-generator) | **Referência de layout.** Estrutura de dados de uma carta Pokémon real (ataques, custo de energia, fraqueza/resistência/recuo, raridade) e dimensões físicas do card (8.8cm × 6.3cm). Não será forkado — só usado como espec de campos e proporção. |
| [pixegami/pokemon-card-generator](https://github.com/pixegami/pokemon-card-generator) | **Referência de spec de layout pixel-a-pixel para a composição da imagem final.** Python/Pillow, dividido em duas fases desacopladas: geração de conteúdo via IA (OpenAI + prompt pro Midjourney) e renderização (`render_cards.py`, que só cola uma imagem local sobre um template PNG por elemento). **Só a fase de renderização interessa a este projeto** — a fase de IA não será usada; a arte do usuário (avatar do GitHub) entra no lugar do que seria a arte gerada no Midjourney. Ver seção 4.4 para a spec extraída. |

Um protótipo funcional de mapeamento de dados (GitHub → campos de carta, em HTML/CSS/JS puro, sem o motor de imagem final) foi construído durante o planejamento e pode ser usado como referência de fórmulas na seção 6. Está anexado como `github-card-prototype.html`.

## 3. Por que fork do gitfut (não do trading-card-generator)

O trading-card-generator é uma prova de conceito de front-end sem: busca de dados externos, cache, rota de imagem embutível, ou deploy — precisaria ser construído do zero em cima dele. O gitfut já resolve exatamente esses problemas (é literalmente o mesmo produto, com outro tema). Fork do gitfut = herdar infraestrutura validada e trocar tema + fonte de dados de scoring.

## 4. Arquitetura real do gitfut (investigada no código-fonte, não na documentação)

Isto é o achado mais importante do planejamento e **contradiz a suposição inicial** de que fidelidade visual alta exigiria Puppeteer/Playwright. A leitura do código mostrou o oposto:

### 4.1 Stack
- Next.js 16 (App Router) + React 19
- `next/og` (`ImageResponse`, baseado em Satori) — motor de geração da imagem estática
- `sharp` — pós-processamento de imagem no servidor (máscaras de avatar)
- `ioredis` — cache dos dados da API do GitHub (não da imagem)
- `html-to-image` — usado **só** no botão "baixar/compartilhar" da carta interativa no navegador (client-side, caminho separado da imagem de embed)
- `playwright` — devDependency, usado nos testes E2E, não na renderização de produção

### 4.2 Como a imagem embutível (`/<user>.png`) é gerada de verdade
Arquivo real: `app/api/card-image/[username]/route.tsx` → `lib/og/renderCard.tsx`

1. A **moldura da carta é um asset de imagem estático** (PNG/webp) pré-desenhado por tier de raridade — não é CSS. É isso que dá a fidelidade visual (textura, gradiente, glow, foil). O código só faz `resolveCardTheme(card).bg` e estica essa imagem de fundo (`objectFit: fill`) atrás de tudo.
2. O **avatar** é buscado, e como Satori não suporta `mask-image` do CSS, a máscara (recorte radial + fade nas bordas) é "assada" no `sharp` no servidor: duas máscaras SVG (radial-gradient e linear-gradient) compostas com `blend: "dest-in"`, virando um PNG já mascarado, convertido pra data URI, e só então injetado como `<img>` no Satori.
3. **Texto (nome, stats) é posicionado em porcentagem**, copiado literalmente dos mesmos números do componente React da carta interativa (`components/PlayerCard.tsx`) — uma função `cqw(n)` converte % pra px na largura de render escolhida. Isso garante que a carta estática e a carta interativa nunca dessincronizam.
4. Fontes e bandeira/logo de linguagem também são carregados como assets e injetados como data URI.
5. `ImageResponse` retorna a imagem com headers de cache HTTP puro:
   ```
   Cache-Control: public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800
   ```
   **Sem Redis nem Blob storage pra imagem.** A CDN da Vercel resolve o cache pelo header. Redis só cacheia a consulta aos dados do GitHub (`scoutCard`), que é uma operação separada e mais barata.

### 4.3 Implicação prática
A complexidade visual não deve ser resolvida em runtime (CSS elaborado, browser headless). Ela é resolvida **antes**, como arte estática, e o servidor só faz composição simples (posicionar texto e uma imagem recortada em cima de um fundo). Isso é o que permite rodar em serverless da Vercel sem problema de cold start pesado (Puppeteer teria esse problema) e sem custo de storage.

### 4.4 Spec de layout extraída do pixegami/pokemon-card-generator

Este repositório confirma a mesma técnica da seção 4.2 (arte estática + composição de texto por cima), mas com uma vantagem: é uma implementação de referência **já testada visualmente** especificamente para o layout de carta Pokémon, com todas as posições em pixels resolvidas. Decisão travada: **reimplementar essa lógica em Node com `sharp`**, usando este repo só como espec, não como dependência direta (mantém tudo dentro do stack Next.js/Vercel do fork do gitfut).

**Fluxo original (Python/Pillow), mapeado 1:1 pro que a reimplementação em `sharp` precisa fazer:**

1. Carrega o template PNG do elemento: `resources/cards/{element}_card.png` (um por tipo, não por raridade)
2. Redimensiona a arte central (no projeto original, arte do Midjourney — **aqui, o avatar do GitHub**) para `IDEAL_CARD_WIDTH = 390px`, centralizada em `x = largura/2`, `y = 210`
3. Cola a arte primeiro, o template por cima (o template já tem a "janela" recortada, com bordas transparentes)
4. Desenha nome (canto superior esquerdo, `(48, 64)`) e HP (canto superior direito, `largura - 86, 64`, vermelho) como texto direto, sem asset
5. Desenha até 2 caixas de habilidade/ataque, centralizadas horizontalmente, empilhadas verticalmente a partir de `y = 450`, cada uma com: ícones de custo de energia (posicionados em padrão geométrico — 1 ícone centralizado, 2 lado a lado, 3 em triângulo, 4 em quadrado), nome da habilidade centralizado, dano alinhado à direita
6. Desenha uma linha divisória entre as duas habilidades, se houver duas
7. Desenha a fileira de fraqueza/resistência/custo-de-recuo numa linha fixa (`y = 568`): fraqueza à esquerda, resistência ao centro, recuo à direita — cada um é só um ícone pequeno de elemento
8. Desenha texto de raridade (`"{raridade} {elemento}-type Card"`) no rodapé esquerdo, e um símbolo Unicode de raridade (`⬤` comum, `◆` incomum, `★` raro) no rodapé direito, com tamanho de fonte crescente por tier

**Tabela de elementos (mais simples que a do protótipo inicial deste RFC — vale adotar esta versão em vez da lista estendida da seção 6.1):**

7 elementos: `neutral, fire, water, grass, electric, psychic, fighting`. Cadeia de fraqueza/resistência:

| Elemento | Fraco contra | Resiste a |
|---|---|---|
| fire | water | grass |
| water | electric | fire |
| grass | fire | electric |
| electric | fighting | — |
| psychic | — | fighting |
| fighting | psychic | — |
| neutral | fighting | — |

Essa cadeia triangular simples (não o quadro completo de 18 tipos do Pokémon oficial) é suficiente pra gerar a mecânica de "fraqueza/resistência" da carta sem precisar mapear 18 tipos a partir de linguagens de programação — mapear as ~15-20 linguagens mais comuns do GitHub para esses 7 elementos é mais tratável do que para um sistema de tipos completo.

> **Adendo — a tabela de elementos desta seção foi substituída.** São **18
> tipos**, não 7, e `neutral` virou `normal` (para casar com o nome do ícone).
>
> O argumento acima — "mapear ~20 linguagens para 18 tipos não é tratável" —
> não se sustentou na prática: o mapa é trabalho de tabela, não de arquitetura,
> e cabe em `lib/cards/elements.ts` sem estrutura nova. O que os 7 elementos
> custavam era leitura: infraestrutura declarativa, shell, verificação formal,
> funcional, legado e contratos caíam todos em `neutral`, e a maior parte das
> cartas saía do mesmo tipo.
>
> A cadeia de fraqueza/resistência continua com **um** slot de cada por carta,
> como esta seção previu — o que mudou foi de onde os valores vêm (o quadro
> oficial reduzido a uma fraqueza e uma resistência por tipo), não a mecânica.
> Duas leituras exigiram decisão: `normal` e `dark` resistem a `ghost` porque no
> jogo são imunes a ele, e `ice` fica sem resistência porque no quadro oficial
> só resiste ao próprio tipo.
>
> A paleta dos 18 tipos **não** foi escolhida à mão: cada cor base foi extraída
> do disco colorido do respectivo ícone, para ícone e moldura não divergirem.
> Vive em `lib/cards/palette.json`, lida tanto pelo gerador de arte quanto pelo
> runtime.
>
> Ver `lib/cards/elements.ts`, `lib/cards/palette.json` e
> `tests/unit/elements.test.ts`, que prova que todo tipo tem pelo menos uma
> linguagem — tipo inalcançável seria ícone que nunca aparece.

**Ressalva de direitos autorais, mesma categoria da seção 11:** o template de carta em branco usado no repositório é creditado no README deles a uma artista do DeviantArt (`TheDuckTamerBlanks`), e os ícones de elemento também aparentam ser assets de fã. Não redistribuir esses arquivos PNG em produção. O valor extraído aqui é a especificação de posição/tamanho (todos os números acima), não os arquivos — a arte final (moldura por tipo) ainda precisa ser original, conforme a questão em aberto da seção 8.

## 5. Decisões travadas

| Decisão | Escolha | Justificativa |
|---|---|---|
| Base do projeto | Fork do `gitfut` | Infraestrutura pronta, só trocar tema e scoring |
| Motor de renderização da imagem final | **Satori (`next/og` `ImageResponse`) + `sharp`** para composição de imagem (avatar, template de carta) | É a fórmula real do gitfut. Mais leve que Puppeteer, roda bem em serverless, atinge fidelidade alta via arte pré-renderizada, não CSS complexo |
| Lógica de composição pixel-a-pixel | Reimplementada em Node/`sharp`, usando o `render_cards.py` do pixegami/pokemon-card-generator como espec (seção 4.4) — não como dependência | Mantém tudo no stack Next.js/Vercel já travado; o repo Python só fornece posições/tamanhos testados visualmente |
| Escopo v1 | Badge de imagem (prioridade) + página web de visualização/geração | Fórmula gitfut é o produto principal; a página web dá contexto e permite customização antes de embutir |
| Entidades com carta | Perfil **e** repositório | Repositório vira "ataques" e "fraqueza" no mapeamento (seção 6.2) |
| Autenticação com a API do GitHub | Token de app no servidor (5.000 req/h) | Sem exigir login do visitante, mantém a fricção zero que faz a fórmula gitfut funcionar |
| Cache de dados do GitHub | Redis (`ioredis`, como no gitfut) | Evita re-consultar a API a cada visita |
| Cache/storage da imagem final | **HTTP `Cache-Control` na CDN, sem Blob/object storage** | Espelha a decisão real do gitfut — mais barato, sem sincronização de cache a gerenciar |
| Identidade visual | Fidelidade máxima ao visual TCG oficial | Badges de tipo/energia **desenhados do zero** (não reusar os ícones do trading-card-generator, que têm crédito a um ilustrador de fã específico) |
| Domínio | `gitmon` ou `gitmon-cards` | Eventualmente hospedado como subdomínio de `scalabrin.dev` — arquitetar para isso desde o início (ex: variável de ambiente para o domínio base, sem hardcode) |
| Hospedagem | Vercel | — |

## 6. Especificação de dados: GitHub → carta

### 6.1 Carta de perfil

Dados de origem: `GET /users/{username}` + `GET /users/{username}/repos?per_page=100`

| Campo da carta | Fórmula |
|---|---|
| HP | `clamp(30 + estrelasTotais×3 + seguidores×1 + reposPúblicos×2, 30, 250)`, arredondado pra dezena |
| Tipo | Linguagem mais frequente entre os repos próprios (ponderada por estrelas) → mapa linguagem→tipo |
| Ataques | 2 repositórios mais estrelados; `damage = clamp(estrelas×4, 10, 300)`, `text` = descrição do repo truncada |
| Fraqueza | Segunda linguagem mais frequente, ×2 |
| Recuo | `clamp(round(idadeContaEmAnos / 2), 1, 4)` pips |
| Raridade | `score = estrelasTotais×2 + seguidores×3 + reposPúblicos + idadeContaEmAnos×5` → common / uncommon / rare / holo / secret por faixa |
| Arte | `avatar_url` do usuário |
| Rodapé | bio truncada + ano de criação da conta |

O mapa linguagem→tipo completo e as faixas de raridade exatas estão implementados no protótipo anexo (`github-card-prototype.html`) e podem ser copiados diretamente.

> **Adendo — a escada de raridade desta seção foi substituída.** A fórmula do
> `score` continua valendo exatamente como está acima. O que mudou foram os
> tiers: de 5 (`common / uncommon / rare / holo / secret`) para **8**, no padrão
> do TCG Pokémon (`common / uncommon / rare / double_rare / illustration_rare /
> ultra_rare / special_illustration_rare / hyper_rare`), com número de série por
> carta.
>
> As faixas **não** vieram do protótipo. A primeira tentativa de escada usou
> limiares escolhidos como se fossem contagem de estrelas e colocou seis de sete
> perfis notáveis no tier mais raro — o topo virou o padrão. Os limiares atuais
> foram calibrados contra perfis reais medidos pela API e estão travados por
> teste de regressão.
>
> Ver `docs/design-system.md`, `lib/cards/rarity.ts` e `tests/unit/rarity.test.ts`.

### 6.2 Carta de repositório (novo — não existe equivalente no gitfut nem no protótipo)

A definir na sessão de implementação, mas a proposta inicial é:

| Campo da carta | Fórmula proposta |
|---|---|
| HP | Baseado em `stargazers_count` |
| Tipo | Linguagem principal do repositório |
| Ataques | Top contribuidores (nome = ataque, contribuições = dano) OU releases/versões marcantes |
| Fraqueza | `open_issues_count` alto → fraqueza a "manutenção" |
| Raridade | Combinação de estrelas, forks, e frequência de commits recentes |
| Arte | `owner.avatar_url` ou social preview image do repo, se disponível via API |

**Esta seção precisa de mais uma rodada de decisão durante a implementação** — não foi fechada no planejamento.

## 7. Batalha entre cartas e interatividade 3D (v1)

**Adicionado depois do RFC inicial — mudança de escopo consciente.** Originalmente a comparação 1v1 estava marcada como fora da v1 (ver histórico da seção 9). O autor decidiu trazer pra v1: batalha por simulação de turnos com resultado compartilhável, e interatividade 3D na carta. Ambas descritas abaixo.

### 7.1 Card interativo (efeito 3D)

**Decisão:** CSS 3D transform (`perspective` + `rotateX`/`rotateY` seguindo o mouse + glare radial), **não** Three.js/WebGL. A ideia inicial era Three.js, mas foi reconsiderada em favor da técnica mais leve — que, por sinal, **já está implementada e testada** em ambos os repositórios de referência (`addTiltListener` no `trading-card-generator`, mecanismo equivalente no `TiltCard.tsx` do gitfut). Isso é reaproveitamento direto de código, não trabalho novo.

### 7.2 Animação de revelação (estilo Pokémon)

Toca **toda vez** que uma carta é buscada/visitada na versão interativa do site (não é "só na primeira vez", não precisa de estado salvo por visitante). Aplica-se exclusivamente à experiência web ao vivo — a imagem estática exportada (`/<user>.png`, embed de README) **nunca é animada**, sempre mostra o estado final "revelado". Isso significa: a animação é 100% client-side, não tem nenhuma implicação em cache ou geração de imagem no servidor.

### 7.3 Mecânica de batalha

**O que NÃO é reaproveitável do gitfut:** `lib/duel.ts` foi inspecionado e é uma comparação estática — soma quantas das 6 stats cada carta "vence" (`tallyRows`), sem turnos, sem ataques trocados, sem aleatoriedade; desempate por "overall" (`onPenalties`). É uma mecânica fundamentalmente diferente da pedida aqui.

**O que É reaproveitável:** a estrutura de rota (`/[username]/vs/[opponent]`), a página de resultado, e a rota de imagem de poster (`app/[username]/vs/[opponent]/opengraph-image.tsx` e a rota de poster) — o *formato* do recurso, não o *algoritmo*.

**Especificação proposta pra simulação turno-a-turno** (não travada — é ponto de partida pra sessão de implementação refinar):

1. HP inicial de cada lado = campo `HP` da própria carta (perfil ou repositório, seção 6).
2. A cada turno, o lado ativo escolhe um dos seus ataques — se a carta tem 2 ataques, a escolha é **aleatória** a cada turno (esse é o ponto natural de entrada da aleatoriedade pedida).
3. Dano do turno = `attack.damage` do ataque escolhido, multiplicado por efetividade de tipo usando a cadeia de fraqueza/resistência da seção 4.4 (`×2` se o atacante tem o tipo forte contra o defensor, `×0.5` se é resistido).
4. **Variância aleatória adicional**: dano final varia ±15% por golpe (mesmo princípio de RPGs/Pokémon de verdade) — segunda camada de aleatoriedade, independente da escolha de ataque.
5. Ordem de turno: alternada, lado que gerou a batalha primeiro (o "desafiante" da URL) começa. Alternativa a considerar na implementação: sortear quem começa, adicionando mais uma fonte de variação.
6. Batalha termina quando um lado chega a HP ≤ 0, ou em um teto de segurança (ex: 20 turnos) — se o teto for atingido, vence quem está com maior % de HP restante.
7. Resultado da simulação inclui um **log de turnos** (ataque usado, dano, HP restante após cada golpe) — usado só para animar a sequência no navegador. Não é persistido nem faz parte da imagem final.

**Implicação de cache importante (diferente de tudo mais no projeto):** como a batalha tem aleatoriedade, **a mesma URL `<user1>/vs/<user2>` não pode ser cacheada de forma dura** como as cartas de perfil/repo são (seção 4.2) — rodar de novo tem que dar um resultado potencialmente diferente. Por isso a imagem compartilhável usa um identificador de batalha próprio (`gitmon.dev/battle/<battle-id>.png`), gerado no momento em que a batalha acontece e representando **aquele resultado específico**, não o confronto genérico entre os dois usuários. Esse `battle-id` pode ser cacheado normalmente, porque é imutável depois de gerado (um resultado já sorteado não muda).

### 7.4 Imagem de resultado compartilhável

Mesma técnica de composição das cartas normais (Satori + `sharp`, seção 4.2/4.4), estendida pra layout de duas cartas lado a lado + indicação de vencedor + HP final de cada lado. **Não** captura a animação nem o log de turnos — é só o placar final estático, mesmo padrão de "imagem limpa" das cartas individuais.

## 8. Questão em aberto: arte das molduras

**Atualização:** a seção 4.4 já resolve *onde* e *em que tamanho* cada elemento visual entra (isso não é mais incerteza — é a espec do pixegami/pokemon-card-generator, testada visualmente). O que continua em aberto é só **quem desenha a arte final** dos 7 templates de moldura (um por elemento, reaproveitando a lista da seção 4.4) e dos ícones de custo de energia — já que os originais do repo de referência não podem ser usados em produção (ressalva de direitos autorais na seção 4.4).

Três caminhos, para decidir na sessão de implementação:

**A. Arte original comissionada/desenhada à mão** (Canva, Figma, ilustrador)
Melhor controle de marca e diferenciação máxima. Trabalho manual proporcional ao número de combinações (idealmente 1 moldura base + variações de cor por tipo, não uma arte inteira por combinação).

**B. Geração via IA generativa** (Stable Diffusion, Midjourney, etc.) — uma arte base por raridade
Mais rápido para iterar, mas risco de inconsistência visual entre gerações e menos controle fino sobre a "leitura" de TCG genuína.

**C. Híbrido — uma moldura vetorial (SVG) única, reutilizável entre tipos via variável de cor, com efeito de holo/foil como camada separada (PNG overlay) só nas raridades altas**
Menor esforço (não multiplica tipo × raridade), fidelidade um pouco menor que arte 100% original mas ainda alta, e mais fácil de manter/expandir depois.

**Recomendação para abrir a discussão na sessão de implementação:** começar pelo caminho C para ter uma v1 funcional rápido, migrar pra A conforme o projeto validar tração — é o caminho de menor custo de troca depois.

## 9. Produto e experiência

Esta seção registra expectativas de produto levantadas numa segunda rodada de interrogatório, depois que a arquitetura técnica já estava travada. São decisões de UX, tom e estratégia de lançamento — não afetam o stack, mas devem orientar toda decisão de copy, fluxo e priorização na implementação.

### 9.1 Público e idioma

- **Público-alvo**: devs brasileiros e internacionais, sem priorização entre os dois.
- **Idioma da interface** (o site em volta da carta, não o conteúdo da carta): **bilíngue, com toggle manual PT/EN** — não é auto-detect por navegador. Implica ter um dicionário de strings desde a v1, não como retrofit.
- O conteúdo da própria carta (nomes, texto de rodapé) é gerado a partir de dados do GitHub, então sua "língua" é essencialmente factual/numérica — o toggle de idioma afeta rótulos de UI (labels, botões, mensagens), não precisa traduzir bio do usuário nem nome de repositório.

### 9.2 Tom de voz

- **Copy da carta** (nomes de ataque, texto de rodapé, raridade): **técnico-neutro**. O dado fala por si — sem piada, sem opinião, sem flavor text inventado no estilo TCG oficial. Isso simplifica a geração de texto: são templates diretos a partir dos números (`"{n} estrelas"`, não uma frase criativa sobre isso).
- **Mensagens de erro/estado vazio** (usuário não existe, perfil sem repositórios, rate limit atingido): **mesmo tom técnico-neutro**, sem tentar ser engraçado ou humanizado. Consistência de tom entre o card e a UI ao redor importa mais que injetar personalidade pontual.

### 9.3 Identidade de marca

- **Marca pessoal discreta**: crédito no rodapé do site (ex: "feito por @scalabrin.dev"), mas o produto tem **identidade visual própria**, não herda Coral/Cream/Dark diretamente. Trate como um produto autônomo, não como conteúdo de marca pessoal.
- Isso implica que a paleta de cores das cartas segue a lógica dos tipos (seção 4.4 — hoje 18, ver o adendo lá), não a paleta pessoal do autor — são sistemas visuais separados que convivem no mesmo site.

### 9.4 Fluxos de UX principais

**Página inicial**: mostra cartas de exemplo imediatamente, para que quem nunca ouviu falar do projeto entenda o conceito sem precisar ler texto explicativo. Não é uma barra de busca vazia (ao contrário do que o gitfut faz) — a home precisa de pelo menos 2-3 cartas de amostra renderizadas estaticamente ou de usuários reais fixos (ex: a própria carta do autor).

**Geração de carta de repositório**: dois caminhos precisam funcionar, não um só —
1. URL direta: `gitmon.dev/<owner>/<repo>.png`, funciona sem passar pela busca de perfil primeiro (mesmo padrão do gitfut pra usuário)
2. Depois de buscar um perfil, a interface sugere/lista os repositórios desse usuário como opção de clique

**Geração de carta de perfil**: `gitmon.dev/<username>.png`, mesmo padrão do gitfut.

**Geração de carta de organização**: a rota de perfil (`/<org>.png`, ex: `facebook.png`) também gera cartas para organizações, com os mesmos campos e fórmulas de scoring de um usuário individual (seção 6.1). O GitHub expõe organizações com `type: Organization` na resposta de `/users/{login}`, e os dados que o scoring usa são os mesmos de um usuário. Exceção: o sinal de "membros" não entra no scoring — o GitHub removeu a contagem pública de membros em 2022.

### 9.5 Fora de escopo v1 (produto)

**Removido deste escopo:** cartas para organizações do GitHub — promovidas para escopo v1 na seção 9.4, quando a implementação mostrou que `type: Organization` responde aos mesmos campos e fórmulas de scoring de um usuário (seção 6.1), sem precisar de campos novos.

### 9.6 Monetização

- **Modelo pretendido: sponsor** (tipo GitHub Sponsors ou equivalente), não uma camada premium com features trancadas atrás de paywall.
- **Onde aparece**: só no site (ex: um botão/link visível na página), **nunca na imagem exportada/embutida no README** — a imagem que viaja pra fora do site fica limpa.

### 9.7 Estratégia de lançamento

- **Lançamento silencioso**: sem build in public, sem documentar o processo de construção nas redes antes de estar pronto. Contraste direto com o hábito usual do autor de documentar processo — aqui a decisão consciente é guardar até a v1 estar no nível de polimento definido (seção 5, "polimento máximo antes de lançar").
- **Repositório de código do gitmon**: público desde o início (permite o histórico de commits existir e, futuramente, estrelas), mas **só divulgado/linkado publicamente no momento do lançamento** — ou seja, existe no GitHub antes, mas não é promovido antes.

### 9.8 Critérios de sucesso

Nesta ordem de prioridade expressa pelo autor:
1. **Engajamento nas redes sociais** (Instagram/TikTok) — o lançamento em si vira conteúdo, mesmo que o processo de construção não tenha sido documentado.
2. **Estrelas no repositório do GitHub** — validação técnica/de comunidade dev, separada do alcance social.

Adoção real (pessoas efetivamente colocando o badge no próprio README) não foi marcada como critério de sucesso primário — vale ter isso em mente para não sobre-otimizar a v1 em torno de retenção/adoção de longo prazo às custas de atrasar o lançamento.

## 10. Fora de escopo da v1 (mas a arquitetura deve prever)

Marcado explicitamente como *future work* para orientar decisões de arquitetura desde já (nomes de rotas, formato de dados, etc. não devem travar essas features depois):

- Efeito holo/foil animado para cartas de raridade alta
- Página de galeria pública / leaderboard

**Removido desta lista:** comparação/batalha 1v1 — promovida para escopo v1 na seção 7, depois que o autor decidiu trazê-la pra frente. O botão de compartilhar resultado também é v1 agora (seção 7.4), não mais future work.

## 11. Riscos e pontos de atenção

- **Direitos autorais**: não reusar assets oficiais da Pokémon Company nem os ícones de fã do trading-card-generator (crédito a ILKCMP) nem do pixegami/pokemon-card-generator (crédito a TheDuckTamerBlanks). Toda arte de tipo/energia/moldura deve ser original do projeto.
- **Rate limit do GitHub**: mesmo com token de app (5.000/h), repositórios com muita atividade simultânea de scraping (ex: se viralizar) podem esgotar o limite — replicar a estratégia de cache do gitfut é obrigatório, não opcional.
- **Domínio futuro em `scalabrin.dev`**: desde a v1, evitar hardcode de domínio em qualquer lugar do código (rewrites, metadata, OG tags) para não gerar retrabalho na migração.
- **Consentimento**: qualquer pessoa pode gerar a carta de qualquer usuário público do GitHub, sem consentimento prévio dele — mesmo modelo do gitfut, aceito conscientemente aqui. Vale reafirmar isso na sessão de implementação caso o produto ganhe tração e a questão volte à tona.
- **i18n desde o início**: a decisão de interface bilíngue (seção 9.1) precisa entrar no projeto desde a primeira tela, não como retrofit — strings soltas no meio de componentes viram retrabalho caro depois.
- **Cache da batalha é diferente do resto do projeto**: por ter aleatoriedade (seção 7.3), a URL de confronto entre dois usuários não pode seguir a mesma regra de cache duro das cartas normais (seção 4.2) — cada resultado de batalha precisa de identidade própria (`battle-id`) pra ser compartilhável de forma estável sem forçar todo mundo a ver o mesmo resultado.

## 12. Anexos

- `github-card-prototype.html` — protótipo de mapeamento de dados GitHub → campos de carta (sem motor de imagem final, só validação da fórmula de scoring). **Ainda não presente neste repositório** — deve ser colocado em `reference/`.
- Spec de layout pixel-a-pixel extraída do `render_cards.py` do pixegami/pokemon-card-generator: seção 4.4 deste documento (replicada em `docs/layout-spec.md`).
