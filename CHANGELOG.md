# Changelog

All notable changes to this project will be documented in this file.

Format: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)


## [0.2.0](2026-08-12)

### Lib

#### Features

- adds baseUrl import and adds oauthConfig, clientId in oauth

#### Bug Fixes

- removes baseUrl import and adds appBaseUrl, explicit and removes appBaseUrl in oauth


### App

#### Features

- updates icon, layout


### Components

#### Features

- adds useRef, UserSearchInput import and removes useState import and adds inputRef, resolved and removes target


### General

#### Features

- adds searchUsers, useRef, UserSearchInput import and removes useState import and adds dynamic, GET and removes target and adds useState, useRef, useId
- adds checkCardRateLimit, type, getRedisClient import and adds discoverPool, pool and removes authHeaders, token
- o site passa a falar a lingua da carta
- levar a carta embora -- previa de link, baixar PNG e compartilhar
- a raridade se expressa em superficie e borda, nao so em simbolo
- mais arte, e a solda entre arte e moldura
- HP como heroi numerico do cabecalho
- serial como elemento de design, e o rodape redesenhado sem ele
- foil impresso reassado em quatro camadas
- foil holografico por camadas e aureola do elemento
- icones de tipo na interface
- derivacoes da carta de repositorio
- arranjo simetrico da pagina da carta
- radar de assinatura do perfil
- 18 tipos, escada de raridade do TCG, serial e explicacao dos status
- batalha, site bilingue e carta interativa
- arte original, renderizacao da imagem e rotas de card
- base Next.js, dominio de cartas e scoring

#### Bug Fixes

- inclinacao 3D da carta nunca chegou a aplicar

#### Documentation

- estado real depois da fase 1 do revamp
- plano do revamp visual e as decisoes que o travam
- secao de contribuicao no README
- README conciliado com o codigo
- concilia RFC e specs com os 18 tipos
- handoff da sessao com o contexto que nao esta no codigo

#### Chores

- scaffold inicial do gitmon-cards


### Contributors

Thank you to 2 community contributors:

@mcsscalabrin
- feat: foil holografico por camadas e aureola do elemento
- fix: inclinacao 3D da carta nunca chegou a aplicar
- docs: secao de contribuicao no README
- docs: README conciliado com o codigo
- docs: concilia RFC e specs com os 18 tipos
- feat: icones de tipo na interface
- feat: derivacoes da carta de repositorio
- docs: handoff da sessao com o contexto que nao esta no codigo
- feat: arranjo simetrico da pagina da carta
- feat: radar de assinatura do perfil
- feat: 18 tipos, escada de raridade do TCG, serial e explicacao dos status
- feat: o site passa a falar a lingua da carta
- feat: levar a carta embora -- previa de link, baixar PNG e compartilhar
- docs: estado real depois da fase 1 do revamp
- feat: a raridade se expressa em superficie e borda, nao so em simbolo
- feat: mais arte, e a solda entre arte e moldura
- feat: HP como heroi numerico do cabecalho
- feat: serial como elemento de design, e o rodape redesenhado sem ele
- feat: foil impresso reassado em quatro camadas
- docs: plano do revamp visual e as decisoes que o travam

@benogoulart
- feat(app): updates icon, layout
- feat(components): adds useRef, UserSearchInput import and removes useState import and adds inputRef, resolved and removes target
- feat: adds searchUsers, useRef, UserSearchInput import and removes useState import and adds dynamic, GET and removes target and adds useState, useRef, useId
- fix(lib): removes baseUrl import and adds appBaseUrl, explicit and removes appBaseUrl in oauth
- feat(lib): adds baseUrl import and adds oauthConfig, clientId in oauth
- feat: adds checkCardRateLimit, type, getRedisClient import and adds discoverPool, pool and removes authHeaders, token

**Contributors:** @mcsscalabrin, @benogoulart
