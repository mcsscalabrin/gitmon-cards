import { AXES, CEILINGS, normalize, type ProfileAxis } from "./ratings";

/**
 * A tag da carta: o segundo eixo do sistema, ortogonal à raridade.
 *
 * A raridade responde **quão raro** — é escassez, e é uma escada. A tag responde
 * **que tipo** — é categoria, e é um conjunto sem ordem. No TCG são as mesmas
 * duas perguntas: `ex` não é mais raro que `V`, e uma Double Rare não é mais
 * `ex` que outra. Foi essa separação que faltou até aqui, e é por isso que duas
 * cartas do mesmo tier eram a mesma carta: a escada resolvia um eixo só.
 *
 * O vocabulário é de Git, não de Pokémon. `ORIGIN` e `LTS` são palavras que um
 * dev lê sem legenda, não carregam terminologia de produto de terceiro (ver o
 * gap 3.2 em `docs/gaps-revalidacao.md`) e não precisam de tradução — como
 * `commit`, elas são as mesmas nos dois idiomas.
 *
 * **A tag nunca é sorteada.** Ela vem do eixo em que o perfil é mais forte
 * contra o topo do GitHub, então duas pessoas no mesmo tier ficam visualmente
 * diferentes porque *são* diferentes. Um hash do login daria mais dispersão e
 * seria o primeiro elemento da carta que não significa nada (RFC 9.2).
 */
export const AXIS_TAGS = {
  reach: "ORIGIN",
  community: "HUB",
  volume: "MONO",
  veterancy: "LTS",
  breadth: "POLY",
} as const satisfies Record<ProfileAxis, string>;

export type CardTag = (typeof AXIS_TAGS)[ProfileAxis];

/**
 * Padrão do foil por eixo.
 *
 * A descoberta que reordenou o revamp: no TCG os padrões holográficos são
 * **ortogonais à intensidade**. Cosmos e confetti não são "mais foil" que o
 * linear — são foil diferente, de outra tiragem. Só a força é que sobe com o
 * tier.
 *
 * Daí o padrão acompanhar a tag e não a raridade. `foil.json` continua sendo a
 * escada única de intensidade, lida pelas duas pontas; isto aqui escolhe só a
 * geometria. Um tier alto com padrão `cracked` e outro com `cosmos` brilham com
 * a mesma força e ainda assim não são a mesma carta.
 *
 * Ver `patternSvg` em `scripts/lib/art.mjs` para o desenho de cada um.
 */
export const AXIS_PATTERNS = {
  reach: "linear",
  community: "cosmos",
  volume: "confetti",
  veterancy: "cracked",
  breadth: "tinsel",
} as const satisfies Record<ProfileAxis, string>;

export type FoilPattern = (typeof AXIS_PATTERNS)[ProfileAxis];

export const FOIL_PATTERNS = Object.values(AXIS_PATTERNS) as FoilPattern[];

export function tagForAxis(axis: ProfileAxis): CardTag {
  return AXIS_TAGS[axis];
}

export function patternForAxis(axis: ProfileAxis): FoilPattern {
  return AXIS_PATTERNS[axis];
}

/**
 * O eixo mais alto vence, e o empate é resolvido pela ordem de `AXES`.
 *
 * O desempate não é detalhe: sem ele, dois eixos empatados em 71 poderiam sair
 * em ordem diferente entre duas gerações da mesma carta, e a carta mudaria de
 * tag sem nada ter mudado no GitHub. É o mesmo motivo pelo qual `rankLanguages`
 * desempata por ordem alfabética em `./profile.ts`.
 *
 * Empate é comum de propósito: os valores são inteiros de 0 a 99, e quase toda
 * conta nova tem vários eixos em 0.
 */
function dominant(scores: Record<ProfileAxis, number>): ProfileAxis {
  let winner: ProfileAxis = AXES[0];
  for (const axis of AXES) {
    if (scores[axis] > scores[winner]) winner = axis;
  }
  return winner;
}

export interface ProfileAxisInput {
  stars: number;
  followers: number;
  repos: number;
  years: number;
  languages: number;
}

/**
 * Eixo dominante do perfil, na mesma normalização e nos mesmos tetos do radar.
 *
 * Reusar `CEILINGS` é obrigatório e não conveniência: o radar do site e a tag da
 * carta têm que concordar sobre em que eixo a pessoa é mais forte. Dois conjuntos
 * de tetos fariam o polígono apontar para um lado e a tag dizer outro, na mesma
 * página.
 */
export function dominantAxisForProfile(input: ProfileAxisInput): ProfileAxis {
  return dominant({
    reach: normalize(input.stars, CEILINGS.reach),
    community: normalize(input.followers, CEILINGS.community),
    volume: normalize(input.repos, CEILINGS.volume),
    veterancy: normalize(input.years, CEILINGS.veterancy),
    breadth: normalize(input.languages, CEILINGS.breadth),
  });
}

/**
 * Tetos do repositório, calibrados contra o topo real do GitHub e não contra
 * números redondos — mesma disciplina de `CEILINGS`.
 *
 * `reach` sobe para 400k porque o teto de estrelas de repositório é mais alto que
 * o de perfil: freeCodeCamp sozinho passa dos 400k, enquanto o perfil mais
 * estrelado soma menos que isso.
 */
export const REPO_CEILINGS = {
  reach: 400_000,
  community: 80_000,
  volume: 10_000,
  veterancy: 20,
} as const;

export interface RepoAxisInput {
  stars: number;
  forks: number;
  openIssues: number;
  years: number;
}

/**
 * Eixo dominante do repositório. **Nunca devolve `breadth`.**
 *
 * Não é limitação: um repositório tem uma linguagem dominante por construção, e
 * "amplitude de linguagens" não é uma pergunta que se possa fazer a ele. `POLY`
 * fica sendo exclusivo de perfil — escassez de verdade, derivada do dado, e não
 * uma regra especial inventada para criar escassez.
 *
 * Os três eixos que sobram usam métricas que existem em `GitHubRepo`, e essa foi
 * a restrição que decidiu o mapa:
 *
 * - `community` é **forks**, não contagem de contribuidores. O cliente busca
 *   contribuidores com `per_page=10` (`lib/github/client.ts`), então a contagem
 *   satura em 10 para qualquer repositório real e não separa nada.
 * - `volume` é a **fila de issues abertas**, que é o volume de tráfego pela qual
 *   o projeto passa. É a mesma métrica que já vira custo de recuo, lida por
 *   outro ângulo.
 * - `watchers_count` não entra em lugar nenhum: na API do GitHub ele é apelido
 *   legado de `stargazers_count` e traria o mesmo número duas vezes.
 */
export function dominantAxisForRepo(input: RepoAxisInput): ProfileAxis {
  return dominant({
    reach: normalize(input.stars, REPO_CEILINGS.reach),
    community: normalize(input.forks, REPO_CEILINGS.community),
    volume: normalize(input.openIssues, REPO_CEILINGS.volume),
    veterancy: normalize(input.years, REPO_CEILINGS.veterancy),
    // Inatingível por construção — ver o comentário acima.
    breadth: -1,
  });
}
