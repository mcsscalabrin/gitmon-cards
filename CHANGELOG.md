# Changelog

All notable changes to this project will be documented in this file.

Format: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)


## [0.3.0](2026-08-15)

### Org

#### Features

- gera carta para organizacoes do GitHub, com as mesmas formulas de scoring de perfil (RFC 9.4)


### Duelo-yugioh

#### Features

- navegação entre modos e arrastar-e-soltar por pointer events
- updates logic
- arena do speed duel estilo Duel Links (board, replay e poster)
- sistema de duelo v2 (motor, arbitro, board, replay e poster)


### E2e

#### Bug Fixes

- testa producao no endereco publico, e cobre o cache onde ele e visivel
- sonda a protecao da Vercel antes da suite, e agrupa as majors de lint

#### Tests

- espera a hidratacao antes de mandar Escape no pacote


### Deps-dev

#### Chores

- sobe vitest para 4.1.10 e tira a config de JSX que sobrou
- bump typescript from 5.9.3 to 7.0.2
- bump eslint from 9.39.5 to 10.8.1


### Deps

#### Bug Fixes

- regenera o package-lock e volta eslint e typescript ao par suportado

#### Chores

- bump actions/checkout from 4 to 7 in the actions group


### Home

#### Features

- a landing cabe numa tela, com trama no fundo e as cartas na mao


### Pack

#### Features

- o rasgo revela o verso da carta, e a pagina atras fica borrada


### Art

#### Features

- troca os 18 icones de tipo pela v2, e a paleta segue junto


### Mobile

#### Bug Fixes

- corta o sangramento na tela, e devolve o pacote ao centro


### Brand

#### Features

- emblema do verso da carta como favicon, navbar e pacote


### Ci

#### Chores

- mostra o escopo do token quando o pull falha


### General

#### Features

- credita os dois autores no rodape, e abre o README com a marca e os tipos

#### Documentation

- README em ingles, CONTRIBUTING proprio e templates de issue e PR
- registra por que o e2e esta vermelho e o que a esteira ensinou

#### CI/CD

- nao reprova PR de fork, e nomeia o ambiente que falta antes do deploy


### Contributors

Thank you to 3 community contributors:

@mcsscalabrin
- feat(home): a landing cabe numa tela, com trama no fundo e as cartas na mao
- feat(art): troca os 18 icones de tipo pela v2, e a paleta segue junto
- test(e2e): espera a hidratacao antes de mandar Escape no pacote
- fix(mobile): corta o sangramento na tela, e devolve o pacote ao centro
- feat: credita os dois autores no rodape, e abre o README com a marca e os tipos
- fix(e2e): testa producao no endereco publico, e cobre o cache onde ele e visivel
- docs: README em ingles, CONTRIBUTING proprio e templates de issue e PR
- ci: nao reprova PR de fork, e nomeia o ambiente que falta antes do deploy
- fix(e2e): sonda a protecao da Vercel antes da suite, e agrupa as majors de lint
- chore(deps-dev): sobe vitest para 4.1.10 e tira a config de JSX que sobrou
- fix(deps): regenera o package-lock e volta eslint e typescript ao par suportado
- feat(brand): emblema do verso da carta como favicon, navbar e pacote
- docs: registra por que o e2e esta vermelho e o que a esteira ensinou

@benogoulart
- feat(ygo): navegação entre modos e arrastar-e-soltar por pointer events
- feat(duelo-yugioh): updates logic
- feat(duelo-yugioh): arena do speed duel estilo Duel Links (board, replay e poster)
- feat(duelo-yugioh): sistema de duelo v2 (motor, arbitro, board, replay e poster)
- feat(pack): o rasgo revela o verso da carta, e a pagina atras fica borrada

@49699333
- chore(deps-dev): bump typescript from 5.9.3 to 7.0.2
- chore(deps-dev): bump eslint from 9.39.5 to 10.8.1
- chore(deps): bump actions/checkout from 4 to 7 in the actions group

**Contributors:** @mcsscalabrin, @benogoulart, @49699333
