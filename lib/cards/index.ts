import { cached } from "../cache/redis";
import { CARD_DATA_TTL_SECONDS } from "../config";
import {
  fetchRepo,
  fetchRepoContributors,
  fetchUser,
  fetchUserRepos,
} from "../github/client";
import { GitmonError } from "../github/errors";
import { checkCardRateLimit } from "../rateLimit";
import { buildProfileCard } from "./profile";
import { buildRepoCard } from "./repo";
import { withSerial } from "./serial";
import type { Card } from "./types";

export * from "./types";
export { buildProfileCard } from "./profile";
export { buildRepoCard } from "./repo";

/**
 * Versão do formato da carta. Entra na chave de cache: mudou fórmula ou campo,
 * incrementa aqui e o cache antigo simplesmente deixa de ser lido — mais seguro
 * do que invalidar chave por chave.
 *
 * v2: escada de raridade de 5 para 8 tiers e campo `serial`. A subida não foi
 * higiene, foi obrigatória — uma carta v1 em cache carrega `rarity: "holo"`, que
 * não existe mais, e cairia fora de todos os `switch` de `./rarity.ts`.
 *
 * v3: 7 elementos viraram os 18 tipos, e `neutral` virou `normal`. Mesma
 * armadilha da v2, em outro campo: uma carta v2 em cache carrega
 * `element: "neutral"`, e `ELEMENT_COLORS["neutral"]` agora é `undefined` —
 * a carta quebraria ao renderizar, não ao compilar. Em desenvolvimento o cache é
 * em memória e some no restart, então isso passaria despercebido até produção,
 * onde o Redis guarda por uma hora.
 *
 * v4: carta de repositório passou a trazer `derivations`. Ao contrário das duas
 * anteriores, esta não quebra nada — carta v3 em cache só sai sem o painel de
 * explicação. Subiu mesmo assim porque uma hora de repositório sem as laterais
 * seria indistinguível do bug que este trabalho fecha.
 *
 * v5: campo `axis`, que decide a tag ao lado do nome e o padrão do foil. Volta a
 * ser da família da v2 e da v3, não da v4 — uma carta v4 em cache não tem `axis`,
 * e `AXIS_PATTERNS[undefined]` devolveria `undefined` no meio da composição, ou
 * seja, um `patternUri` apontando para um arquivo que não existe. Quebra ao
 * renderizar, não ao compilar, e só em produção, onde o Redis guarda por uma hora.
 */
const CARD_VERSION = "v5";

const LOGIN = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;
const REPO_NAME = /^[a-zA-Z0-9._-]{1,100}$/;

export function isValidLogin(login: string): boolean {
  return LOGIN.test(login);
}

export function isValidRepoName(name: string): boolean {
  return REPO_NAME.test(name) && name !== "." && name !== "..";
}

export async function getProfileCard(login: string): Promise<Card> {
  if (!isValidLogin(login)) {
    throw new GitmonError("not_found", `Login inválido: ${login}`, login);
  }

  // Orçamento por IP antes do cache: toda busca de carta — cacheada ou não —
  // conta contra a janela, protegendo o pool de tokens de scripts (ver
  // lib/rateLimit.ts). Memoizado por requisição, então o generateMetadata e o
  // render da mesma página compartilham UMA checagem.
  await checkCardRateLimit();

  const card = await cached(
    `card:${CARD_VERSION}:profile:${login.toLowerCase()}`,
    CARD_DATA_TTL_SECONDS,
    async () => {
      const user = await fetchUser(login);
      // Organização não tem repositório próprio no sentido do scoring — falha
      // antes de gastar a segunda requisição (RFC 9.5).
      if (user.type === "Organization") {
        return buildProfileCard(user, []);
      }
      const repos = await fetchUserRepos(login);
      return buildProfileCard(user, repos);
    },
  );

  return withSerial(card);
}

export async function getRepoCard(owner: string, name: string): Promise<Card> {
  if (!isValidLogin(owner) || !isValidRepoName(name)) {
    throw new GitmonError("not_found", `Repositório inválido: ${owner}/${name}`);
  }

  await checkCardRateLimit();

  const card = await cached(
    `card:${CARD_VERSION}:repo:${owner.toLowerCase()}/${name.toLowerCase()}`,
    CARD_DATA_TTL_SECONDS,
    async () => {
      const repo = await fetchRepo(owner, name);
      const contributors = await fetchRepoContributors(owner, name);
      return buildRepoCard(repo, contributors);
    },
  );

  return withSerial(card);
}

export interface RepoSummary {
  name: string;
  stars: number;
  language: string | null;
  description: string | null;
}

/**
 * Lista enxuta dos repositórios de um perfil, para a interface sugerir cartas de
 * repositório depois de uma busca de perfil (RFC 9.4).
 *
 * Guardada separada da carta porque é outro recorte do mesmo dado: a carta usa só
 * os dois mais estrelados, a lista mostra vários.
 */
export async function getProfileRepos(
  login: string,
  limit = 12,
): Promise<RepoSummary[]> {
  if (!isValidLogin(login)) return [];

  await checkCardRateLimit();

  return cached(
    `repos:${CARD_VERSION}:${login.toLowerCase()}:${limit}`,
    CARD_DATA_TTL_SECONDS,
    async () => {
      const repos = await fetchUserRepos(login);
      return repos
        .filter((repo) => !repo.fork)
        .sort(
          (a, b) =>
            b.stargazers_count - a.stargazers_count || a.name.localeCompare(b.name),
        )
        .slice(0, limit)
        .map((repo) => ({
          name: repo.name,
          stars: repo.stargazers_count,
          language: repo.language,
          description: repo.description,
        }));
    },
  );
}

/** Resolve `torvalds` ou `facebook/react` para a carta correspondente. */
export async function getCard(id: string): Promise<Card> {
  const [owner, name, ...rest] = id.split("/");
  if (rest.length > 0) {
    throw new GitmonError("not_found", `Identificador inválido: ${id}`);
  }
  return name ? getRepoCard(owner, name) : getProfileCard(owner);
}
