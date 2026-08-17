# Changelog

All notable changes to this project will be documented in this file.

Format: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)


## [0.3.0](2026-08-17)

### Guia-interativo

#### Features

- adds usePathname, GUIDE_START_EVENT, stepsForPath import and removes HELP, HelpButton, type import and adds tipRef, placeTip and removes metadata, DocsPage and adds useCallback, usePathname
- adds HELP, type, GUIDE_STEPS import and removes HELP, GUIDE_STEPS, GUIDE_START_EVENT import and adds step, isLast and removes GUIDE_START_EVENT, step
- adds HELP, HelpButton, useEffect import and adds HelpButton, anchorRef and adds useState, useEffect
- adds GuideLauncher, getLocale import and removes GuideLauncher import and adds RootLayout, locale and removes RootLayout, a
- adds type, StartGuideButton, CopyField import and adds RepoPage, ProfilePage and removes RepoPage, ProfilePage and adds useRouter, useState, useCallback


### App

#### Features

- updates globals, page
- updates scripts (dictionaries) and globals, page
- adds cookies, redirect, NextResponse import and adds STATE_COOKIE, GET

#### Style

- fixes styles in globals


### Org

#### Features

- gera carta para organizacoes do GitHub, com as mesmas formulas de scoring de perfil (RFC 9.4)


### Duelo-yugioh

#### Features

- updates logic
- arena do speed duel estilo Duel Links (board, replay e poster)
- sistema de duelo v2 (motor, arbitro, board, replay e poster)


### Badges-tour-embed

#### Features

- adds describe import and removes describe, render, StatBadge import and adds tooltip, path and removes path
- adds StatBadge, describe, render import and adds starsStat, forksStat


### Tests

#### Bug Fixes

- axis nos fixtures de Card que vieram do modo yugioh

#### Tests

- removes response


### Modo-yugioh

#### Features

- adds profileCardUrl, login
- adds elementKey, type, cardClassFor import and removes AXES, elementKey, readFileSync import and adds hasA, hasB and removes valuesA, valuesB and adds badge class


### E2e

#### Bug Fixes

- testa producao no endereco publico, e cobre o cache onde ele e visivel

#### Tests

- espera a hidratacao antes de mandar Escape no pacote


### Cards

#### Refactoring

- reconcilia Axis do perfil com o radar do repo apos o merge


### Serial

#### Features

- exercita a atribuicao atomica do script Lua contra um Redis real


### Changelog

#### Documentation

- registra o modo ygo e limpa as entradas auto-geradas


### Ygo

#### Features

- navegação entre modos e arrastar-e-soltar por pointer events


### Site

#### Features

- o segundo eixo chega ao resto do produto


### Card

#### Features

- a raridade ganha um segundo eixo, e o topo ganha relevo


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


### General

#### Features

- credita os dois autores no rodape, e abre o README com a marca e os tipos


### Contributors

Thank you to 2 community contributors:

@benogoulart
- feat(duelo-yugioh): updates logic
- feat(duelo-yugioh): arena do speed duel estilo Duel Links (board, replay e poster)
- feat(duelo-yugioh): sistema de duelo v2 (motor, arbitro, board, replay e poster)
- feat(pack): o rasgo revela o verso da carta, e a pagina atras fica borrada
- docs(changelog): registra o modo ygo e limpa as entradas auto-geradas
- feat(ygo): navegação entre modos e arrastar-e-soltar por pointer events
- feat(badges-tour-embed): adds describe import and removes describe, render, StatBadge import and adds tooltip, path and removes path
- feat(badges-tour-embed): adds StatBadge, describe, render import and adds starsStat, forksStat
- test(tests): removes response
- feat(guia-interativo): adds usePathname, GUIDE_START_EVENT, stepsForPath import and removes HELP, HelpButton, type import and adds tipRef, placeTip and removes metadata, DocsPage and adds useCallback, usePathname
- feat(guia-interativo): adds HELP, type, GUIDE_STEPS import and removes HELP, GUIDE_STEPS, GUIDE_START_EVENT import and adds step, isLast and removes GUIDE_START_EVENT, step
- feat(guia-interativo): adds HELP, HelpButton, useEffect import and adds HelpButton, anchorRef and adds useState, useEffect
- feat(guia-interativo): adds GuideLauncher, getLocale import and removes GuideLauncher import and adds RootLayout, locale and removes RootLayout, a
- feat(modo-yugioh): adds profileCardUrl, login
- style(app): fixes styles in globals
- feat(guia-interativo): adds type, StartGuideButton, CopyField import and adds RepoPage, ProfilePage and removes RepoPage, ProfilePage and adds useRouter, useState, useCallback
- refactor(cards): reconcilia Axis do perfil com o radar do repo apos o merge
- feat(serial): exercita a atribuicao atomica do script Lua contra um Redis real
- feat(modo-yugioh): adds elementKey, type, cardClassFor import and removes AXES, elementKey, readFileSync import and adds hasA, hasB and removes valuesA, valuesB and adds badge class
- feat(app): updates globals, page
- feat(app): updates scripts (dictionaries) and globals, page
- feat(app): adds cookies, redirect, NextResponse import and adds STATE_COOKIE, GET

@mcsscalabrin
- feat(card): a raridade ganha um segundo eixo, e o topo ganha relevo
- feat(home): a landing cabe numa tela, com trama no fundo e as cartas na mao
- feat(art): troca os 18 icones de tipo pela v2, e a paleta segue junto
- test(e2e): espera a hidratacao antes de mandar Escape no pacote
- fix(mobile): corta o sangramento na tela, e devolve o pacote ao centro
- feat: credita os dois autores no rodape, e abre o README com a marca e os tipos
- fix(e2e): testa producao no endereco publico, e cobre o cache onde ele e visivel
- fix(tests): axis nos fixtures de Card que vieram do modo yugioh
- feat(site): o segundo eixo chega ao resto do produto

**Contributors:** @benogoulart, @mcsscalabrin
