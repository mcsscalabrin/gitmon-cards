# Changelog

All notable changes to this project will be documented in this file.

Format: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)


## [0.3.0](2026-08-15)

### Duelo-yugioh

#### Features

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


### Lib

#### Refactoring

- removes test import and adds canDrag, zone and removes zone, hand


### Tests

#### Features

- adds and import and adds hand, hint and removes hand, glow


### App

#### Features

- adds Link, translator, ROSTER_LOGINS import and adds t, canDuel


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


### General

#### Features

- adds and, useEffect import and removes useEffect import and adds rootRef, dragFromRef and removes handleDragStart, handleDragEnd
- adds useEffect import and adds useMemo
- credita os dois autores no rodape, e abre o README com a marca e os tipos

#### Refactoring

- adds useState

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
- feat(duelo-yugioh): updates logic
- feat(duelo-yugioh): arena do speed duel estilo Duel Links (board, replay e poster)
- feat(duelo-yugioh): sistema de duelo v2 (motor, arbitro, board, replay e poster)
- feat(pack): o rasgo revela o verso da carta, e a pagina atras fica borrada
- feat: adds and, useEffect import and removes useEffect import and adds rootRef, dragFromRef and removes handleDragStart, handleDragEnd
- refactor(lib): removes test import and adds canDrag, zone and removes zone, hand
- feat(tests): adds and import and adds hand, hint and removes hand, glow
- feat(app): adds Link, translator, ROSTER_LOGINS import and adds t, canDuel
- feat: adds useEffect import and adds useMemo
- refactor: adds useState

@49699333
- chore(deps-dev): bump typescript from 5.9.3 to 7.0.2
- chore(deps-dev): bump eslint from 9.39.5 to 10.8.1
- chore(deps): bump actions/checkout from 4 to 7 in the actions group

**Contributors:** @mcsscalabrin, @benogoulart, @49699333
