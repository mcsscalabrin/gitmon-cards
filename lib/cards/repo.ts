import type { GitHubContributor, GitHubRepo } from "../github/types";
import { ELEMENT_CHAIN, LANGUAGE_ELEMENTS, elementForLanguage } from "./elements";
import {
  FOOTER_CHARS,
  clamp,
  costForDamage,
  daysSince,
  roundDamage,
  roundToTen,
  truncate,
  year,
  yearsSince,
} from "./format";
import { elementKey, rarityKey } from "../i18n/dictionaries";
import { rarityForScore } from "./rarity";
import { dominantAxisForRepo, tagForAxis } from "./tag";
import type { Axis } from "./ratings";
import type { Attack, Card, Derivation, Element } from "./types";

/**
 * Carta de repositório. A RFC 6.2 deixou as fórmulas em aberto (questão Q2); o
 * que está aqui fecha a questão. Duas escolhas merecem justificativa:
 *
 * 1. **Escala logarítmica**, ao contrário da carta de perfil (RFC 6.1, linear).
 *    A distribuição de estrelas por repositório tem cauda longa demais: no
 *    linear, qualquer repo com ~70 estrelas já satura o HP em 250 e todo repo
 *    popular vira a mesma carta. O log espalha de 40 a ~240 ao longo de cinco
 *    ordens de grandeza, que é o intervalo real do GitHub.
 *
 * 2. **`open_issues_count` vira custo de recuo, não fraqueza** (questão Q5). A
 *    RFC 6.2 propôs "fraqueza a manutenção", mas "manutenção" não é um dos 7
 *    elementos e criar um oitavo quebraria a cadeia inteira e o motor de
 *    batalha. Recuo caro carrega a mesma leitura — um repo com fila grande de
 *    issues é mais difícil de largar — sem furar o sistema de tipos.
 */
export function buildRepoCard(
  repo: GitHubRepo,
  contributors: GitHubContributor[],
  now: Date = new Date(),
): Card {
  const element = elementForLanguage(repo.language);

  const hp = roundToTen(
    clamp(
      40 + 30 * Math.log10(1 + repo.stargazers_count) + 10 * Math.log10(1 + repo.forks_count),
      40,
      250,
    ),
  );

  const freshness = freshnessBonus(repo, now);
  const score = repo.stargazers_count * 2 + repo.forks_count * 3 + freshness;

  const weakness = ELEMENT_CHAIN[element].weakTo;
  const resistance = ELEMENT_CHAIN[element].resists;
  const retreat = clamp(1 + Math.floor(repo.open_issues_count / 50), 1, 4);
  const rarity = rarityForScore(score);
  const { attacks, fromContributors } = attacksFrom(repo, contributors);

  /*
   * Eixo dominante — ver `dominantAxisForRepo` para por que as métricas não são
   * as mesmas do perfil. `breadth` é inatingível aqui de propósito, então `POLY`
   * é tag exclusiva de perfil.
   */
  const axis = dominantAxisForRepo({
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    openIssues: repo.open_issues_count,
    years: yearsSince(repo.created_at, now),
  });

  return {
    kind: "repo",
    id: repo.full_name,
    name: truncate(repo.name, 24),
    element,
    hp,
    attacks,
    weakness,
    resistance,
    // 1 pip por 50 issues abertas, teto de 4. Ver justificativa (2) acima.
    retreat,
    rarity,
    axis,
    // Atribuído fora daqui — ver `withSerial` em `./serial.ts`.
    serial: null,
    artUrl: repo.owner.avatar_url,
    footer: repoFooter(repo),
    stats: [
      { labelKey: "stat.stars", value: repo.stargazers_count },
      { labelKey: "stat.forks", value: repo.forks_count },
      { labelKey: "stat.issues", value: repo.open_issues_count },
      // String, não número: ano formatado como número vira "2.013".
      { labelKey: "stat.since", value: String(year(repo.created_at)) },
    ],
    derivations: repoDerivations({
      repo,
      element,
      hp,
      attacks,
      fromContributors,
      weakness,
      resistance,
      retreat,
      rarity,
      axis,
      score,
      freshness,
    }),
    sourceUrl: repo.html_url,
  };
}

/**
 * De onde saiu cada número da carta de repositório.
 *
 * Espelha `derivations` de `./profile.ts` no formato, mas **não** reusa as
 * frases: as do perfil falam na segunda pessoa ("sua linguagem dominante"), e
 * aqui o sujeito é o repositório, não quem está lendo. Chaves próprias, sob
 * `why.repo.*`.
 *
 * Continua não havendo radar do lado do repositório: `ratings` é afordância do
 * site e os tetos de `./ratings.ts` são de perfil. O que o repositório passou a
 * ter é o **eixo dominante**, que é outra coisa — ele não desenha polígono, só
 * escolhe a tag e o padrão do foil, e roda sobre os tetos próprios de
 * `REPO_CEILINGS`. A coluna esquerda fica com a primeira metade das derivações.
 */
function repoDerivations(input: {
  repo: GitHubRepo;
  element: Element;
  hp: number;
  attacks: Attack[];
  fromContributors: boolean;
  weakness: Element | null;
  resistance: Element | null;
  retreat: number;
  rarity: Card["rarity"];
  axis: Axis;
  score: number;
  freshness: number;
}): Derivation[] {
  const { repo, attacks } = input;
  const language = repo.language;

  return [
    {
      labelKey: "card.type",
      value: elementKey(input.element),
      ...elementReason(language),
    },
    {
      labelKey: "card.hp",
      value: String(input.hp),
      reasonKey: "why.repo.hp",
      reasonParams: { stars: repo.stargazers_count, forks: repo.forks_count },
    },
    {
      labelKey: "card.attacks",
      value: String(attacks.length),
      // O fallback de `attacksFrom` devolve um ataque com o nome do repositório;
      // dizer "maiores contribuidores: projeto" ali seria falso.
      ...(input.fromContributors
        ? {
            reasonKey: "why.repo.attacks",
            reasonParams: { names: attacks.map((attack) => attack.name).join(", ") },
          }
        : { reasonKey: "why.repo.attacks.self" }),
    },
    {
      labelKey: "card.weakness",
      value: input.weakness ? elementKey(input.weakness) : "card.none",
      // Repositório não tem segunda linguagem — a fraqueza vem sempre da cadeia,
      // ao contrário do perfil.
      reasonKey: input.weakness ? "why.repo.weakness" : "why.repo.weakness.none",
    },
    {
      labelKey: "card.resistance",
      value: input.resistance ? elementKey(input.resistance) : "card.none",
      reasonKey: input.resistance ? "why.repo.resistance" : "why.repo.resistance.none",
    },
    {
      labelKey: "card.retreat",
      value: String(input.retreat),
      reasonKey: "why.repo.retreat",
      reasonParams: { issues: repo.open_issues_count },
    },
    {
      labelKey: "card.rarityLabel",
      value: rarityKey(input.rarity),
      // O bônus de atividade é a parte não óbvia do score, e a única que pode
      // cair com o tempo — some da frase quando é zero, e o motivo aparece.
      ...rarityReason(input),
    },
    {
      labelKey: "card.tagLabel",
      value: tagForAxis(input.axis),
      reasonKey: `why.repo.tag.${input.axis}`,
    },
  ];
}

function elementReason(language: string | null): Pick<Derivation, "reasonKey" | "reasonParams"> {
  if (!language) return { reasonKey: "why.repo.element.none" };
  // Linguagem fora do mapa cai em `normal` (ver `elementForLanguage`). Dizer só
  // "a linguagem é Brainfuck" deixaria o tipo Normal sem explicação.
  const mapped = language.toLowerCase() in LANGUAGE_ELEMENTS;
  return {
    reasonKey: mapped ? "why.repo.element" : "why.repo.element.unmapped",
    reasonParams: { language },
  };
}

function rarityReason(input: {
  repo: GitHubRepo;
  score: number;
  freshness: number;
}): Pick<Derivation, "reasonKey" | "reasonParams"> {
  const params = {
    score: Math.round(input.score),
    stars: input.repo.stargazers_count,
    forks: input.repo.forks_count,
  };
  if (input.freshness > 0) {
    return {
      reasonKey: "why.repo.rarity",
      reasonParams: { ...params, bonus: input.freshness },
    };
  }
  return {
    reasonKey: input.repo.archived ? "why.repo.rarity.archived" : "why.repo.rarity.stale",
    reasonParams: params,
  };
}

/**
 * Repositório mantido vale mais que repositório abandonado com as mesmas
 * estrelas — é o único sinal de raridade que não é acumulativo, e o único que
 * pode cair com o tempo.
 */
function freshnessBonus(repo: GitHubRepo, now: Date): number {
  if (repo.archived) return 0;
  const days = daysSince(repo.pushed_at, now);
  if (days <= 7) return 300;
  if (days <= 30) return 150;
  if (days <= 90) return 50;
  return 0;
}

/**
 * Top 2 contribuidores viram ataques (RFC 6.2). Sem contribuidores — repo novo,
 * ou o GitHub ainda calculando a lista — o próprio repositório vira o ataque, em
 * vez de devolver uma carta sem nada no meio.
 *
 * `fromContributors` distingue os dois casos para a derivação, que precisa dizer
 * frases diferentes. Sai daqui como bandeira e não é reconstituído por
 * comparação de nome: repositório chamado igual ao seu maior contribuidor não é
 * impossível, e o palpite erraria.
 */
function attacksFrom(
  repo: GitHubRepo,
  contributors: GitHubContributor[],
): { attacks: Attack[]; fromContributors: boolean } {
  const humans = contributors
    .filter((person) => person.type !== "Bot" && !person.login.endsWith("[bot]"))
    .sort((a, b) => b.contributions - a.contributions || a.login.localeCompare(b.login))
    .slice(0, 2);

  if (humans.length === 0) {
    const damage = roundDamage(clamp(repo.stargazers_count * 2, 10, 300));
    return {
      fromContributors: false,
      attacks: [
        {
          name: truncate(repo.name, 22),
          cost: costForDamage(damage),
          damage,
          // 38 pelo mesmo motivo de `profile.ts`: é o que cabe na coluna de texto
          // do ataque sem o renderizador cortar a seco por cima.
          text: repo.description ? truncate(repo.description, 38) : "",
        },
      ],
    };
  }

  const attacks = humans.map((person) => {
    // Log, e não `contribuições × 2`: com escala linear qualquer repositório
    // sério satura os 300 nos dois ataques, e as duas linhas ficam idênticas.
    // No log, 10 commits dão 50, 1.000 dão 140 e 10.000 dão 180.
    const damage = roundDamage(
      clamp(45 * Math.log10(1 + person.contributions), 10, 300),
    );
    return {
      name: truncate(person.login, 22),
      cost: costForDamage(damage),
      damage,
      // Template direto a partir do número, sem frase criativa (RFC 9.2).
      text: `${person.contributions.toLocaleString("en-US")} commits`,
    };
  });

  return { attacks, fromContributors: true };
}

/**
 * Descrição curta: o rodapé divide a linha com a contagem de estrelas, e o que
 * passa do orçamento é cortado a seco pelo renderizador.
 *
 * Dono e ano vêm primeiro no orçamento porque são de tamanho conhecido e não
 * podem ser reticenciados sem virar mentira — "faceboo… · 20…" não informa nada.
 * A descrição fica com o resto, e some inteira quando o resto é curto demais
 * para valer: quatro caracteres de descrição são ruído, não informação.
 */
function repoFooter(repo: GitHubRepo): string {
  const tail = `${repo.owner.login} · ${year(repo.created_at)}`;
  const room = FOOTER_CHARS - tail.length - 3;

  if (!repo.description || room < 12) return tail;
  return `${truncate(repo.description, room)} · ${tail}`;
}
