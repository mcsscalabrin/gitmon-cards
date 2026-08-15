/**
 * Interface bilíngue com toggle manual, não auto-detect por navegador (RFC 9.1).
 * Dicionário desde a v1 porque string solta no meio de componente vira retrabalho
 * caro depois (RFC 11).
 *
 * Tom técnico-neutro em tudo, inclusive nos erros: o dado fala por si (RFC 9.2).
 */

export const LOCALES = ["pt", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "pt";

/**
 * Cookie do idioma. Mora aqui e não em `./server` porque o toggle é um componente
 * de cliente — importar do módulo de servidor arrastaria `next/headers` para o
 * bundle do navegador.
 */
export const LOCALE_COOKIE = "gitmon_locale";

/**
 * A **imagem** da carta, ao contrário do site, tem outro padrão: inglês.
 * Ela viaja para dentro do README de qualquer pessoa e não tem como seguir o
 * toggle de quem está vendo — `?lang=pt` na URL cobre quem quiser o contrário.
 */
export const DEFAULT_CARD_LOCALE: Locale = "en";

export function parseLocale(value: string | null | undefined, fallback: Locale): Locale {
  const normalized = value?.trim().toLowerCase().slice(0, 2);
  return LOCALES.includes(normalized as Locale) ? (normalized as Locale) : fallback;
}

const pt = {
  "element.normal": "Normal",
  "element.fire": "Fogo",
  "element.water": "Água",
  "element.grass": "Planta",
  "element.electric": "Elétrico",
  "element.ice": "Gelo",
  "element.fighting": "Lutador",
  "element.poison": "Veneno",
  "element.ground": "Terra",
  "element.flying": "Voador",
  "element.psychic": "Psíquico",
  "element.bug": "Inseto",
  "element.rock": "Pedra",
  "element.ghost": "Fantasma",
  "element.dragon": "Dragão",
  "element.dark": "Sombrio",
  "element.steel": "Aço",
  "element.fairy": "Fada",

  "rarity.common": "Comum",
  "rarity.uncommon": "Incomum",
  "rarity.rare": "Rara",
  "rarity.double_rare": "Rara Dupla",
  "rarity.illustration_rare": "Rara Ilustrada",
  "rarity.ultra_rare": "Ultra Rara",
  "rarity.special_illustration_rare": "Rara Ilustrada Especial",
  "rarity.hyper_rare": "Hiper Rara",

  "card.hp": "PS",
  "card.weakness": "Fraqueza",
  "card.resistance": "Resistência",
  "card.retreat": "Recuo",
  "card.none": "—",
  "card.profile": "Perfil",
  "card.repo": "Repositório",
  "card.footer": "Carta {rarity} · tipo {element}",
  "card.metaDescription":
    "A carta de {subject}, gerada a partir dos dados públicos do GitHub. Sem login, sem cadastro.",

  "stat.stars": "Estrelas",
  "stat.followers": "Seguidores",
  "stat.repos": "Repositórios",
  "stat.forks": "Forks",
  "stat.issues": "Issues abertas",
  "stat.since": "Desde",

  "error.not_found": "Usuário ou repositório não encontrado.",
  "error.organization": "Organizações não geram carta nesta versão.",
  "error.rate_limit": "Limite da API do GitHub atingido. Tente novamente em alguns minutos.",
  "error.no_token": "Servidor sem token do GitHub configurado.",
  "error.upstream": "A API do GitHub não respondeu.",
  "error.battle_expired": "Este resultado de batalha expirou. Gere uma nova batalha.",
  "error.duel_expired": "Este resultado de duelo expirou. Gere um novo duelo.",
  "error.ygo_expired": "Este Speed Duel expirou. Duele de novo.",
  "error.retry": "Tentar de novo",

  "home.tagline": "Cartas geradas a partir de dados reais do GitHub.",
  "home.description":
    "Uma URL de imagem, sem login, que se atualiza sozinha. Cole no seu README.",
  "search.scouting": "buscando nomes…",
  "home.search": "Buscar usuário ou owner/repositório",
  "home.searchAction": "Gerar carta",
  "home.samples": "Exemplos",
  "home.embed": "Embutir no README",
  "home.copy": "Copiar",
  "home.copied": "Copiado",
  "home.download": "Baixar PNG",
  "home.share": "Compartilhar",
  "home.linkCopied": "Link copiado",
  "home.repos": "Repositórios deste perfil",
  "home.battle": "Batalhar",
  "home.battleAction": "Simular batalha",
  "home.opponent": "Adversário",
  "home.modeBattle": "Batalha",
  "home.modeYgo": "Yugioh",
  "home.sponsor": "Apoiar o projeto",
  "home.madeBy": "feito por",
  "home.viewOnGitHub": "Ver no GitHub",

  "card.type": "Tipo",
  "card.attacks": "Ataques",
  "card.rarityLabel": "Raridade",
  "card.flip": "Virar carta",
  "card.flipBack": "Virar de volta",

  "radar.title": "Assinatura do perfil",
  "radar.caption": "Forma comparativa, não medição — os números exatos estão ao lado.",
  "radar.axis": "Eixo",
  "radar.values": "Valores por eixo",
  "radar.normalized": "índice 0–99, escala logarítmica",
  "axis.reach": "Alcance",
  "axis.community": "Comunidade",
  "axis.volume": "Volume",
  "axis.veterancy": "Veterania",
  "axis.breadth": "Amplitude",

  "why.title": "De onde saem estes números",
  "why.element": "Sua linguagem dominante é {language}, ponderada por estrelas.",
  "why.element.none": "Nenhuma linguagem identificada nos seus repositórios próprios.",
  "why.hp": "Base 30 + {stars} estrelas ×3 + {followers} seguidores + {repos} repositórios ×2.",
  "why.attacks": "Seus repositórios mais estrelados: {names}.",
  "why.attacks.none": "Nenhum repositório próprio — a carta sai sem ataque.",
  "why.weakness": "Sua segunda linguagem é {language}.",
  "why.weakness.chain": "Você só escreve numa linguagem, então vem da cadeia de tipos.",
  "why.resistance": "Resistência padrão do seu tipo, pela cadeia de efetividade.",
  "why.resistance.none": "A fraqueza caiu no mesmo tipo da resistência; a fraqueza vence.",
  "why.retreat": "Conta com {years} anos: 1 pip a cada 2 anos, teto de 4.",
  "why.rarity": "{score} pontos — estrelas ×2 + seguidores ×3 + repositórios + anos ×5.",

  /*
   * Frases da carta de repositório. Separadas das de perfil porque lá o sujeito
   * é quem está lendo ("sua linguagem dominante") e aqui é o repositório.
   */
  "why.repo.element": "A linguagem principal do repositório é {language}.",
  "why.repo.element.none": "O GitHub não reporta linguagem principal para este repositório.",
  "why.repo.element.unmapped":
    "{language} não está no mapa de tipos, então a carta cai no tipo padrão.",
  "why.repo.hp":
    "Base 40, em escala logarítmica sobre {stars} estrelas e {forks} forks — teto de 250.",
  "why.repo.attacks": "Maiores contribuidores humanos: {names}.",
  "why.repo.attacks.self":
    "Nenhum contribuidor humano listado — o próprio repositório vira o ataque.",
  "why.repo.weakness": "Fraqueza padrão do tipo, pela cadeia de efetividade.",
  "why.repo.weakness.none": "Este tipo não tem fraqueza na cadeia.",
  "why.repo.resistance": "Resistência padrão do tipo, pela cadeia de efetividade.",
  "why.repo.resistance.none": "Este tipo não resiste a nenhum outro na cadeia.",
  "why.repo.retreat": "{issues} issues abertas: 1 pip a cada 50, teto de 4.",
  "why.repo.rarity":
    "{score} pontos — {stars} estrelas ×2 + {forks} forks ×3 + {bonus} por atividade recente.",
  "why.repo.rarity.stale":
    "{score} pontos — {stars} estrelas ×2 + {forks} forks ×3, sem bônus: o último push passou de 90 dias.",
  "why.repo.rarity.archived":
    "{score} pontos — {stars} estrelas ×2 + {forks} forks ×3. Repositório arquivado não recebe bônus de atividade.",

  "pack.label": "Abrindo o pacote de {name}",
  "pack.brand": "PACOTE DE EXPANSÃO",
  "pack.tear": "Rasgar",
  "pack.skip": "Pular abertura",

  "support.title": "Curtiu o projeto?",
  "support.description":
    "Favoritar o repositório ajuda outras pessoas a encontrarem. Patrocinar ajuda a manter.",
  "support.star": "Favoritar no GitHub",
  "support.stars": "estrelas",

  "battle.winner": "Vencedor",
  "battle.draw": "Empate por HP restante",
  "battle.turn": "Turno {n}",
  "battle.uses": "{attacker} usa {attack}",
  "battle.damage": "{damage} de dano",
  "battle.superEffective": "super efetivo",
  "battle.resisted": "resistido",
  "battle.remaining": "{hp} PS restantes",
  "battle.share": "Compartilhar resultado",
  "battle.rematch": "Batalhar de novo",
  "battle.asYgo": "Versão Yugioh",
  "battle.skip": "Pular animação",
  "battle.radar": "Assinatura do perfil",
  "battle.radarCaption": "Sobreposição dos dois oponentes",
  "battle.axisCompare": "Comparação por eixo",
  "battle.lead": "vantagem",
  "battle.tie": "empate",
  "battle.hpLeft": "PS restantes",

  "duel.lp": "LP",
  "duel.atk": "ATK",
  "duel.def": "DEF",
  "duel.positionAttack": "Ataque",
  "duel.positionDefense": "Defesa",
  "duel.positionFaceDown": "Face-down",
  "duel.yourTurn": "Sua vez — escolha uma ação",
  "duel.opponentTurn": "Vez do oponente…",
  "duel.attacks": "{attacker} ataca",
  "duel.uses": "{attacker} usa {attack}",
  "duel.position": "{name} muda para {position}",
  "duel.passed": "{name} passa o turno",
  "duel.damage": "{damage} de dano",
  "duel.direct": "ataque direto",
  "duel.superEffective": "super efetivo",
  "duel.resisted": "resistido",
  "duel.destroyed": "{name} destruído",
  "duel.bothDestroyed": "os dois são destruídos",
  "duel.pass": "Passar",
  "duel.attack": "Atacar",
  "duel.toAttack": "Mudar para ataque",
  "duel.toDefense": "Mudar para defesa",
  "duel.toFaceDown": "Baixar a carta",
  "duel.saving": "Salvando duelo…",
  "duel.saveError": "Não foi possível salvar o duelo.",
  "duel.turn": "Turno {n}",
  "duel.winner": "Vencedor",
  "duel.draw": "Empate por LP restante",
  "duel.knockout": "Nocaute",
  "duel.share": "Compartilhar duelo",
  "duel.rematch": "Duelar de novo",
  "duel.skip": "Pular animação",

  "ygo.lp": "LP",
  "ygo.atk": "ATK",
  "ygo.def": "DEF",
  "ygo.deck": "Deck: {n}",
  "ygo.grave": "Cemitério: {n}",
  "ygo.phaseDraw": "Compra",
  "ygo.phaseMain": "Fase Principal",
  "ygo.phaseBattle": "Fase de Batalha",
  "ygo.phaseEnd": "Fase Final",
  "ygo.phaseTrap": "Janela de armadilha",
  "ygo.yourTurn": "Sua vez — escolha uma ação",
  "ygo.opponentTurn": "Vez do oponente…",
  "ygo.you": "Você",
  "ygo.summonAttack": "Invocar {name} em ataque",
  "ygo.summonDefense": "Invocar {name} em defesa",
  "ygo.summonFaceDown": "Baixar {name} face-down",
  "ygo.activateSpell": "Ativar {name}",
  "ygo.setTrap": "Baixar {name}",
  "ygo.activateTrap": "Ativar {name}",
  "ygo.flip": "Virar {name}",
  "ygo.attack": "Atacar {name}",
  "ygo.directAttack": "Atacar direto",
  "ygo.pass": "Passar",
  "ygo.dragHint": "Arraste uma carta da mão para o campo",
  "ygo.posAttack": "Ataque",
  "ygo.posDefense": "Defesa",
  "ygo.posFaceDown": "Face-down",
  "ygo.cancel": "Cancelar",
  "ygo.saving": "Salvando duelo…",
  "ygo.saveError": "Não foi possível salvar o duelo.",
  "ygo.turn": "Turno {n}",
  "ygo.winner": "Vencedor",
  "ygo.knockout": "Nocaute",
  "ygo.deckout": "Sem cartas no deck",
  "ygo.timeout": "Tempo esgotado",
  "ygo.share": "Compartilhar duelo",
  "ygo.rematch": "Duelar de novo",
  "ygo.asDuel": "Versão Duelo",
  "ygo.skip": "Pular animação",
  "ygo.damage": "{damage} de dano",
  "ygo.direct": "direto",
  "ygo.destroyed": "{name} destruído",
  "ygo.bothDestroyed": "os dois são destruídos",
  "ygo.usedSpell": "{player} ativa {card}",
  "ygo.setTrapNarr": "{player} baixa {card}",
  "ygo.activatedTrap": "{player} ativa {card}",
  "ygo.summoned": "{player} invoca {card}",
  "ygo.flipped": "{player} vira {card}",
  "ygo.attacks": "{attacker} ataca",
  "ygo.passed": "{player} passa o turno",
  "ygo.startTurn": "Começa o turno de {player}",
  "ygo.windowOpen": "Armadilhas na mesa?",
} as const;

export type MessageKey = keyof typeof pt;

const en: Record<MessageKey, string> = {
  "element.normal": "Normal",
  "element.fire": "Fire",
  "element.water": "Water",
  "element.grass": "Grass",
  "element.electric": "Electric",
  "element.ice": "Ice",
  "element.fighting": "Fighting",
  "element.poison": "Poison",
  "element.ground": "Ground",
  "element.flying": "Flying",
  "element.psychic": "Psychic",
  "element.bug": "Bug",
  "element.rock": "Rock",
  "element.ghost": "Ghost",
  "element.dragon": "Dragon",
  "element.dark": "Dark",
  "element.steel": "Steel",
  "element.fairy": "Fairy",

  "rarity.common": "Common",
  "rarity.uncommon": "Uncommon",
  "rarity.rare": "Rare",
  "rarity.double_rare": "Double Rare",
  "rarity.illustration_rare": "Illustration Rare",
  "rarity.ultra_rare": "Ultra Rare",
  "rarity.special_illustration_rare": "Special Illustration Rare",
  "rarity.hyper_rare": "Hyper Rare",

  "card.hp": "HP",
  "card.weakness": "Weakness",
  "card.resistance": "Resistance",
  "card.retreat": "Retreat",
  "card.none": "—",
  "card.profile": "Profile",
  "card.repo": "Repository",
  "card.footer": "{rarity} {element}-type Card",
  "card.metaDescription":
    "The {subject} card, generated from public GitHub data. No login, no signup.",

  "stat.stars": "Stars",
  "stat.followers": "Followers",
  "stat.repos": "Repositories",
  "stat.forks": "Forks",
  "stat.issues": "Open issues",
  "stat.since": "Since",

  "error.not_found": "User or repository not found.",
  "error.organization": "Organizations do not generate a card in this version.",
  "error.rate_limit": "GitHub API rate limit reached. Try again in a few minutes.",
  "error.no_token": "Server has no GitHub token configured.",
  "error.upstream": "The GitHub API did not respond.",
  "error.battle_expired": "This battle result has expired. Run a new battle.",
  "error.duel_expired": "This duel result has expired. Run a new duel.",
  "error.ygo_expired": "This Speed Duel has expired. Duel again.",
  "error.retry": "Try again",

  "home.tagline": "Cards generated from real GitHub data.",
  "home.description": "One image URL, no login, updating on its own. Paste it in your README.",
  "search.scouting": "searching names…",
  "home.search": "Search a user or owner/repository",
  "home.searchAction": "Generate card",
  "home.samples": "Samples",
  "home.embed": "Embed in your README",
  "home.copy": "Copy",
  "home.copied": "Copied",
  "home.download": "Download PNG",
  "home.share": "Share",
  "home.linkCopied": "Link copied",
  "home.repos": "Repositories of this profile",
  "home.battle": "Battle",
  "home.battleAction": "Simulate battle",
  "home.opponent": "Opponent",
  "home.modeBattle": "Battle",
  "home.modeYgo": "Yu-Gi-Oh",
  "home.sponsor": "Sponsor the project",
  "home.madeBy": "made by",
  "home.viewOnGitHub": "View on GitHub",

  "card.type": "Type",
  "card.attacks": "Attacks",
  "card.rarityLabel": "Rarity",
  "card.flip": "Flip card",
  "card.flipBack": "Flip back",

  "radar.title": "Profile signature",
  "radar.caption": "Comparative shape, not measurement — exact numbers are alongside.",
  "radar.axis": "Axis",
  "radar.values": "Values by axis",
  "radar.normalized": "0–99 index, logarithmic scale",
  "axis.reach": "Reach",
  "axis.community": "Community",
  "axis.volume": "Volume",
  "axis.veterancy": "Veterancy",
  "axis.breadth": "Breadth",

  "why.title": "Where these numbers come from",
  "why.element": "Your dominant language is {language}, weighted by stars.",
  "why.element.none": "No language detected across your own repositories.",
  "why.hp": "Base 30 + {stars} stars ×3 + {followers} followers + {repos} repositories ×2.",
  "why.attacks": "Your most starred repositories: {names}.",
  "why.attacks.none": "No repositories of your own — the card ships without attacks.",
  "why.weakness": "Your second language is {language}.",
  "why.weakness.chain": "You write in a single language, so this comes from the type chain.",
  "why.resistance": "Default resistance of your type, from the effectiveness chain.",
  "why.resistance.none": "The weakness landed on the same type as the resistance; weakness wins.",
  "why.retreat": "Account is {years} years old: 1 pip every 2 years, capped at 4.",
  "why.rarity": "{score} points — stars ×2 + followers ×3 + repositories + years ×5.",

  "why.repo.element": "The repository's main language is {language}.",
  "why.repo.element.none": "GitHub reports no main language for this repository.",
  "why.repo.element.unmapped":
    "{language} is not in the type map, so the card falls back to the default type.",
  "why.repo.hp":
    "Base 40, on a logarithmic scale over {stars} stars and {forks} forks — capped at 250.",
  "why.repo.attacks": "Top human contributors: {names}.",
  "why.repo.attacks.self":
    "No human contributor listed — the repository itself becomes the attack.",
  "why.repo.weakness": "Default weakness of the type, from the effectiveness chain.",
  "why.repo.weakness.none": "This type has no weakness in the chain.",
  "why.repo.resistance": "Default resistance of the type, from the effectiveness chain.",
  "why.repo.resistance.none": "This type resists no other type in the chain.",
  "why.repo.retreat": "{issues} open issues: 1 pip every 50, capped at 4.",
  "why.repo.rarity":
    "{score} points — {stars} stars ×2 + {forks} forks ×3 + {bonus} for recent activity.",
  "why.repo.rarity.stale":
    "{score} points — {stars} stars ×2 + {forks} forks ×3, no bonus: last push is over 90 days old.",
  "why.repo.rarity.archived":
    "{score} points — {stars} stars ×2 + {forks} forks ×3. An archived repository earns no activity bonus.",

  "pack.label": "Opening {name}'s pack",
  "pack.brand": "EXPANSION PACK",
  "pack.tear": "Tear open",
  "pack.skip": "Skip reveal",

  "support.title": "Like this project?",
  "support.description":
    "Starring the repository helps others find it. Sponsoring helps keep it running.",
  "support.star": "Star on GitHub",
  "support.stars": "stars",

  "battle.winner": "Winner",
  "battle.draw": "Decided by remaining HP",
  "battle.turn": "Turn {n}",
  "battle.uses": "{attacker} uses {attack}",
  "battle.damage": "{damage} damage",
  "battle.superEffective": "super effective",
  "battle.resisted": "resisted",
  "battle.remaining": "{hp} HP left",
  "battle.share": "Share result",
  "battle.rematch": "Battle again",
  "battle.asYgo": "Yu-Gi-Oh version",
  "battle.skip": "Skip animation",
  "battle.radar": "Profile signature",
  "battle.radarCaption": "Both opponents overlaid",
  "battle.axisCompare": "Axis by axis",
  "battle.lead": "lead",
  "battle.tie": "tie",
  "battle.hpLeft": "HP left",

  "duel.lp": "LP",
  "duel.atk": "ATK",
  "duel.def": "DEF",
  "duel.positionAttack": "Attack",
  "duel.positionDefense": "Defense",
  "duel.positionFaceDown": "Face-down",
  "duel.yourTurn": "Your turn — choose an action",
  "duel.opponentTurn": "Opponent's turn…",
  "duel.attacks": "{attacker} attacks",
  "duel.uses": "{attacker} uses {attack}",
  "duel.position": "{name} moves to {position}",
  "duel.passed": "{name} passes",
  "duel.damage": "{damage} damage",
  "duel.direct": "direct attack",
  "duel.superEffective": "super effective",
  "duel.resisted": "resisted",
  "duel.destroyed": "{name} destroyed",
  "duel.bothDestroyed": "both are destroyed",
  "duel.pass": "Pass",
  "duel.attack": "Attack",
  "duel.toAttack": "Move to attack",
  "duel.toDefense": "Move to defense",
  "duel.toFaceDown": "Set the card",
  "duel.saving": "Saving duel…",
  "duel.saveError": "Could not save the duel.",
  "duel.turn": "Turn {n}",
  "duel.winner": "Winner",
  "duel.draw": "Decided by remaining LP",
  "duel.knockout": "Knockout",
  "duel.share": "Share duel",
  "duel.rematch": "Duel again",
  "duel.skip": "Skip animation",

  "ygo.lp": "LP",
  "ygo.atk": "ATK",
  "ygo.def": "DEF",
  "ygo.deck": "Deck: {n}",
  "ygo.grave": "Graveyard: {n}",
  "ygo.phaseDraw": "Draw",
  "ygo.phaseMain": "Main Phase",
  "ygo.phaseBattle": "Battle Phase",
  "ygo.phaseEnd": "End Phase",
  "ygo.phaseTrap": "Trap window",
  "ygo.yourTurn": "Your turn — choose an action",
  "ygo.opponentTurn": "Opponent's turn…",
  "ygo.you": "You",
  "ygo.summonAttack": "Summon {name} in attack",
  "ygo.summonDefense": "Summon {name} in defense",
  "ygo.summonFaceDown": "Set {name} face-down",
  "ygo.activateSpell": "Activate {name}",
  "ygo.setTrap": "Set {name}",
  "ygo.activateTrap": "Activate {name}",
  "ygo.flip": "Flip {name}",
  "ygo.attack": "Attack {name}",
  "ygo.directAttack": "Direct attack",
  "ygo.pass": "Pass",
  "ygo.dragHint": "Drag a hand card onto the field",
  "ygo.posAttack": "Attack",
  "ygo.posDefense": "Defense",
  "ygo.posFaceDown": "Face-down",
  "ygo.cancel": "Cancel",
  "ygo.saving": "Saving duel…",
  "ygo.saveError": "Could not save the duel.",
  "ygo.turn": "Turn {n}",
  "ygo.winner": "Winner",
  "ygo.knockout": "Knockout",
  "ygo.deckout": "No cards left in deck",
  "ygo.timeout": "Time up",
  "ygo.share": "Share duel",
  "ygo.rematch": "Duel again",
  "ygo.asDuel": "Duel version",
  "ygo.skip": "Skip animation",
  "ygo.damage": "{damage} damage",
  "ygo.direct": "direct",
  "ygo.destroyed": "{name} destroyed",
  "ygo.bothDestroyed": "both are destroyed",
  "ygo.usedSpell": "{player} activates {card}",
  "ygo.setTrapNarr": "{player} sets {card}",
  "ygo.activatedTrap": "{player} activates {card}",
  "ygo.summoned": "{player} summons {card}",
  "ygo.flipped": "{player} flips {card}",
  "ygo.attacks": "{attacker} attacks",
  "ygo.passed": "{player} passes the turn",
  "ygo.startTurn": "{player}'s turn begins",
  "ygo.windowOpen": "Traps on the field?",
};

const DICTIONARIES: Record<Locale, Record<MessageKey, string>> = { pt, en };

/** `t("pt", "battle.turn", { n: 3 })` → "Turno 3". */
export function t(
  locale: Locale,
  key: MessageKey,
  values?: Record<string, string | number>,
): string {
  const template = DICTIONARIES[locale][key];
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    name in values ? String(values[name]) : match,
  );
}

/**
 * Chaves montadas a partir do domínio. Existem para o TypeScript conseguir provar
 * que `element.fire` é uma chave válida — template literal com variável de união
 * não é inferido como chave sozinho.
 */
export function elementKey(element: string): MessageKey {
  return `element.${element}` as MessageKey;
}

export function rarityKey(rarity: string): MessageKey {
  return `rarity.${rarity}` as MessageKey;
}

export function errorKey(code: string): MessageKey {
  return `error.${code}` as MessageKey;
}

/** Fecha um `t` já ligado a um idioma, para não repetir o locale em cada chamada. */
export function translator(locale: Locale) {
  return (key: MessageKey, values?: Record<string, string | number>) =>
    t(locale, key, values);
}
