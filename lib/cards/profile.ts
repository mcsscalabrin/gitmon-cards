import { GitmonError } from "../github/errors";
import type { GitHubRepo, GitHubUser } from "../github/types";
import { ELEMENT_CHAIN, elementForLanguage } from "./elements";
import {
  CARD_NAME_CHARS,
  FOOTER_CHARS,
  clamp,
  costForDamage,
  roundDamage,
  roundToTen,
  truncate,
  year,
  yearsSince,
} from "./format";
import { elementKey, rarityKey } from "../i18n/dictionaries";
import { rarityForScore } from "./rarity";
import { ratingsFor } from "./ratings";
import { dominantAxisForProfile, tagForAxis } from "./tag";
import type { Attack, Card, Element } from "./types";

/**
 * Carta de perfil. Fórmulas travadas na RFC 6.1 — os pesos não são invenção
 * daqui e não devem ser ajustados sem atualizar a RFC junto.
 */
export function buildProfileCard(
  user: GitHubUser,
  repos: GitHubRepo[],
  now: Date = new Date(),
): Card {
  // Organizações estão fora da v1 (RFC 9.5). Detectar e falhar explicitamente é
  // melhor do que gerar uma carta com dados que não significam a mesma coisa.
  if (user.type === "Organization") {
    throw new GitmonError(
      "organization",
      `${user.login} é uma organização. A v1 gera carta apenas para usuários.`,
      user.login,
    );
  }

  // "Repos próprios" (RFC 6.1): fork não é obra do dev e inflaria o scoring.
  const owned = repos.filter((repo) => !repo.fork);
  const totalStars = owned.reduce((sum, repo) => sum + repo.stargazers_count, 0);
  const accountAge = yearsSince(user.created_at, now);

  const hp = roundToTen(
    clamp(30 + totalStars * 3 + user.followers * 1 + user.public_repos * 2, 30, 250),
  );

  const languages = rankLanguages(owned);
  const element = elementForLanguage(languages[0]?.language ?? null);

  // Fraqueza vem da segunda linguagem mais frequente (RFC 6.1). Quem só escreve
  // numa linguagem não tem segunda — cai na cadeia genérica (RFC 4.4).
  const secondary = languages[1]?.language;
  const weakness: Element | null = secondary
    ? elementForLanguage(secondary)
    : ELEMENT_CHAIN[element].weakTo;

  const score =
    totalStars * 2 + user.followers * 3 + user.public_repos + accountAge * 5;

  // Uma carta não pode ser fraca e resistente ao mesmo tipo: quando a segunda
  // linguagem colide com a resistência da cadeia, a fraqueza vence.
  const chainResists = ELEMENT_CHAIN[element].resists;
  const resistance = chainResists === weakness ? null : chainResists;
  const rarity = rarityForScore(score);
  const retreat = clamp(Math.round(accountAge / 2), 1, 4);
  const attacks = attacksFromRepos(owned);

  /*
   * O eixo é ortogonal ao score: `rarityForScore` soma tudo num número só e
   * responde "quão raro", enquanto o eixo pergunta "mais forte em quê". Dois
   * perfis com o mesmo score saem no mesmo tier e com tags diferentes, que é
   * exatamente o ponto — a escada sozinha fazia duas cartas do mesmo tier serem
   * a mesma carta.
   */
  const axis = dominantAxisForProfile({
    stars: totalStars,
    followers: user.followers,
    repos: user.public_repos,
    years: accountAge,
    languages: languages.length,
  });

  return {
    kind: "profile",
    id: user.login,
    /*
     * O nome de exibição é livre no GitHub e o do repositório não é — daí este
     * ser o único que ainda saía sem truncar. A escada de `nameSize` encolhe
     * até 19px e para; a partir de ~26 caracteres o Satori corta a seco, no meio
     * da palavra e sem reticências. Só apareceu ampliando a prévia de link.
     */
    name: truncate(user.name?.trim() || user.login, CARD_NAME_CHARS),
    element,
    hp,
    attacks,
    weakness,
    resistance,
    retreat,
    rarity,
    axis,
    // Atribuído fora daqui: serial é I/O, e esta função é pura de propósito.
    // Ver `withSerial` em `./serial.ts`.
    serial: null,
    artUrl: user.avatar_url,
    footer: profileFooter(user),
    stats: [
      { labelKey: "stat.stars", value: totalStars },
      { labelKey: "stat.followers", value: user.followers },
      { labelKey: "stat.repos", value: user.public_repos },
      // String, não número: ano formatado como número vira "2.011".
      { labelKey: "stat.since", value: String(year(user.created_at)) },
    ],
    ratings: ratingsFor({
      stars: totalStars,
      followers: user.followers,
      repos: user.public_repos,
      years: accountAge,
      languages: languages.length,
    }),
    derivations: [
      {
        labelKey: "card.type",
        value: elementKey(element),
        ...(languages[0]
          ? {
              reasonKey: "why.element",
              reasonParams: { language: languages[0].language },
            }
          : { reasonKey: "why.element.none" }),
      },
      {
        labelKey: "card.hp",
        value: String(hp),
        reasonKey: "why.hp",
        reasonParams: {
          stars: totalStars,
          followers: user.followers,
          repos: user.public_repos,
        },
      },
      {
        labelKey: "card.attacks",
        value: String(attacks.length),
        ...(attacks.length > 0
          ? { reasonKey: "why.attacks", reasonParams: { names: attacks.map((a) => a.name).join(", ") } }
          : { reasonKey: "why.attacks.none" }),
      },
      {
        labelKey: "card.weakness",
        value: weakness ? elementKey(weakness) : "card.none",
        ...(secondary
          ? { reasonKey: "why.weakness", reasonParams: { language: secondary } }
          : { reasonKey: "why.weakness.chain" }),
      },
      {
        labelKey: "card.resistance",
        value: resistance ? elementKey(resistance) : "card.none",
        // Sem parâmetro de tipo: `reasonParams` é substituição de texto cru, não
        // passa pelo tradutor, então uma chave i18n aqui vazaria como
        // "element.fire" na tela.
        ...(resistance
          ? { reasonKey: "why.resistance" }
          : { reasonKey: "why.resistance.none" }),
      },
      {
        labelKey: "card.retreat",
        value: String(retreat),
        reasonKey: "why.retreat",
        // `yearsSince` devolve fração; "14,937808668117981 anos" não é dado, é
        // vazamento de implementação.
        reasonParams: { years: Math.floor(accountAge) },
      },
      {
        labelKey: "card.rarityLabel",
        value: rarityKey(rarity),
        reasonKey: "why.rarity",
        reasonParams: { score: Math.round(score) },
      },
      {
        labelKey: "card.tagLabel",
        value: tagForAxis(axis),
        reasonKey: `why.tag.${axis}`,
      },
    ],
    sourceUrl: user.html_url,
  };
}

/** Linguagens ordenadas por frequência ponderada por estrelas (RFC 6.1). */
function rankLanguages(
  repos: GitHubRepo[],
): Array<{ language: string; weight: number }> {
  const weights = new Map<string, number>();

  for (const repo of repos) {
    if (!repo.language) continue;
    // +1 por repositório e +1 por estrela: um repo com tração pesa mais que um
    // repo vazio, mas dez repos pequenos ainda contam.
    const weight = 1 + repo.stargazers_count;
    weights.set(repo.language, (weights.get(repo.language) ?? 0) + weight);
  }

  return [...weights.entries()]
    .map(([language, weight]) => ({ language, weight }))
    // Desempate alfabético para a carta não mudar entre duas gerações iguais.
    .sort((a, b) => b.weight - a.weight || a.language.localeCompare(b.language));
}

/** Os 2 repositórios mais estrelados viram ataques (RFC 6.1). */
function attacksFromRepos(repos: GitHubRepo[]): Attack[] {
  return [...repos]
    .sort(
      (a, b) =>
        b.stargazers_count - a.stargazers_count || a.name.localeCompare(b.name),
    )
    .slice(0, 2)
    .map((repo) => {
      const damage = roundDamage(clamp(repo.stargazers_count * 4, 10, 300));
      return {
        name: truncate(repo.name, 22),
        cost: costForDamage(damage),
        damage,
        // 38, não 64: a coluna de texto do ataque tem 222px a 12px de fonte, e
        // 64 caracteres não cabiam. O excedente era cortado a seco pelo
        // renderizador, no meio da palavra e sem reticências — o Satori não
        // aplica `text-overflow: ellipsis`. Truncar aqui deixa o "…" que o
        // `truncate` já põe ser o fim visível, com um corte só.
        text: repo.description ? truncate(repo.description, 38) : "",
      };
    });
}

/**
 * Bio truncada + ano de criação da conta (RFC 6.1). Factual, sem flavor text.
 *
 * O orçamento é 36 caracteres para a linha inteira, e o ano é inegociável — é o
 * único fato dela que não está em nenhum outro lugar da carta. A bio fica com o
 * que sobra. Ver `FOOTER_CHARS`.
 */
function profileFooter(user: GitHubUser): string {
  const since = String(year(user.created_at));
  const room = FOOTER_CHARS - since.length - 3;
  const bio = user.bio ? truncate(user.bio, room) : "";
  return bio ? `${bio} · ${since}` : since;
}
