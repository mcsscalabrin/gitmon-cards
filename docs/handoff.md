# Handoff — branch `feat/tipos-18-raridade-e-status`

Estado do trabalho em andamento e o contexto que **não** está no código. Para o
inventário completo de pendências com justificativa, ver
[`gaps-revalidacao.md`](./gaps-revalidacao.md), que abre com um placar de 16
itens.

## Onde está

Duas branches, duas PRs empilhadas, ambas abertas.

| PR | Branch | Base | Escopo |
|---|---|---|---|
| [#1](https://github.com/mcsscalabrin/gitmon-cards/pull/1) | `feat/tipos-18-raridade-e-status` | `main` | 18 tipos, raridade, serial, radar, derivações, ícones de tipo, docs conciliadas — 9 commits |
| [#2](https://github.com/mcsscalabrin/gitmon-cards/pull/2) | `feat/carta-holografica` | `feat/tipos-18-raridade-e-status` | Foil holográfico por camadas e o fix do tilt 3D — 2 commits |

A #2 é empilhada de propósito, para os dois assuntos serem revisáveis em
separado. Quando a #1 entrar na `main`, o GitHub reaponta a #2 sozinho.

Verificado no último commit: **106 testes unitários, 13 e2e, typecheck limpo**.

### O bug que vale conhecer antes de mexer em animação

O tilt 3D **nunca funcionou** desde que foi escrito, e o motivo não aparece em
teste nenhum: `.tilt-card` declarava `animation: reveal ... both`, e com
`fill-mode: both` o quadro 100% da animação (`transform: none`) continua valendo
depois que ela termina. No CSS, animação vence declaração normal na cascata — o
`transform` com as custom properties do tilt nunca chegava a ser aplicado.

O componente calculava os ângulos certos, escrevia as variáveis certas, o
`data-active` entrava no DOM, e a carta não se mexia. Medido no navegador:
`--tilt-x: 4.8deg` com `transform: matrix(1, 0, 0, 1, 0, 0)`.

A lição generalizável: **`fill-mode: both` numa regra que também declara
`transform` congela esse transform para sempre.** Use `backwards`.

`.claude/` está **deliberadamente fora dos commits** — contém só o skill file do
Superdesign, que é ferramenta e não produto. Decidir se versiona é do autor.

## Decisões travadas nesta sessão

Estas foram tomadas em conversa e o código as segue; mudá-las é decisão nova, não
correção.

1. **8 tiers de raridade** no padrão do TCG Pokémon, calibrados contra perfis
   reais medidos pela API. A primeira escada punha seis de sete perfis notáveis
   no tier mais raro. O limiar de `double_rare` em 1500 é restrição, não
   preferência: é o que faz o bônus de atividade de `repo.ts` decidir entre
   tiers.
2. **18 tipos**, revertendo a decisão da RFC 4.4 por 7 elementos. Paleta extraída
   do disco colorido dos próprios ícones, não escolhida à mão.
3. **Serial sequencial** por ordem de geração, com script Lua atômico e store
   separado do cache. Sem `REDIS_URL` a carta sai sem número — nunca com número
   errado.
4. **Radar é assinatura, não medição.** Cinco eixos com escalas independentes e
   tetos escolhidos por nós; por isso não tem régua numérica, os números reais
   ficam na lista ao lado, e há uma `<table>` escondida para leitor de tela.
5. **Abertura de pacote toca em toda visita** (RFC 7.2 proíbe estado por
   visitante), com botão de pular visível desde o primeiro quadro.
6. **Explicações e radar vivem só no site.** A imagem exportada segue limpa
   (RFC 9.6), e é por isso que `derivations` e `ratings` são opcionais no
   domínio — o renderizador nunca os lê.

## Revamp visual — fase 1 feita, fases 2 e 3 não

O plano completo está em [`revamp-visual.md`](./revamp-visual.md); o contexto de
produto, em [`PRODUCT.md`](../PRODUCT.md); as decisões, em D13–D17 de
[`decisions.md`](./decisions.md). O sistema **como ficou** está em
[`design-system.md`](./design-system.md) — é de lá que se deve ler, não do plano.

A **fase 1 (a carta exportada) está implementada**, em cinco commits, um por
item: foil reassado em quatro camadas · serial como elemento de design · mais
arte e a solda · HP como herói · raridade em superfície e borda. 114 testes
unitários, 13 e2e, typecheck limpo.

A **fase 2 (compartilhamento)** está implementada: prévia de link em paisagem,
baixar PNG e Web Share com fallback para copiar.

A **fase 3 (o site)** também: a face da carta em display e título, e o tipo como
superfície no painel inteiro.

**O revamp inteiro está feito.** 116 testes unitários, 16 e2e, typecheck limpo.

O que outra sessão precisa saber:

1. **A direção foi escolhida sem comps.** A sessão de planejamento não tinha
   ferramenta de geração de imagem, então a página de decisão levou paleta e
   fatos. Se a execução parecer errada, a hipótese mais provável não é o plano —
   é que o autor escolheu sem ver.
2. **Nenhuma mudança da fase 1 alterou o formato do dado**, então `CARD_VERSION`
   não subiu. Mas o **cache do navegador** mascara tudo isso: a rota de imagem
   responde `max-age=3600` e o PNG na tela pode ser de uma hora atrás. Ver a
   seção de caches mais abaixo.
3. **`lib/cards/foil.json` é fonte única da escada do foil**, lida pelo runtime
   (`foilIntensity`) e pela build (`foilSvg`). Antes eram duas escadas paralelas
   com números diferentes.
4. **O que muda por raridade nunca multiplica pelos 18 tipos** (RFC 8, caminho
   C). Foil, metal e borda são camadas sem elemento. A única exceção é o foil,
   que tem duas variantes — padrão e full-art — porque recua sobre a janela da
   arte, e a janela do full-art é outra.
5. **`/api/card-og/<id>` é a rota mais cara do produto**, por construção: ela
   renderiza a carta inteira e depois a compõe numa segunda passada de Satori.
   Quente responde em meio segundo; a frio, no dev server com quatro workers
   disputando a máquina, passa dos 30s padrão do Playwright — daí o
   `test.setTimeout` explícito no e2e dela. O preço é aceito para nunca existir
   uma segunda versão da carta (RFC 4.2).
6. **`npm run fonts` gera dois formatos por peso, e os dois são necessários.** O
   Satori lê do disco e só entende TrueType; o navegador entende WOFF2 e paga um
   terço dos bytes pelo mesmo desenho. `web: true` na tabela `WEIGHTS` marca os
   pesos que o site usa — o Regular não recebe WOFF2 porque não há texto de 400
   na face da carta dentro do site.
7. **`--surface-tint` e `--border-tint` são declarados três vezes de propósito**
   (`:root`, `.card-panel`, `.repo-list`). Um custom property que referencia
   outro é substituído no elemento onde é declarado, não onde é usado: declarado
   só em `:root`, o `var(--element)` de dentro resolveria para nada e o valor já
   morto desceria por herança. Bloco novo com `--element` próprio precisa entrar
   nessa lista.

## Superdesign

Projeto: `ed05a819-e5d0-41e7-ad22-2a5f91db6205`
Canvas: https://superdesign.dev/teams/6e374a5f-1368-4c8b-a218-6eda4313182a/projects/ed05a819-e5d0-41e7-ad22-2a5f91db6205

| Draft | O que é |
|---|---|
| `3b7eee1d` | **Layout aprovado** — simétrico, carta ao centro. Já implementado. |
| `d04a2713` / `ccb479f3` | Pacote lacrado e rasgo — bons, viraram a implementação |
| `4e37a5d7` | Carta emergindo — corrigido, ainda fraco |
| `c5b1a3be` | Página da carta |

**Limite conhecido da ferramenta:** ela desenha página plausível, e "plausível"
para carta de RPG inclui inventar atributos. Inventou tier LEGENDARY, stats
ATTACK/DEFENSE/SPEED, "720 HP" (o teto é 250) e texto de sabor humanizado
mesmo com proibição explícita no prompt. Serve para decidir **layout**; os
números vêm do domínio. Também julga mal qualquer coisa que dependa da arte real
— o placeholder cinza não mostra foil.

Créditos gastos: ~60,5.

## Bloqueado no autor

1. **Olhar a carta** em `/torvalds` e `/facebook/react` — agora as duas coisas,
   o foil ao vivo e a carta exportada, que mudou inteira na fase 1 do revamp.
   Nenhuma das duas foi julgada por pessoa: as duas reprovações anteriores do
   foil foram do autor olhando, e nem essa etapa nem a da carta nova
   aconteceram. Conferido só por PNG renderizado pelo assistente.

   Vale olhar **reduzida**, não só no monitor inteiro: o alvo declarado é a
   carta ler em um segundo num thumbnail de feed, e é lá que a escada de
   raridade se prova. Para ver os oito tiers de uma vez,
   `$env:PREVIEW="out"; npx vitest run tests/unit/render-card.test.ts` grava um
   `tier-<rarity>.png` por tier.

   E force o cache: a rota de imagem responde `max-age=3600`, então o PNG na tela
   pode ser anterior a tudo isto. `?bust=<agora>` resolve.
2. **Subir o Docker Desktop.** Com ele de pé, levantar um Redis e exercitar a
   atomicidade do script Lua — é o único caminho de código que iria para
   produção sem nunca ter rodado. A lógica em volta tem 15 testes com o cliente
   mockado; a atomicidade em si, nenhum.
3. **Classe de carta (ex, Mega ex).** O autor quer que ela seja o "overall" no
   lugar da nota do gitfut. A questão em aberto: se derivar da raridade, não
   acrescenta informação — no TCG real "ser ex" e "estar nos tiers altos" são o
   mesmo fato. Para valer como sinal, precisa medir outra dimensão, tipo
   concentração do perfil (250k estrelas num repo vs. espalhadas em quarenta).

## Próximo trabalho, já decidido — FEITO

Os três itens desta lista foram fechados. O que ficou registrado de cada um:

- **Derivações para cartas de repositório.** Sete linhas em `why.repo.*`, com
  chaves próprias e não reusadas do perfil: as do perfil falam na segunda pessoa
  ("sua linguagem dominante") e aqui o sujeito é o repositório. Três variantes
  onde uma frase só mentiria — linguagem ausente × linguagem fora do mapa de
  tipos (as duas dão `normal`), e repositório parado × arquivado (os dois dão
  score sem bônus). `attacksFrom` passou a devolver uma bandeira
  `fromContributors` em vez de a derivação adivinhar pelo nome do ataque.
- **Ícones de tipo na interface.** `components/card/TypeIcon.tsx`, no nome do
  tipo sob a carta e nas três linhas do painel que carregam um elemento. Sempre
  decorativo (`alt=""`): o nome está escrito ao lado.
- **RFCs conciliadas.** Adendo de supersessão na RFC 4.4 e em `layout-spec.md`,
  com a tabela real de 18 tipos; `decisions.md` ganhou D11 (os 18 tipos) e D12
  (derivações e radar só no site). `design-system.md`, `assets-brief.md` e
  `data-mapping.md` atualizados.

**Ainda não há radar para carta de repositório.** Os cinco eixos de `ratings.ts`
são de perfil (seguidores, anos de conta) e não têm equivalente óbvio num repo.
Com as derivações no lugar, as duas colunas já não saem vazias — mas a esquerda
do repo é mais leve que a do perfil, que tem radar em cima. É decisão de produto,
não pendência de código.

## Padrão que se repetiu, e vale herdar

**O que quebra em layout só quebra olhando.** Nesta sessão, typecheck e testes
passaram verdes enquanto: o dano do ataque sumia da carta, o título aparecia
duplicado, a coluna direita vazava da viewport, a frase de motivo subia acima do
valor, e o alvo de clique nunca assentava. Nenhum foi pego por teste — todos por
screenshot.

Corolário prático: **renderize e olhe antes de dizer que está pronto.** Vale
para carta (`PREVIEW=<dir> npx vitest run tests/unit/render-card.test.ts` grava
os PNGs) e para página (dev server + screenshot).

O padrão se repetiu de novo nos ícones de tipo: pôr o disco dentro de
`.why-value` exigiu trocar `text-align` por flex, e isso desfez o espelhamento da
coluna esquerda — o valor, que ia para a borda de fora, colou no rótulo. Typecheck
e 103 testes verdes; só o screenshot mostrou. A regra específica que sobra:
**quando um elemento vira flex, todo `text-align` herdado nele deixou de valer**,
e é preciso repetir a intenção como `justify-content` em cada override.

Segundo padrão: **cache mascara mudança de domínio.** O cache de cartas é em
memória em desenvolvimento e sobrevive ao hot reload. Toda vez que uma mudança
no domínio não apareceu, a causa foi essa — reinicie o servidor. E quando o
formato da carta muda, suba `CARD_VERSION`: já foi obrigatório duas vezes, por
`rarity: "holo"` e `element: "neutral"` que deixaram de existir e quebrariam ao
renderizar, não ao compilar.

**Há um terceiro cache, e ele engana mais que os outros dois:** o navegador. A
rota de imagem responde `max-age=3600`, então o PNG na tela pode ser de uma hora
atrás enquanto o HTML ao redor já é novo. O sintoma é a página e a carta
discordarem — o rodapé da imagem dizia "Hyper Rare" com a página dizendo "Rara
Ilustrada Especial", e o palpite natural (bug no domínio) estava errado. Antes de
investigar divergência entre página e imagem, recarregue o PNG com
`?bust=<agora>`; se sumir, era cache.

## Ambiente

- `.env.local` existe com `GITHUB_TOKEN`. `REDIS_URL` está vazio — daí as cartas
  saírem sem serial.
- `npm run lint` está quebrado desde antes desta sessão (`next lint` foi removido
  no Next 16). O projeto não tem lint rodando.
- Os testes e2e sobem servidor pelo Playwright e já deixaram processo órfão na
  porta 3000.
