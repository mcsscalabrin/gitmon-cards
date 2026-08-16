import { GUIDE_STEPS, type GuideStep } from "@/lib/guide/steps";

/**
 * O tour de cada página: o "Guia" do cabeçalho roda os passos cujos alvos
 * existem na rota atual, sem navegar. Puro dado — sem React — para testar.
 */
export const PAGE_STEP_IDS: Record<string, readonly string[]> = {
  /** Home: só a busca. */
  home: ["generate"],
  /** Perfil: a carta inteira, da abertura ao modo Speed Duel. */
  profile: ["pack", "card", "headline", "radar", "why", "embed", "share", "battle", "ygo"],
  /** Repositório: como o perfil, sem o seletor de modos. */
  repo: ["pack", "card", "headline", "radar", "why", "embed", "share", "battle"],
  /** Resultado (batalha, duelo, Speed Duel): só o pôster estático. */
  poster: ["posters"],
};

/** Resolve os passos de uma rota a partir dos ids, na ordem do tour. */
export function stepsForPath(pathname: string): readonly GuideStep[] {
  const segments = pathname.split("/").filter(Boolean);
  const ids =
    segments.length === 0
      ? PAGE_STEP_IDS.home
      : segments[0] === "battle" || segments[0] === "duel" || segments[0] === "ygo"
        ? PAGE_STEP_IDS.poster
        : segments.length === 1
          ? PAGE_STEP_IDS.profile
          : PAGE_STEP_IDS.repo;
  return GUIDE_STEPS.filter((step) => ids.includes(step.id));
}
