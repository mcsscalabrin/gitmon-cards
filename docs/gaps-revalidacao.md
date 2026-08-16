# Gaps da revalidação

Levantamento feito após a implementação da escada de 8 tiers, do número de série,
dos tratamentos de arte, da faixa de apoio, da abertura de pacote e do foil ao
vivo. Nada aqui está decidido — é material para decidirmos juntos.

Estado no momento do levantamento: `npm test` 62/62, `npm run typecheck` limpo,
`npm run build` passa, `npm run test:e2e` 8/8.

Estado após a primeira rodada de correções: **77 unitários, 13 e2e**, typecheck e
build limpos.

## Placar

| # | Gap | Estado |
|---|---|---|
| 1.1 | `.superdesign/` ignorado e referenciado pelo código | ✅ resolvido |
| 1.2 | `npm run lint` quebrado | ✅ resolvido |
| 1.3 | Documentação contradiz o código | ✅ resolvido |
| 2.1 | `serial.ts` sem teste, Lua nunca executado | 🟡 parcial |
| 2.2 | Abertura de pacote sem teste, bloqueia interação | ✅ resolvido |
| 2.3 | `SupportBand` sem teste | ⬜ aberto |
| 3.1 | Pôster de batalha ignora raridade | ✅ resolvido |
| 3.2 | Terminologia do TCG Pokémon | ⬜ decisão sua |
| 3.3 | Cauda da distribuição desconhecida | ⬜ decisão sua |
| 3.4 | Pacote toca em toda visita | ⬜ decisão sua |
| 4.1 | `PackOpening` sem focus trap | ✅ resolvido |
| 4.2 | Foil ao vivo nunca visto por ninguém | 🟡 corrigido — falta seu olhar final |
| 4.3 | `.env.example` incompleto | ✅ resolvido |
| 5.1 | Erro no `pages.md` que eu gerei | ✅ resolvido |
| 5.2 | Estágio 3 do canvas fraco | 🟡 segunda rodada aplicada — falta seu olhar |
| 6.1 | Alvo de clique em movimento perpétuo | ✅ resolvido (achado novo) |

---

## Corrigido durante a revalidação

**e2e quebrado por regressão minha.** A faixa de apoio escreve "2 stars", e o
`getByText("STARS")` do teste de idioma passou a casar com dois elementos
(strict mode violation). O seletor agora aponta o `dt` do `stat-grid`
explicitamente. Era defeito introduzido, não teste desatualizado.

---

## 1. Risco real

### 1.1 `.superdesign/` está no `.gitignore`, e o código aponta para lá — RESOLVIDO

`.gitignore:53` ignora `.superdesign`, mas `components/card/TiltCard.tsx`
referenciava `.superdesign/reference/reflective-foil.md` como se fosse
documentação do projeto. Quem clonasse não teria o arquivo.

Correção: os dois documentos que são de projeto, e não sobra da ferramenta,
foram versionados em `docs/design-system.md` e `docs/foil-especular.md`, e a
referência no código passou a apontar para lá. `.superdesign/` segue ignorado —
é diretório de trabalho do Superdesign, e o `init/` lá dentro é contexto gerado,
não documentação.

**Correção deste próprio documento:** a versão original dizia que
`lib/cards/rarity.ts` e `lib/cards/serial.ts` também apontavam para
`.superdesign/`. Não apontavam — só o `TiltCard`. Escrevi de memória em vez de
verificar.

### 1.2 `npm run lint` não funciona — RESOLVIDO

Decidido pela primeira alternativa: ESLint direto, em flat config.
`eslint.config.mjs` espalha `eslint-config-next/core-web-vitals` e
`eslint-config-next/typescript`, e o script virou `eslint . --max-warnings=0`.
O lint entrou no gate do CI junto com typecheck e unitários.

`--max-warnings=0` é deliberado: aviso que não quebra é aviso que ninguém lê. Ou
a regra vale e fica ligada, ou não vale e é desligada em `eslint.config.mjs` com
o motivo escrito. Duas foram desligadas assim, e nenhuma por preguiça:

- `@next/next/no-img-element` — `<img>` cru é decisão do projeto nos quatro
  lugares onde aparece (carta já em 500x700 vinda de rota de API, ícones de tipo
  em SVG local, avatar já dimensionado da CDN do GitHub).
- `jsx-a11y/alt-text`, só em `lib/og/**` — aquele JSX não vira DOM, vira PNG via
  Satori. Não há leitor de tela do outro lado.

**O que a primeira execução encontrou**, e vale registrar porque nenhum dos dois
é ruído (2 erros, 16 avisos no total):

1. `components/card/TiltCard.tsx` — `react-hooks/immutability` no laço de rAF que
   se reagenda (`requestAnimationFrame(tick)` dentro do próprio `tick`). A regra
   avisa que o laço em curso chamaria um `tick` velho se ele mudasse. Neste
   componente ele não muda: `paint` é `useCallback(..., [])`, então `tick` tem
   uma única identidade em toda a vida do componente. Suprimido no local, com o
   argumento escrito ao lado.
2. `components/ui/LocaleToggle.tsx` — a mesma regra em `document.cookie = ...`,
   sugerindo mover para um efeito. Aqui ela erra o alvo: num efeito a escrita
   aconteceria **depois** do `router.refresh()`, e a árvore voltaria no idioma
   antigo. Suprimido no local, também com o motivo.

Se um dia esses dois virarem refatoração de verdade, os comentários dizem contra
o que ela precisa provar.

### 1.3 A documentação contradiz o código

Cinco documentos ainda descrevem o sistema de 5 tiers:

| Arquivo | Linha | O que diz |
|---|---|---|
| `docs/rfc-001-gitmon-cards.md` | 124 | `common / uncommon / rare / holo / secret` |
| `docs/decisions.md` | 27 | Q3: "5 tiers de raridade × 3 símbolos" |
| `docs/data-mapping.md` | 21 | `common / uncommon / rare / holo / secret` |
| `docs/layout-spec.md` | 61, 63 | 5 tiers, `holo`/`secret` reusam `★` |
| `docs/assets-brief.md` | 17, 26 | "1-2 overlays de holo/foil" (agora são 6 + 2 metais) |

A RFC é a fonte de verdade declarada do projeto. Hoje ela descreve um sistema que
não existe mais.

**Decisão:** atualizar os cinco, ou registrar um adendo à RFC dizendo que a
seção 6.1 foi substituída. Atualizar `decisions.md` parece obrigatório — é onde
as perguntas travadas vivem.

---

## 2. Cobertura ausente

### 2.1 `lib/cards/serial.ts` não tem nenhum teste — PARCIAL

É o único código do projeto com **estado durável e concorrência** (script Lua
para atribuição atômica), e é o menos testado de todos. Nenhum teste cobre:
atribuição na primeira chamada, idempotência na segunda, ausência de Redis,
falha do Redis no meio.

Agrava: o serial **nunca foi exercitado com Redis de verdade**. `REDIS_URL` está
vazio no ambiente local, então só o caminho `null` rodou. O script Lua nunca
executou uma vez sequer.

**Feito:** `tests/unit/serial.test.ts`, 15 casos com o cliente mockado —
ausência de store, atribuição, retorno como string, ordem das chaves passadas ao
script, retornos inválidos (`0`, negativo, `NaN`, texto, `null`), falha do store,
`peekSerial` sem atribuir e `withSerial` sem mutar a carta.

**O que continua sem prova:** a **atomicidade do script Lua**. Só um Redis de
verdade demonstra que duas requisições simultâneas para o mesmo usuário novo
recebem o mesmo número. Tentei subir um container e o daemon do Docker Desktop
não estava rodando — iniciar o Docker é ação do autor, não minha.

**Decisão:** subir o Docker Desktop e me avisar (eu levanto o container e rodo),
ou aceitar que a atomicidade vai para produção sem nunca ter sido exercitada.

### 2.2 A abertura de pacote bloqueia interação e não tem teste

`PackOpening` é um overlay `position: fixed; inset: 0; z-index: 50` que cobre a
página inteira até ser rasgado ou pulado. Nenhum teste — unitário ou e2e —
cobre esse componente.

Os 8 testes e2e passam, mas **por sorte de seletor**: nenhum deles clica em algo
que o overlay estaria cobrindo. Um teste futuro que clique na página da carta vai
falhar de um jeito confuso.

**Feito:** cinco testes e2e em `tests/e2e/smoke.spec.ts`, num describe próprio —
o overlay cobre a página e recebe o foco, pular dispensa, rasgar dispensa e
revela a carta, `Escape` pula, e o foco fica confinado. O bloco existe para que
esse esbarrão tenha nome, em vez de virar falha confusa em outro teste.

### 2.3 `SupportBand` sem teste

Nem unitário nem e2e. O caminho `stars === null` (API fora do ar) nunca foi
exercitado — só o caminho feliz, que eu vi ao vivo.

---

## 3. Decisões de produto em aberto

### 3.1 O pôster de batalha ignora o sistema de raridade — RESOLVIDO

Resolvido na propagação do segundo eixo: o pôster passou a carregar **símbolo de
raridade com a cor do metal, o nome do tier e a tag**, na mesma gramática do
cabeçalho da carta (nome + sufixo pendurado na linha de base).

A decisão que faltava foi de escopo, não de sim ou não: entrou **identidade**, e
não a escada visual inteira. Foil, moldura, padrão e textura ficam de fora porque
ali não há carta — há um painel de placar, e importar o tratamento de superfície
para dentro dele faria o pôster competir com a carta em vez de apontar para ela.

Registro do problema original:

`lib/og/renderBattle.tsx` não referenciava `rarity`, `serial`, `hasFoil` nem
`cardTreatment`. As duas superfícies de imagem do produto divergiam: a carta
mostrava tier, símbolo, foil, metal e serial; o pôster de batalha, nada disso.

Podia ser certo — batalha é sobre HP e dano, não sobre colecionar. Mas era uma
divergência que ninguém decidiu de propósito.

### 3.2 Terminologia do TCG Pokémon

`Illustration Rare`, `Special Illustration Rare` e `Hyper Rare` são termos
específicos do produto da Pokémon Company. `Common`/`Uncommon`/`Rare`/`Ultra Rare`
são genéricos de TCG e não preocupam.

Num produto público que já se apresenta como parecido com Pokémon, os três
primeiros aproximam mais do original do que o resto do projeto se permitiu (a
RFC 11 e o cabeçalho de `scripts/lib/art.mjs` deixam claro que nenhum asset é
derivado de material da Pokémon Company).

### 3.3 A cauda da distribuição de raridade é desconhecida

A escada foi calibrada contra 8 perfis reais. `hyper_rare` (≥ 800.000) pegou 2
deles. Mas 8 perfis são uma amostra escolhida a dedo por mim, toda de gente
conhecida — não sei como se comporta o meio da distribuição, onde estão quase
todos os usuários reais do GitHub.

Especificamente: não sei se `illustration_rare` (8.000) e `ultra_rare` (40.000)
são faixas povoadas ou faixas vazias entre "dev comum" e "celebridade".

### 3.4 O pacote toca em toda visita

Decisão consciente (RFC 7.2 proíbe estado por visitante), mas o custo é real e
não foi medido: quem consulta cinco perfis seguidos rasga cinco pacotes. O botão
de pular existe desde o primeiro quadro justamente por isso, mas ninguém testou
se isso basta.

---

## 4. Qualidade e acessibilidade

### 4.1 `PackOpening` não tem focus trap — RESOLVIDO

Implementado: `Tab` e `Shift+Tab` circulam entre os botões habilitados do
overlay, e foco que esteja fora é puxado de volta. Coberto por e2e.

Registro do problema original:

Tem `role="dialog"`, `aria-modal="true"`, foco inicial no pacote, `Escape` para
pular e restauração de foco ao sair. **Não tem focus trap**: `Tab` escapa para os
elementos atrás do overlay, que estão visualmente cobertos e logicamente
inacessíveis.

`aria-modal="true"` promete ao leitor de tela algo que o DOM não cumpre.

### 4.2 O foil ao vivo nunca foi validado visualmente — CORRIGIDO

É a terceira tentativa nesse efeito, e as duas anteriores foram reprovadas.
Confirmei que a camada está no DOM no tier certo e ausente no errado, mas não
consegui capturar o efeito funcionando — a automação do navegador entrou em
estado de zoom e o efeito depende de `pointermove` real.

**Ninguém olhou o resultado ainda.**

**Correção (rodada 2, na branch `feat/ajustes-foil-ao-vivo-e-pacote`):** a
validação por pixels revelou que o ao vivo e o PNG assado divergiam no
**desenho**, não na presença da camada. O ao vivo usava um arco-íris fixo de
seis cores; o PNG assado lia as bandas de `foil.json`. Na `hyper_rare` de
`/torvalds`, a região do ponteiro mostrava magenta/roxo (hue 300°, 31%) numa
carta que o feed imprime dourada (hue 30°, 98%) — o site desmentia a carta
exibida, exatamente o defeito que `foil.json` foi criado para impedir.

A correção fez o ao vivo ler as mesmas bandas do impresso:

- `lib/cards/rarity.ts` ganhou `foilBands()`, a ponta ao vivo de `foil.bands`;
- `components/card/TiltCard.tsx` monta o gradiente `.tilt-spectral` com as
  bandas do tier (via CSS `--spectrum`) e o relevo agora usa a mesma curva
  convexa da build (`t^2.4` em `feComponentTransfer`, `tableValues`), em vez de
  um contraste linear que lavava a saturação;
- o `data-metal` saiu da pilha — a temperatura dourado/prata já vem das bandas.

Resultado medido (screenshots + sharp, ponteiro sobre o canto da carta):

- antes: ponteiro dava hue 300°/270°; agora dá **30° (95%)** — igual ao
  exportado (30°, 98%);
- a saturação da região do ponteiro cai de 0.214→0.096 antes; agora
  0.214→0.195, sem o véu branco que apagava o brilho.

Coberto por `tests/unit/rarity.test.ts` ("devolve ao TiltCard exatamente as
bandas que a build assa"). Falta só o seu olhar em `/torvalds`.

### 4.3 `.env.example` não documenta `PROJECT_STARS_TTL_SECONDS`

Variável adicionada em `lib/config.ts` com default de 3600, ausente do
`.env.example`.

---

## 5. Imprecisões nos artefatos que eu mesmo gerei

### 5.1 `.superdesign/init/pages.md` tem uma afirmação falsa

Diz que `components/battle/VersusPage.tsx` importa `TiltCard`. Não importa —
`TiltCard` só é usado por `CardPanel`. Foi inferência minha ao montar a árvore de
dependências, apresentada como se fosse verificada.

Se esse arquivo alimentar decisões de design futuras, alimenta com dado errado.

### 5.2 O estágio 3 do canvas continua fraco — SEGUNDA RODADA APLICADA

Os dois defeitos duros foram corrigidos (carta em retrato, botão de pular fora do
caminho). Mas o banho de cor do elemento ficou tímido e a embalagem caindo não se
lê. Não insisti porque o canvas julga mal qualquer coisa que dependa da arte
real — o placeholder cinza continua lá.

**Segunda rodada (branch `feat/ajustes-foil-ao-vivo-e-pacote`):** o banho de
cor (auréola) subiu de 34% para 46% no centro e de 12%@34% para 17%@38%, com
apagamento em 72% — para o elemento parecer banhado pelo foil, não tingido. A
embalagem caindo agora cai de verdade: o corpo acelera com gravidade
(`cubic-bezier(0.55, 0, 1, 0.45)`) e desce 125% em vez de 58%, a tira rasgada
sai de cena (85%, -185%) em vez de virar para o lado, e o pacote só some no fim
da queda em vez de desaparecer no meio. Fica a ressalva de sempre: o placeholder
cinza limita o que dá para julgar no canvas.

---

---

## 6. Achado durante a correção

### 6.1 O alvo de clique estava em movimento perpétuo — RESOLVIDO

O e2e de "rasgar o pacote" falhou com `element is not stable`: a animação de
respiração (`pack-idle`, infinita) estava aplicada ao próprio `<button>`, então
o alvo de clique nunca assentava.

Não era chatice do Playwright. Um alvo que se move sem parar é hostil para quem
tem dificuldade motora, e a checagem de estabilidade do Playwright é justamente
um detector disso. A respiração passou para um `<span class="pack-float">`
interno: o desenho se mexe, a área clicável fica parada.

Vale como princípio para o resto do projeto: **animação de espera nunca no
elemento interativo**.

---

## Sugestão de ordem

A primeira rodada fechou 1.1, 1.3, 2.2, 4.1, 4.3, 5.1 e 6.1. O que sobrou, por
quem consegue resolver:

**Depende de você, e destrava trabalho meu:**

1. **4.2** — olhar o foil ao vivo em `/torvalds`. Terceira tentativa no efeito,
   duas reprovadas; não declaro resolvido sem você ver.
2. **2.1** — subir o Docker Desktop. Com ele de pé eu levanto o Redis, exercito
   a atribuição concorrente e fecho o único caminho de código que iria para
   produção sem nunca ter rodado.

**Decisões de produto, só suas:**

3. **3.1** — pôster de batalha mostra raridade e serial, ou fica como está.
4. **3.2** — manter a terminologia específica do TCG Pokémon.
5. **3.4** — o pacote continuar tocando em toda visita.

**Trabalho meu, quando você quiser:**

6. **2.3** — teste do `SupportBand`, incluindo o caminho sem contador.
7. **3.3** — medir a distribuição num conjunto maior e menos enviesado que os 8
   perfis célebres que escolhi.
8. **5.2** — mais uma rodada no estágio 3 do canvas, com a ressalva de sempre: o
   placeholder cinza limita o que dá para julgar lá.

---

## 7. Achado ao montar o CI

### 7.1 `elements.test.ts` encosta no timeout lendo assets

O caso "tem os assets de todo tipo no disco" usa `readFileSync` para checar
existência: 72 arquivos, ~4 MB de PNG, lidos por inteiro dentro do orçamento
padrão de 5s do Vitest. Nesta máquina (Windows) a leitura sozinha leva ~4s, e o
teste **falha por timeout** — reproduzível, não é sorte de agendamento.

Não é regressão e não é do diff do CI: o teste lê o mesmo que sempre leu, só que
agora há mais assets no disco que quando ele foi escrito. Deve passar no runner
Linux do CI, onde não há antivírus no caminho — mas com margem fina, e um teste
que flaka bloqueia o deploy junto.

**Decisão sua:** trocar `readFileSync` por `statSync`/`existsSync` (é existência
que o teste afirma verificar, e o comentário dele diz isso), ou subir o
`testTimeout` em `vitest.config.ts`. A primeira ataca a causa; a segunda só
compra tempo.

**Atualização:** passou no runner Linux nas quatro execuções do CI, em ~40s de
job inteiro. Confirma que é lentidão de disco no Windows, não defeito — mas a
margem continua fina e o veredito segue valendo.

### 7.2 O e2e está vermelho por Deployment Protection, não por código

O `preview.yml` chega até o fim: `quality`, `deploy` e `comment` passam, e o
preview sobe. O `e2e` falha porque a Vercel intercepta todo request ao
deployment com um `302` para `vercel.com/sso-api`, e o Playwright segue o
redirecionamento e recebe HTML onde esperava PNG:

```
Expected: "image/png"
Received: "text/html; charset=utf-8"
```

Não é a carta de erro (que seria PNG com 404) nem falta de `GITHUB_TOKEN` — é a
proteção respondendo antes de a aplicação existir. Verificado à mão:
`HEAD /torvalds.png` no preview devolve `302` com
`location: https://vercel.com/sso-api?...`.

**O código já está pronto para as duas saídas.** `playwright.config.ts` manda
`x-vercel-protection-bypass` e `x-vercel-set-bypass-cookie` quando
`VERCEL_AUTOMATION_BYPASS_SECRET` existe, e ignora quando não existe.

**Decisão sua:** gerar o *Protection Bypass for Automation* em Project Settings
→ Deployment Protection e gravá-lo como secret (previews seguem privados), ou
desligar a Vercel Authentication no Preview (um clique, mas cada preview vira
URL pública, e quem achar consome o token do GitHub e o Redis de preview).

Adiado conscientemente. Enquanto isso o `e2e` fica vermelho por motivo
conhecido — o que ele **não** está provando é justamente o que ele existe para
provar, então não vale tratar esse vermelho como ruído de fundo.

---

## 8. Restrições descobertas rodando a esteira

Duas coisas que só apareceram na primeira execução real, e que custam uma hora
cada se forem redescobertas do zero:

1. **Token da Vercel restrito a um projeto não funciona com o CLI.** Menor
   privilégio era o instinto certo, mas `vercel pull` precisa resolver
   `/v2/user`, e um token limitado a um projeto não consegue — `vercel whoami`
   responde `User not found` e o `pull` morre em `Could not retrieve Project
   Settings`. O detalhe cruel: **um token inválido produz exatamente os mesmos
   dois erros**, então o sintoma não distingue "escopo errado" de "valor
   errado". O token precisa ser de escopo do time com acesso a *All Projects*.
2. **As actions oficiais estavam quatro majors atrás** do que eu fixei de
   memória (v4 contra v7 de `checkout`/`setup-node`/`upload-artifact`). O runner
   avisava que elas apontam para Node 20, deprecado. Vale conferir o release
   mais recente em vez de escrever a versão de cabeça.
