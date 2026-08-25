/** Subconjunto da API do GitHub que este projeto consome. Só os campos usados. */

export interface GitHubUser {
  login: string;
  name: string | null;
  type: "User" | "Organization" | string;
  avatar_url: string;
  bio: string | null;
  followers: number;
  following: number;
  public_repos: number;
  created_at: string;
  html_url: string;
}

export interface GitHubRepo {
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  watchers_count: number;
  fork: boolean;
  archived: boolean;
  created_at: string;
  pushed_at: string | null;
  html_url: string;
  owner: {
    login: string;
    avatar_url: string;
    type: string;
  };
}

export interface GitHubContributor {
  login: string;
  contributions: number;
  avatar_url: string;
  type: string;
}

/**
 * Uma semana de `/repos/{owner}/{repo}/stats/commit_activity`.
 *
 * `days` tem sempre 7 posições, de domingo a sábado — a mesma ordem de linha do
 * contribution calendar, o que é justamente o que permite as duas fontes
 * alimentarem a mesma banda em `lib/cards/contributions.ts`.
 */
export interface GitHubCommitActivityWeek {
  /** Contagem por dia da semana, domingo a sábado. */
  days: number[];
  total: number;
  /** Início da semana, timestamp unix em segundos. */
  week: number;
}

/**
 * Um ano do contribution calendar, como o GraphQL devolve.
 *
 * As semanas de borda vêm **parciais**: o calendário começa no domingo da semana
 * que contém 1º de janeiro, então a primeira e a última semana costumam ter menos
 * de 7 dias. Quem consome precisa contar dias, nunca assumir `weeks * 7`.
 */
export interface GitHubContributionCalendar {
  weeks: { contributionDays: { date: string; contributionCount: number }[] }[];
}
