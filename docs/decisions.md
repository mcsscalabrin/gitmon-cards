# Decisões e questões abertas

Registro vivo. O RFC (`rfc-001-gitmon-cards.md`) é a fonte da verdade do que foi planejado; este
arquivo registra o que foi decidido depois dele e o que ainda falta decidir.

## Decisões tomadas fora do RFC

| # | Decisão | Motivo |
|---|---|---|
| D1 | **Repositório novo, não fork do gitfut.** O RFC seção 5 trava "fork do gitfut"; foi revertido. | Um fork carrega o selo "forked from", o histórico e o tema futebol de terceiro, e não acumula estrelas bem — e estrelas são o critério de sucesso nº 2 (RFC 9.8). Os padrões arquiteturais do gitfut (RFC 4) continuam sendo a referência. |
| D2 | Nome do repositório: `gitmon-cards`. | RFC 5 deixou em aberto entre `gitmon` e `gitmon-cards`. |
| D3 | `app/[owner]/` como segmento dinâmico único, servindo perfil e dono de repo. | O App Router não permite dois segmentos dinâmicos irmãos no mesmo nível — `[username]` e `[owner]` do RFC colapsam num só. |
| D4 | **A carta interativa é o próprio PNG do servidor** dentro de um container com tilt 3D, não uma reimplementação da carta em DOM. | O gitfut mantém duas versões sincronizadas copiando as mesmas porcentagens entre componente React e renderizador (RFC 4.2, item 3). Com uma carta só, o problema de dessincronização deixa de existir. Custo: o texto da carta não é selecionável — compensado pela tabela de stats ao lado. |
| D5 | **A imagem da carta sai em inglês por padrão**, com `?lang=pt`. O site segue o toggle PT/EN (RFC 9.1). | A imagem viaja para dentro do README de qualquer pessoa e não tem como seguir o toggle de quem está vendo. |
| D6 | **Um ataque tira 1/3 do dano impresso, na batalha.** Desvio da RFC 7.3, item 3. | Seguindo a letra, a batalha acaba no primeiro golpe entre quaisquer duas cartas relevantes: HP satura em 250 e dano satura em 300, então todo perfil com mais de 75 estrelas nocauteia qualquer outro de primeira. O log vira uma linha e quem começa ganha. A RFC 7.3 marca a mecânica como "não travada — ponto de partida pra refinar". **Precisa de aval — ver Q9.** |
| D7 | Dano impresso arredondado para dezenas. | Presentacional: a fórmula da RFC 6.1 continua inteira, só o número exibido muda. Carta de TCG não tem ataque de 84 de dano, e fidelidade visual é objetivo declarado (RFC 5). |
| D8 | `/<a>/vs/<b>` **sorteia e redireciona** para `/battle/<id>`; o resultado inteiro (com as duas cartas embutidas) fica no Redis com TTL. | Separa "o confronto" (ação, sem cache) do "resultado" (recurso imutável e compartilhável), que é o que a RFC 7.3 pede. As cartas vão embutidas para o link não mudar de significado quando as estrelas mudarem. |
| D9 | Fonte da carta: **M PLUS Rounded 1c** (SIL OFL 1.1), subsetada para latim por `npm run fonts`. | Terminais arredondados e um peso Black de verdade dão a leitura de TCG. O subset derruba 3,4 MB por peso para ~43 KB e ainda cobre os símbolos de raridade (● ◆ ★), que fontes só-latinas costumam não ter. |
| D10 | O cache em memória (fallback sem `REDIS_URL`) mora no `globalThis`. | Em desenvolvimento o Next reavalia módulos por bundle de rota: um `Map` no escopo do módulo dá uma instância para a página e outra para a rota de imagem, e o pôster de batalha responde 404 para uma batalha que acabou de ser criada. |
| D11 | **18 tipos, não os 7 elementos da RFC 4.4.** `neutral` virou `normal`, para casar com o nome do ícone. | O argumento da RFC — "mapear ~20 linguagens para 18 tipos não é tratável" — não se sustentou: o mapa é trabalho de tabela, não de arquitetura. O que os 7 custavam era leitura, porque infraestrutura declarativa, shell, verificação formal, funcional, legado e contratos caíam todos em `neutral`. A paleta dos 18 foi **extraída** do disco colorido de cada ícone, não escolhida à mão, então ícone e moldura não podem divergir. Ver o adendo na RFC 4.4 e `lib/cards/elements.ts`. |
| D12 | **As derivações e o radar vivem só no site; a imagem exportada segue limpa.** Por isso `derivations` e `ratings` são opcionais no domínio. | RFC 9.6: o PNG viaja para o README de outra pessoa e não carrega explicação nem afordância de navegação. O renderizador de imagem nunca lê esses campos — se um dia ler, a promessa cai junto. |

## Questões do RFC — resolvidas

| # | Questão | Resolução |
|---|---|---|
| Q1 | Caminho de arte (RFC 8) | **Caminho C.** Moldura vetorial única recolorida por elemento, foil como camada separada nos tiers altos, tudo gerado por código em `scripts/build-assets.mjs`. Arte 100% original. |
| Q2 | Fórmulas da carta de repositório (RFC 6.2) | Escala **logarítmica** para HP e para o dano dos contribuidores. No linear, qualquer repo com ~70 estrelas satura o HP e todo repo popular vira a mesma carta. Ver `lib/cards/repo.ts`. |
| Q3 | Tiers de raridade × 3 símbolos de layout | **Revisto.** A resolução original conciliava os 5 tiers da RFC 6.1 com os 3 símbolos do layout reusando `★` em `holo` e `secret`. O sistema passou depois para **8 tiers no padrão do TCG Pokémon**, e a leitura virou **contagem + cor** de estrela (uma, duas ou três; preta, prateada ou dourada), mais **tratamento de arte** (full-art e camada metálica). Ver `docs/design-system.md` e `lib/cards/rarity.ts`. |
| Q4 | Dimensão do canvas | **500 × 700.** A proporção física do RFC (8,8 × 6,3 cm) dá 0,716; 500/700 dá 0,714. Todas as posições em `lib/cards/layout.json`. |
| Q5 | "Fraqueza a manutenção" não é um dos tipos | `open_issues_count` vira **custo de recuo**, não fraqueza: 1 pip por 50 issues. Mesma leitura ("repo com fila grande é difícil de largar") sem furar o sistema de tipos nem quebrar a cadeia de efetividade. Continua valendo com 18 tipos (D11): "manutenção" não virou um deles. |
| Q6 | Onde persiste o `battle-id` | Redis com TTL (`BATTLE_TTL_SECONDS`, padrão 30 dias), guardando o resultado completo. Link expirado devolve uma carta de erro explicando, não um 404 mudo. |
| Q7 | Quem começa a batalha | **Sorteado.** A RFC 7.3 propôs o desafiante e deixou o sorteio como alternativa; sorteando, a revanche não fica presa numa vantagem fixa de quem digitou a URL. |

## Questões abertas

| # | Questão | Onde | Impacto |
|---|---|---|---|
| Q8 | O protótipo `github-card-prototype.html` nunca chegou em `reference/`. O mapa linguagem→tipo e as faixas de raridade foram calibrados aqui do zero. | `lib/cards/elements.ts`, `lib/cards/rarity.ts` | A RFC 6.1 trata aquele mapa como fonte. Se ele aparecer, reconciliar — lembrando que o mapa de lá seria de 7 elementos e o daqui é de 18 (D11). |
| Q9 | **Aval do desvio D6** (dano a 1/3 na batalha). | `lib/battle/engine.ts` | Alternativas: aceitar como está, mudar o fator, ou voltar ao dano cru e aceitar batalhas de um golpe. |
| Q10 | Os 3 perfis de exemplo da home são fixos no código. | `app/page.tsx` | Se algum deles apagar a conta, a home mostra três cartas de erro. |
| Q11 | Provedor de Redis não escolhido nem configurado. | `.env.example` | Sem `REDIS_URL` o cache é por processo — funciona, mas não protege o rate limit em produção (RFC 11). |
| Q12 | Deploy na Vercel e domínio ainda não feitos. | — | O código já é agnóstico de domínio (`NEXT_PUBLIC_BASE_URL`). |

## Invariantes — não quebrar

- **Sem hardcode de domínio** em lugar nenhum. Tudo passa por `lib/config.ts`, porque o destino é
  um subdomínio de `scalabrin.dev` (RFC 11).
- **i18n desde a primeira tela**, não como retrofit. Toggle manual PT/EN, sem auto-detect (RFC 9.1).
- **A imagem exportada é limpa**: sem marca d'água, sem link de sponsor, sem animação. Monetização
  e branding vivem só no site (RFC 9.6, 7.2).
- **Cache da batalha é a exceção do projeto**: `/<a>/vs/<b>` não pode ter cache duro; só
  `/battle/<id>.png` pode (RFC 7.3).
- **Redis para dados do GitHub é obrigatório em produção**, não otimização (RFC 11).
- **Nenhum asset de terceiro em produção** (RFC 11, `assets-brief.md`).
- **Repositório público desde já, divulgado só no lançamento** (RFC 9.7).
