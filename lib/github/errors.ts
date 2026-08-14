/**
 * Erros do domínio. Cada código vira uma mensagem própria no dicionário i18n e um
 * status HTTP próprio nas rotas — tom técnico-neutro, sem tentar ser engraçado
 * (RFC 9.2).
 */
export type GitmonErrorCode =
  | "not_found"
  | "organization"
  | "rate_limit"
  | "no_token"
  | "upstream"
  /** Link de batalha que já passou do TTL — ver lib/battle/store.ts. */
  | "battle_expired"
  /** Link de duelo que já passou do TTL — ver lib/duel/store.ts. */
  | "duel_expired";

export class GitmonError extends Error {
  readonly code: GitmonErrorCode;
  /** Dado extra para a mensagem (login consultado, segundos até o reset). */
  readonly detail?: string;

  constructor(code: GitmonErrorCode, message: string, detail?: string) {
    super(message);
    this.name = "GitmonError";
    this.code = code;
    this.detail = detail;
  }
}

export function httpStatusFor(code: GitmonErrorCode): number {
  switch (code) {
    case "not_found":
    case "battle_expired":
    case "duel_expired":
      return 404;
    case "organization":
      // Não é erro do cliente nem do servidor: o recurso existe, o produto é que
      // ainda não gera carta para ele (RFC 9.5).
      return 422;
    case "rate_limit":
      return 429;
    case "no_token":
      return 500;
    case "upstream":
      return 502;
  }
}

export function isGitmonError(error: unknown): error is GitmonError {
  return error instanceof GitmonError;
}
