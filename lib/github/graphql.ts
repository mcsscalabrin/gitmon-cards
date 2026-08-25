import { authHeaders, discoverPool } from "./client";
import { GitmonError } from "./errors";
import { benchToken, pickFailover, pickToken, recordTokenHealth } from "./tokens";
import type { GitHubContributionCalendar } from "./types";

/**
 * Cliente GraphQL do GitHub.
 *
 * Existe por um motivo só: **o contribution calendar não está na REST.** Nenhum
 * endpoint v3 devolve contribuições por dia — só
 * `user.contributionsCollection.contributionCalendar`, que é v4. Tudo o mais que
 * o projeto consome continua em `./client.ts`, e deve continuar: GraphQL aqui é
 * a exceção que um dado exige, não uma migração começada pela metade.
 *
 * O pool de tokens, os cabeçalhos e o failover são os mesmos do REST (importados
 * de `./client.ts`). O que muda são três coisas:
 *
 * 1. É `POST` com corpo `{ query, variables }`, sempre no mesmo path.
 * 2. **Erro de GraphQL volta com HTTP 200 e um array `errors`.** Sem checar o
 *    corpo, um login inexistente passaria como sucesso com `data.user: null`.
 * 3. O orçamento é outro — o GraphQL tem 5.000 **pontos** por hora e por conta,
 *    separadamente das 5.000 requisições/h do REST. Esta camada não rouba cota
 *    do caminho que já existe.
 */

const ENDPOINT = "https://api.github.com/graphql";

interface GraphQLResponse<T> {
  data?: T | null;
  errors?: { message: string; type?: string }[];
}

async function graphql<T>(
  query: string,
  variables: Record<string, unknown>,
  login: string,
): Promise<T> {
  const pool = discoverPool();
  let current = pickToken(login, pool);

  for (let attempt = 0; attempt <= 1; attempt++) {
    let response: Response;
    try {
      response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          ...authHeaders(current!.token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, variables }),
        // O cache é nosso, no Redis. Não queremos duas camadas discordando.
        cache: "no-store",
      });
    } catch (cause) {
      throw new GitmonError(
        "upstream",
        "Falha de rede ao consultar o GraphQL do GitHub.",
        String(cause),
      );
    }

    void recordTokenHealth(current!.idx, response.headers);

    if (response.status === 401 || response.status === 403 || response.status === 429) {
      // O GraphQL não usa `x-ratelimit-remaining: 0` de forma tão previsível
      // quanto o REST — quando ele recusa por limite, o corpo é que diz. Aqui o
      // status já basta para pôr o token de castigo e tentar o próximo.
      void benchToken(current!.idx, response.headers);
      if (attempt === 0) {
        const fallback = await pickFailover(current!.idx, pool);
        if (fallback) {
          current = fallback;
          continue;
        }
      }
      throw new GitmonError(
        "rate_limit",
        "Limite do GraphQL do GitHub atingido.",
        response.headers.get("x-ratelimit-reset") ?? undefined,
      );
    }

    if (!response.ok) {
      throw new GitmonError(
        "upstream",
        `GraphQL do GitHub respondeu ${response.status}.`,
        await response.text().catch(() => undefined),
      );
    }

    const body = (await response.json()) as GraphQLResponse<T>;

    if (body.errors?.length) {
      const notFound = body.errors.some((error) => error.type === "NOT_FOUND");
      throw new GitmonError(
        notFound ? "not_found" : "upstream",
        body.errors[0].message,
      );
    }

    if (!body.data) {
      throw new GitmonError("upstream", "GraphQL do GitHub respondeu sem dados.");
    }

    return body.data;
  }

  throw new GitmonError("upstream", "Falha ao consultar o GraphQL do GitHub.");
}

/** Alias GraphQL de um ano. Precisa começar por letra — `2018` sozinho não é nome válido. */
const aliasFor = (year: number) => `y${year}`;

/**
 * Os últimos `years` anos-calendário de contribuições, do mais antigo para o mais
 * recente.
 *
 * **Uma requisição só.** `contributionsCollection` aceita no máximo um ano por
 * chamada, então N anos viram N campos aliased dentro do mesmo `user` — e não N
 * viagens à rede. É a diferença entre uma requisição por carta e oito.
 *
 * A janela é fixa e conta para trás a partir do ano corrente, em vez de derivar
 * de `user.created_at`: derivar exigiria esperar o `fetchUser` terminar antes de
 * começar esta, e o ganho seria devolver menos anos vazios. Ano anterior à conta
 * volta com o calendário zerado e é aparado em `lib/cards/contributions.ts`, que
 * é onde essa decisão pertence.
 *
 * **Falha vira `[]`, silenciosamente.** Mesma postura de `fetchRepoContributors`:
 * a grade é uma camada de fundo, e derrubar a carta inteira porque o GraphQL
 * recusou seria trocar um enfeite por um erro 500.
 */
export async function fetchContributionYears(
  login: string,
  years: number,
  now: Date = new Date(),
): Promise<{ year: number; calendar: GitHubContributionCalendar }[]> {
  const current = now.getUTCFullYear();
  const wanted = Array.from({ length: years }, (_, i) => current - years + 1 + i);

  const fields = wanted
    .map(
      (year) =>
        `${aliasFor(year)}: contributionsCollection(` +
        `from: "${year}-01-01T00:00:00Z", to: "${year}-12-31T23:59:59Z"` +
        `) { ...cal }`,
    )
    .join("\n      ");

  const query = `query($login: String!) {
    user(login: $login) {
      ${fields}
    }
  }
  fragment cal on ContributionsCollection {
    contributionCalendar { weeks { contributionDays { date contributionCount } } }
  }`;

  try {
    const data = await graphql<{
      user: Record<string, { contributionCalendar: GitHubContributionCalendar }> | null;
    }>(query, { login }, login);

    const user = data.user;
    if (!user) return [];

    return wanted
      .map((year) => ({ year, calendar: user[aliasFor(year)]?.contributionCalendar }))
      .filter(
        (entry): entry is { year: number; calendar: GitHubContributionCalendar } =>
          Array.isArray(entry.calendar?.weeks),
      );
  } catch {
    return [];
  }
}
