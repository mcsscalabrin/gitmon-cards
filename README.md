# Gitmon Cards

Gerador de cartas de trading card game a partir de dados reais do GitHub.
Uma URL de imagem estática, sem login, embutível em qualquer README, que se atualiza sozinha.

```
<host>/<username>.png            → carta de perfil
<host>/<owner>/<repo>.png        → carta de repositório
<host>/battle/<battle-id>.png    → resultado estático de uma batalha
```

```markdown
[![torvalds](https://<host>/torvalds.png)](https://github.com/torvalds)
```

> **Status:** v1 funcional em desenvolvimento local. Cartas de perfil e de repositório, batalha
> com resultado compartilhável, site bilíngue. Não publicado — ver `docs/decisions.md` (Q12).
> A especificação completa está em [`docs/rfc-001-gitmon-cards.md`](docs/rfc-001-gitmon-cards.md).

## O que a carta mostra

Todo número na carta é derivado de dado da API, por fórmula fixa e documentada. Nenhum texto é
inventado: nomes de ataque são nomes de repositório ou logins de contribuidor, e o rodapé é
template a partir dos números (RFC 9.2). Não há flavor text.

| Elemento | De onde vem |
|---|---|
| **Tipo** (18) | Linguagem dominante, ponderada por estrelas. Mapa em `lib/cards/elements.ts` |
| **PS** | Perfil: linear sobre estrelas, seguidores e repos. Repo: **logarítmico** sobre estrelas e forks |
| **Ataques** (0–2) | Perfil: repositórios mais estrelados. Repo: maiores contribuidores humanos |
| **Fraqueza** | Perfil: a segunda linguagem do dev. Repo: a cadeia do tipo |
| **Resistência** | Cadeia de efetividade do tipo |
| **Recuo** | Perfil: idade da conta. Repo: fila de issues abertas |
| **Raridade** (8 tiers) | Score composto, na escada do TCG Pokémon |
| **Número de série** | Sequencial por ordem de geração, imutável depois de atribuído |

A raridade não muda só o símbolo: a partir de `rare` a carta ganha foil, e os tiers de ilustração
mudam o **tratamento de arte** — full-art em sangria, folheação prateada ou dourada. Ver
[`docs/design-system.md`](docs/design-system.md).

O site acrescenta o que a imagem exportada não carrega, de propósito (RFC 9.6): abertura de
pacote, foil especular seguindo o ponteiro, radar de assinatura do perfil e um painel de
derivações mostrando de onde cada número saiu. O PNG que viaja para o README de outra pessoa
continua limpo.

E fala a língua da carta em vez de ser um invólucro em volta dela: display e títulos usam a
**mesma face** que o Satori desenha na carta (M PLUS Rounded 1c, 28 KB em dois pesos WOFF2), e o
tipo da carta tinge a superfície da página inteira — 7% no fundo das caixas, 22% nas bordas. Uma
página de Fogo e uma de Água já não são a mesma página cinza com duas palavras trocadas.

## Levar a carta embora

Três saídas, para três destinos:

| Saída | Para onde |
|---|---|
| **Baixar PNG** | Feed social, onde o arquivo é o produto inteiro e não há site em volta |
| **Compartilhar** | Folha nativa do celular, com o arquivo quando o navegador aceita e o link quando não; no desktop, copia o link |
| **Snippet de markdown** | README de outra pessoa |

Colar a URL da página em qualquer lugar que leia Open Graph rende uma prévia em **paisagem**
(`/api/card-og/<id>`), com a carta inteira ao lado dos números. A carta é 5:7 e as prévias de link
são 1.91:1 — apontar o `og:image` direto para o `/<id>.png` fazia o corte comer o cabeçalho e o
rodapé. A prévia embute o PNG real renderizado por `renderCard`, não uma segunda composição: o
projeto só tem uma carta, e é assim que continua tendo.

## Rodando

```bash
npm install
cp .env.example .env.local   # preencha GITHUB_TOKEN
npm run dev
```

`GITHUB_TOKEN` é um token de leitura pública qualquer (5.000 req/h). Sem ele, as rotas de imagem
devolvem uma carta de erro dizendo isso.

`REDIS_URL` é opcional em desenvolvimento, mas com duas consequências diferentes: o **cache** cai
para um fallback por processo (funciona, só gasta mais rate limit), e as cartas saem **sem número
de série**. O segundo é deliberado — em serverless, um contador em memória daria números
diferentes por instância, e carta sem número é honesta enquanto carta com número errado, já
embutida no README de alguém, não é. Em produção o Redis é obrigatório (RFC 11).

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm test` | Testes unitários (fórmulas, batalha, renderização, i18n) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (`eslint . --max-warnings=0`) |
| `npm run test:e2e` | Playwright (precisa de `npx playwright install chromium`) |
| `PREVIEW=<dir> npm test` | Grava os PNGs renderizados em disco para inspeção visual |
| `npm run assets` | Regenera molduras, foil, metal e ícones de energia |
| `npm run fonts` | Baixa e subseta a fonte da carta — TTF para o Satori, WOFF2 para o site |

No PowerShell, a variável de preview vai antes, separada: `$env:PREVIEW="out"; npm test`.

O `test:e2e` tem dois modos. Sem `E2E_BASE_URL` ele sobe o `npm run dev` e testa contra ele —
esse é o modo que precisa de `GITHUB_TOKEN` no ambiente. Com `E2E_BASE_URL` apontando para um
deployment, o Playwright só fala HTTP e o token fica onde ele já vive, no servidor. É assim que o
CI roda.

A arte e as fontes são versionadas — `assets` e `fonts` só precisam rodar quando o desenho ou o
repertório de caracteres mudar. Quando o **formato** da carta muda (campo novo, valor de enum que
deixa de existir), suba `CARD_VERSION` em `lib/cards/index.ts`: ele entra na chave de cache, e sem
isso uma carta velha em cache quebra ao renderizar, não ao compilar.

---

## Stack (travada no RFC, seção 5)

| Camada | Escolha |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Geração da imagem | `next/og` (`ImageResponse` / Satori) + `sharp` para composição |
| Cache de dados | Redis via `ioredis` |
| Cache da imagem | HTTP `Cache-Control` na CDN — **sem** Blob/object storage |
| Auth GitHub | Token de app no servidor (5.000 req/h), sem login do visitante |
| Hospedagem | Vercel |

**Princípio central (RFC 4.3):** a complexidade visual é resolvida *antes*, como arte estática
pré-renderizada, não em runtime. O servidor só compõe — posiciona texto e cola uma imagem
recortada sobre uma moldura PNG. Nada de browser headless.

**Corolário do Satori:** ele não implementa `min-width: auto`, `text-overflow: ellipsis` nem
`mask-image`. Larguras são explícitas em `layout.json`, texto é truncado na origem, e qualquer
recorte suave é assado em `sharp` antes de entrar na composição.

## Estrutura de pastas

```
app/
  [owner]/                     rota raiz dinâmica — serve perfil e repositório
    page.tsx                   carta de perfil (web, interativa)
    [repo]/                    carta de repositório (web, interativa)
    vs/[...opponent]/          batalha 1v1 (RFC 7)
  battle/[battleId]/           resultado imutável e compartilhável de uma batalha
  api/
    card-image/[owner]/        rota de imagem do perfil    → reescrita de /<user>.png
    card-image/[owner]/[repo]/ rota de imagem do repo      → reescrita de /<owner>/<repo>.png
    card-og/[owner]/           prévia de link em paisagem  → só o og:image aponta para cá
    card-og/[owner]/[repo]/
    battle/[battleId]/image/   pôster do resultado         → reescrita de /battle/<id>.png

components/
  card/                        carta interativa: tilt 3D, foil ao vivo, abertura de pacote,
                               radar de assinatura, painel de derivações, ícone de tipo
  battle/                      animação de turnos e placar
  ui/                          primitivas compartilhadas, toggle PT/EN, faixa de apoio

lib/
  github/                      cliente da API do GitHub + erros tipados
  cards/                       scoring: HP, tipo, ataques, fraqueza, recuo, raridade
    profile.ts / repo.ts       as duas fórmulas de carta (RFC 6.1 e 6.2)
    rarity.ts                  8 tiers, símbolo, foil e tratamento de arte
    serial.ts                  número de série — único dado durável, atribuído por script Lua
    ratings.ts                 os 5 eixos do radar (assinatura, não medição)
    layout.json                geometria da carta em pixels — fonte única
    palette.json               cor dos 18 tipos — fonte única, extraída dos ícones
  battle/                      motor de simulação turno-a-turno (RFC 7.3)
  og/                          renderCard, renderCardOg, renderBattle, renderError
  metadata.ts                  tags de prévia de link, compartilhadas por perfil e repo
  cache/                       Redis, com fallback em memória para dev
  i18n/                        dicionários PT/EN (obrigatório desde a v1, RFC 9.1)
  config.ts                    URLs e políticas de cache — sem domínio hardcoded

scripts/
  build-assets.mjs             gera moldura, full-art, foil, metal e energia (SVG → PNG)
  build-fonts.mjs              baixa e subseta a fonte da carta (TTF + WOFF2)
  assets/types/                os 18 ícones de tipo, entrada de build — não gerados por código
  lib/art.mjs                  as primitivas de desenho usadas pelo build

public/assets/
  frames/                      18 molduras por tipo + 18 full-art + 6 foil + 2 metais — ORIGINAIS
  energy/                      18 ícones de custo de energia (PNG, para o Satori)
  types/                       os mesmos 18 ícones em SVG, para a interface web
  icons/                       ícone de recuo
  fonts/                       M PLUS Rounded 1c, subsetada (SIL OFL 1.1)

docs/                          RFC + specs derivadas
reference/                     material de consulta (não é código de produção)
tests/                         unit + e2e (Playwright)
```

Os símbolos de raridade (`● ◆ ★`) não são assets: são glifos cobertos pelo subset da fonte.

### Notas de rota

- `/<user>.png`, `/<owner>/<repo>.png` e `/battle/<id>.png` são **rewrites** em `next.config.ts`
  apontando para as rotas em `app/api/`. A extensão `.png` na URL pública é cosmética — é o que
  torna o link colável em Markdown. A ordem importa: `/battle/<id>.png` precisa casar antes do
  genérico `/<a>/<b>.png`.
- `app/[owner]/` é um único segmento dinâmico servindo perfil **e** dono de repositório: o App
  Router não permite dois segmentos dinâmicos irmãos no mesmo nível, então `[username]` e
  `[owner]` do RFC colapsam num só.
- A rota de batalha `/<a>/vs/<b>` **não pode ter cache duro** (a simulação é aleatória).
  Ela sorteia e redireciona; só `/battle/<battle-id>.png` é cacheável, porque representa um
  resultado já sorteado (RFC 7.3).

## Documentação

| Arquivo | Conteúdo |
|---|---|
| [`docs/rfc-001-gitmon-cards.md`](docs/rfc-001-gitmon-cards.md) | RFC completo, aprovado — fonte da verdade, com adendos de supersessão onde foi revisto |
| [`docs/decisions.md`](docs/decisions.md) | Decisões tomadas fora do RFC e questões ainda abertas |
| [`docs/design-system.md`](docs/design-system.md) | Cores, tipografia, os 18 tipos e a escada de tratamento de arte |
| [`docs/layout-spec.md`](docs/layout-spec.md) | Posições em pixel da composição da carta e a tabela de tipos |
| [`docs/data-mapping.md`](docs/data-mapping.md) | Fórmulas GitHub → campos da carta |
| [`docs/assets-brief.md`](docs/assets-brief.md) | Briefing da arte original (molduras, energia, raridade) |
| [`docs/foil-especular.md`](docs/foil-especular.md) | O efeito de foil ao vivo, e por que ele é camada sobre o PNG |
| [`docs/gaps-revalidacao.md`](docs/gaps-revalidacao.md) | Placar de pendências conhecidas, com justificativa |
| [`docs/revamp-visual.md`](docs/revamp-visual.md) | Plano do revamp visual de carta e site — direção travada, nada implementado |
| [`PRODUCT.md`](PRODUCT.md) | Verdade de produto durável: usuários, posicionamento, restrições e compromissos de marca |
| [`docs/handoff.md`](docs/handoff.md) | Estado do trabalho em andamento e o contexto que não está no código |

A RFC é a fonte de verdade declarada. Onde uma decisão posterior a substituiu, a seção original
fica no lugar com um **adendo de supersessão** logo abaixo — o histórico da decisão vale tanto
quanto a decisão.

## Contribuindo

Issues e PRs são bem-vindos. O projeto é pequeno e opinativo — esta seção existe para que uma
contribuição não esbarre em regra não escrita.

### Antes de abrir o PR

```bash
npm run lint
npm run typecheck
npm test
```

O CI roda esses três em todo PR e **bloqueia o deploy** se algum falhar. Rodar antes é para não
descobrir no runner o que o seu terminal contava em dez segundos.

O que a esteira faz, em `.github/workflows/`:

| Quando | O que |
|---|---|
| PR | lint + typecheck + unitários → deploy de preview na Vercel → **e2e contra o preview** → comentário no PR com a URL |
| Push em `main` | os mesmos gates → deploy de produção → smoke das rotas de imagem contra o que subiu |
| Tag `v*` | GitHub Release com o corpo tirado do `CHANGELOG.md` |

O e2e do CI não roda contra `next dev`: ele aponta `E2E_BASE_URL` para o deployment de preview, o
que exercita o ambiente serverless de verdade — Redis, rewrites, `outputFileTracingIncludes`. É a
diferença entre provar que o código funciona e provar que o deploy funciona.

O deploy é orquestrado pelo Actions, não pela integração Git da Vercel (desligada em
`vercel.json`). A ordem importa aqui mais que no projeto médio: a carta é servida com
`s-maxage=86400` de dentro do README de outra pessoa, então um deploy quebrado não é uma página
que o visitante recarrega — é arte errada, em cache, no repositório de terceiro.

**O que o CI não cobre continua sendo seu:** ele não olha a carta. O comentário do bot no PR traz
a URL do preview justamente para isso.

### Renderize e olhe

A regra mais cara aprendida aqui: **o que quebra em layout só quebra olhando.** Já passaram por
typecheck e suíte verde o dano do ataque sumindo da carta, o título duplicado, a coluna direita
vazando da viewport e o alvo de clique que nunca assentava. Nenhum foi pego por teste; todos por
screenshot.

Se o PR mexe na carta, rode `PREVIEW=<dir> npm test` e olhe os PNGs. Se mexe na página, suba o
`npm run dev` e olhe. Descreva no PR o que você viu.

Dois avisos que economizam uma hora de depuração:

- **O cache mascara mudança de domínio.** Em desenvolvimento o cache de cartas é em memória e
  sobrevive ao hot reload. Toda vez que uma mudança no domínio "não apareceu", a causa foi essa —
  reinicie o servidor.
- **Há um terceiro cache: o navegador.** A rota de imagem responde `max-age=3600`, então o PNG na
  tela pode ser de uma hora atrás enquanto o HTML ao redor já é novo. Se a página e a carta
  discordarem, recarregue o PNG com `?bust=<agora>` antes de suspeitar do domínio.

### Regras do domínio

- **Mudou o formato da carta, sobe `CARD_VERSION`** (`lib/cards/index.ts`). Campo novo, ou valor
  de enum que deixou de existir: sem a subida, uma carta velha em cache quebra ao renderizar, não
  ao compilar — e em desenvolvimento isso passa despercebido até produção.
- **As fórmulas são travadas na RFC**, não preferência de quem está editando. Mexer num peso de
  `profile.ts` ou `repo.ts` exige atualizar a RFC 6.1/6.2 no mesmo PR, com o motivo.
- **A imagem exportada é limpa (RFC 9.6).** Explicação, radar e afordância de navegação vivem só
  no site. É por isso que `derivations` e `ratings` são opcionais no domínio: o renderizador de
  imagem nunca os lê. Um PR que os fizer serem lidos derruba a promessa junto.
- **Tom técnico-neutro (RFC 9.2).** O dado fala por si. Nomes de ataque são nomes de repositório
  ou logins reais; o rodapé é template a partir dos números. Sem piada, sem humanização, sem
  flavor text inventado no estilo TCG.
- **`layout.json` e `palette.json` são fonte única**, lidas pelo build e pelo runtime. Duplicar um
  valor deles em CSS ou em componente é o tipo de divergência que só aparece meses depois.

### i18n

`MessageKey` é derivado do dicionário `pt`, e `en` é tipado como `Record<MessageKey, string>`.
Adicionar uma chave só em português **quebra o typecheck**, de propósito — não existe caminho para
o site sair meio traduzido.

Chaves com sujeito diferente ganham prefixo próprio em vez de reuso: `why.*` fala com a pessoa
("sua linguagem dominante"), `why.repo.*` fala do repositório. Reusar economizaria linha e faria o
site tratar um repositório por você.

### Arte

Toda moldura, ícone de tipo e ícone de energia é original. **Nenhum asset da Pokémon Company,
nenhum ícone de fã** dos repositórios de referência — nem como placeholder temporário. As
molduras, o foil e os metais são gerados por `npm run assets`; os 18 ícones de tipo são entrada de
build em `scripts/assets/types/`, e a paleta de `palette.json` é extraída deles, não o contrário.

### Commits

Prefixo, minúsculas, sem acento no assunto: `feat:`, `docs:`, `chore:`. O corpo é onde mora o
valor — explique **por que**, não o que o diff já mostra. Restrição descoberta, alternativa
descartada e armadilha encontrada valem mais que um resumo das linhas alteradas.

A RFC não se reescreve. Onde uma decisão posterior a substitui, a seção original fica no lugar com
um adendo de supersessão logo abaixo, e a decisão nova entra em `docs/decisions.md`.

Documentação, comentários e nomes de teste são em português. A API do código — tipos, funções
exportadas, chaves de i18n — é em inglês.

### Nunca commite

`.env.local` (está no `.gitignore`, e o `.env.example` documenta as variáveis sem valores).
Tokens do GitHub em teste, fixture ou mensagem de commit.

## Direitos autorais

Nenhum asset da Pokémon Company, nenhum ícone de fã dos repositórios de referência.
Toda arte de moldura, tipo e energia deste projeto é original. Ver `docs/assets-brief.md`.

Os nomes de tier `Illustration Rare`, `Special Illustration Rare` e `Hyper Rare` são terminologia
do produto da Pokémon Company, adotada aqui como vocabulário de TCG. É uma questão em aberto —
ver `docs/gaps-revalidacao.md` (3.2).

## Licença

MIT © Matheus Scalabrin
