import { describe, expect, it } from "vitest";
import { buildProfileCard } from "@/lib/cards/profile";
import { isGitmonError } from "@/lib/github/errors";
import type { GitHubRepo, GitHubUser } from "@/lib/github/types";

const NOW = new Date("2026-08-10T00:00:00Z");

function user(overrides: Partial<GitHubUser> = {}): GitHubUser {
  return {
    login: "dev",
    name: "Dev Pessoa",
    type: "User",
    avatar_url: "https://avatars.githubusercontent.com/u/1",
    bio: null,
    followers: 0,
    following: 0,
    public_repos: 0,
    created_at: "2016-08-10T00:00:00Z",
    html_url: "https://github.com/dev",
    ...overrides,
  };
}

function repo(overrides: Partial<GitHubRepo> = {}): GitHubRepo {
  return {
    name: "projeto",
    full_name: "dev/projeto",
    description: null,
    language: null,
    stargazers_count: 0,
    forks_count: 0,
    open_issues_count: 0,
    watchers_count: 0,
    fork: false,
    archived: false,
    created_at: "2020-01-01T00:00:00Z",
    pushed_at: "2026-08-01T00:00:00Z",
    html_url: "https://github.com/dev/projeto",
    owner: { login: "dev", avatar_url: "https://avatars.githubusercontent.com/u/1", type: "User" },
    ...overrides,
  };
}

describe("HP", () => {
  it("aplica a fórmula da RFC 6.1 arredondada para dezenas", () => {
    // 30 + 4*3 + 7*1 + 3*2 = 55 → 60
    const card = buildProfileCard(
      user({ followers: 7, public_repos: 3 }),
      [repo({ stargazers_count: 4 })],
      NOW,
    );
    expect(card.hp).toBe(60);
  });

  it("respeita o piso de 30 para uma conta vazia", () => {
    expect(buildProfileCard(user(), [], NOW).hp).toBe(30);
  });

  it("respeita o teto de 250", () => {
    const card = buildProfileCard(
      user({ followers: 90_000, public_repos: 300 }),
      [repo({ stargazers_count: 200_000 })],
      NOW,
    );
    expect(card.hp).toBe(250);
  });

  it("ignora forks, que não são obra do dev", () => {
    const semFork = buildProfileCard(user(), [repo({ stargazers_count: 10 })], NOW);
    const comFork = buildProfileCard(
      user(),
      [repo({ stargazers_count: 10 }), repo({ stargazers_count: 5000, fork: true })],
      NOW,
    );
    expect(comFork.hp).toBe(semFork.hp);
  });
});

describe("elemento e fraqueza", () => {
  it("pondera a linguagem por estrelas, não só por contagem de repos", () => {
    // Três repos em Go sem estrela (peso 3) contra um em Rust com 50 (peso 51).
    const card = buildProfileCard(
      user(),
      [
        repo({ name: "a", language: "Go" }),
        repo({ name: "b", language: "Go" }),
        repo({ name: "c", language: "Go" }),
        repo({ name: "d", language: "Rust", stargazers_count: 50 }),
      ],
      NOW,
    );
    expect(card.element).toBe("fire");
    expect(card.weakness).toBe("grass"); // Go, a segunda linguagem
  });

  it("cai na cadeia genérica quando só existe uma linguagem", () => {
    const card = buildProfileCard(user(), [repo({ language: "Python" })], NOW);
    expect(card.element).toBe("water");
    expect(card.weakness).toBe("electric");
  });

  it("usa normal para linguagem desconhecida ou ausente", () => {
    expect(buildProfileCard(user(), [repo({ language: null })], NOW).element).toBe("normal");
    expect(buildProfileCard(user(), [repo({ language: "Brainfuck" })], NOW).element).toBe(
      "normal",
    );
  });

  it("nunca deixa a carta fraca e resistente ao mesmo elemento", () => {
    // Fire resiste a grass pela cadeia; Go como segunda linguagem faz a fraqueza
    // ser grass também. A fraqueza vence e a resistência some.
    const card = buildProfileCard(
      user(),
      [
        repo({ name: "a", language: "Rust", stargazers_count: 50 }),
        repo({ name: "b", language: "Go", stargazers_count: 10 }),
      ],
      NOW,
    );
    expect(card.weakness).toBe("grass");
    expect(card.resistance).toBeNull();
  });
});

describe("ataques", () => {
  it("usa os 2 repositórios mais estrelados", () => {
    const card = buildProfileCard(
      user(),
      [
        repo({ name: "pequeno", stargazers_count: 1 }),
        repo({ name: "grande", stargazers_count: 100 }),
        repo({ name: "medio", stargazers_count: 50 }),
      ],
      NOW,
    );
    expect(card.attacks.map((a) => a.name)).toEqual(["grande", "medio"]);
    expect(card.attacks[0].damage).toBe(300); // clamp(100*4, 10, 300)
    expect(card.attacks[1].damage).toBe(200);
  });

  it("aplica o piso de dano em repositório sem estrela", () => {
    const card = buildProfileCard(user(), [repo({ stargazers_count: 0 })], NOW);
    expect(card.attacks[0].damage).toBe(10);
    expect(card.attacks[0].cost).toBe(1);
  });

  it("devolve carta válida sem nenhum ataque quando não há repositórios", () => {
    expect(buildProfileCard(user(), [], NOW).attacks).toEqual([]);
  });
});

describe("recuo e raridade", () => {
  it("deriva o recuo da idade da conta, com teto de 4", () => {
    expect(buildProfileCard(user({ created_at: "2025-08-10T00:00:00Z" }), [], NOW).retreat).toBe(1);
    expect(buildProfileCard(user({ created_at: "2020-08-10T00:00:00Z" }), [], NOW).retreat).toBe(3);
    expect(buildProfileCard(user({ created_at: "2008-08-10T00:00:00Z" }), [], NOW).retreat).toBe(4);
  });

  it("classifica os perfis de referência nas faixas esperadas", () => {
    const novo = buildProfileCard(
      user({ created_at: "2025-08-10T00:00:00Z", followers: 1, public_repos: 5 }),
      [],
      NOW,
    );
    expect(novo.rarity).toBe("common");

    const comum = buildProfileCard(
      user({ created_at: "2018-08-10T00:00:00Z", followers: 5, public_repos: 30 }),
      [repo({ stargazers_count: 10 })],
      NOW,
    );
    expect(comum.rarity).toBe("uncommon");

    const solido = buildProfileCard(
      user({ created_at: "2016-08-10T00:00:00Z", followers: 100, public_repos: 60 }),
      [repo({ stargazers_count: 200 })],
      NOW,
    );
    expect(solido.rarity).toBe("rare");

    const notavel = buildProfileCard(
      user({ created_at: "2014-08-10T00:00:00Z", followers: 1000, public_repos: 100 }),
      [repo({ stargazers_count: 2000 })],
      NOW,
    );
    // 7160 pontos. Parecia muito quando a escada era estimada; contra perfis
    // reais medidos é um dev sólido, não uma figura pública — o `defunkt` faz
    // 142.566. Ver a tabela de calibração em lib/cards/rarity.ts.
    expect(notavel.rarity).toBe("double_rare");
  });
});

describe("organizações", () => {
  it("falha com código próprio em vez de gerar carta degradada", () => {
    try {
      buildProfileCard(user({ type: "Organization" }), [], NOW);
      expect.unreachable("deveria ter lançado");
    } catch (error) {
      expect(isGitmonError(error) && error.code).toBe("organization");
    }
  });
});

describe("classe ex/Mega ex", () => {
  it("sai do pico de alcance/comunidade, e não da soma de tudo", () => {
    // dev comum (200★, 100 seg): raridade `rare`, mas pico ~42 → standard.
    const comum = buildProfileCard(
      user({ followers: 100, public_repos: 60 }),
      [repo({ stargazers_count: 200 })],
      NOW,
    );
    expect(comum.rarity).toBe("rare");
    expect(comum.cardClass).toBe("standard");

    // Celebridade (254k★): satura alcance → mega ex.
    const celebridade = buildProfileCard(
      user({ followers: 316_000, public_repos: 12 }),
      [repo({ stargazers_count: 254_000 })],
      NOW,
    );
    expect(celebridade.cardClass).toBe("mega_ex");
  });

  it("devolve ex para o pico de escala externa sem saturar", () => {
    // gaearon (30k★, 91k seg): alcance ~82 → ex.
    const notavel = buildProfileCard(
      user({ followers: 91_000, public_repos: 299 }),
      [repo({ stargazers_count: 30_000 })],
      NOW,
    );
    expect(notavel.cardClass).toBe("ex");
  });

  it("saturação interna não confere classe — conta veterana é standard", () => {
    // 12 anos de conta e 12 linguagens: veterania e amplitude em 99, escala
    // externa zero. A classe é a dimensão que a raridade não enxerga, não o
    // oposto.
    const veterana = buildProfileCard(
      user({ followers: 0, public_repos: 0, created_at: "2014-08-10T00:00:00Z" }),
      [],
      NOW,
    );
    expect(veterana.cardClass).toBe("standard");
  });
});
