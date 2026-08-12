import { cached } from "./cache/redis";
import { PROJECT_REPO, PROJECT_STARS_TTL_SECONDS } from "./config";
import { fetchRepo } from "./github/client";

/**
 * Estrelas do próprio gitmon-cards, para a faixa de apoio.
 *
 * `null` em qualquer falha — sem token, sem rede, repositório fora do ar. O
 * botão de favoritar continua funcionando sem o número; o que ele não pode
 * fazer é mostrar um número inventado ou sumir da página porque a API do GitHub
 * teve um dia ruim. Mesma postura do resto do projeto: degradar em silêncio,
 * nunca mentir.
 */
export async function getProjectStars(): Promise<number | null> {
  try {
    return await cached(`project:stars:v1`, PROJECT_STARS_TTL_SECONDS, async () => {
      const repo = await fetchRepo(PROJECT_REPO.owner, PROJECT_REPO.name);
      return repo.stargazers_count;
    });
  } catch {
    return null;
  }
}
