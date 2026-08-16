import { describe, expect, it } from "vitest";
import { FOOTER_CHARS } from "@/lib/cards/format";
import { buildRepoCard } from "@/lib/cards/repo";
import type { GitHubContributor, GitHubRepo } from "@/lib/github/types";
import { LOCALES, t, type MessageKey } from "@/lib/i18n/dictionaries";
import type { Derivation } from "@/lib/cards/types";

const NOW = new Date("2026-08-10T00:00:00Z");

function repo(overrides: Partial<GitHubRepo> = {}): GitHubRepo {
  return {
    name: "projeto",
    full_name: "dev/projeto",
    description: null,
    language: "TypeScript",
    stargazers_count: 0,
    forks_count: 0,
    open_issues_count: 0,
    watchers_count: 0,
    fork: false,
    archived: false,
    created_at: "2020-01-01T00:00:00Z",
    pushed_at: "2026-08-09T00:00:00Z",
    html_url: "https://github.com/dev/projeto",
    owner: { login: "dev", avatar_url: "https://avatars.githubusercontent.com/u/1", type: "User" },
    ...overrides,
  };
}

function contributor(overrides: Partial<GitHubContributor> = {}): GitHubContributor {
  return {
    login: "pessoa",
    contributions: 10,
    avatar_url: "https://avatars.githubusercontent.com/u/2",
    type: "User",
    ...overrides,
  };
}

describe("HP em escala logarítmica", () => {
  it("espalha o HP em vez de saturar — é o ponto da escala log (Q2)", () => {
    const hp = (stars: number) => buildRepoCard(repo({ stargazers_count: stars }), [], NOW).hp;
    expect(hp(0)).toBe(40);
    expect(hp(100)).toBe(100);
    expect(hp(10_000)).toBe(160);
    // Cada ordem de grandeza continua movendo o HP, que era a falha da escala linear.
    expect(hp(1000)).toBeGreaterThan(hp(100));
    expect(hp(100_000)).toBeGreaterThan(hp(10_000));
  });

  it("mantém o teto de 250 mesmo no maior repositório do GitHub", () => {
    const card = buildRepoCard(
      repo({ stargazers_count: 400_000, forks_count: 100_000 }),
      [],
      NOW,
    );
    expect(card.hp).toBeLessThanOrEqual(250);
  });
});

describe("ataques", () => {
  it("usa os 2 maiores contribuidores humanos", () => {
    const card = buildRepoCard(
      repo(),
      [
        contributor({ login: "menor", contributions: 5 }),
        contributor({ login: "maior", contributions: 120 }),
        contributor({ login: "medio", contributions: 40 }),
      ],
      NOW,
    );
    expect(card.attacks.map((a) => a.name)).toEqual(["maior", "medio"]);
    // 45 × log10(121) = 93,7 → 90, sempre em dezenas.
    expect(card.attacks[0].damage).toBe(90);
    expect(card.attacks[0].text).toBe("120 commits");
  });

  it("mantém os dois ataques distintos mesmo num repositório enorme", () => {
    // Com escala linear os dois saturavam em 300 e as linhas ficavam idênticas.
    const card = buildRepoCard(
      repo(),
      [
        contributor({ login: "a", contributions: 1939 }),
        contributor({ login: "b", contributions: 1778 }),
      ],
      NOW,
    );
    expect(card.attacks[0].damage).toBeLessThan(300);
    expect(card.attacks[0].damage % 10).toBe(0);
    expect(card.attacks[0].damage).toBeGreaterThanOrEqual(card.attacks[1].damage);
  });

  it("descarta bots — eles inflariam o dano sem significar nada", () => {
    const card = buildRepoCard(
      repo(),
      [
        contributor({ login: "dependabot[bot]", contributions: 9000 }),
        contributor({ login: "renovate", contributions: 8000, type: "Bot" }),
        contributor({ login: "humano", contributions: 30 }),
      ],
      NOW,
    );
    expect(card.attacks.map((a) => a.name)).toEqual(["humano"]);
  });

  it("cai para o próprio repositório quando não há contribuidores", () => {
    const card = buildRepoCard(repo({ stargazers_count: 40 }), [], NOW);
    expect(card.attacks).toHaveLength(1);
    expect(card.attacks[0].name).toBe("projeto");
    expect(card.attacks[0].damage).toBe(80);
  });
});

describe("recuo a partir de issues abertas (Q5)", () => {
  it("cobra 1 pip por 50 issues, com teto de 4", () => {
    const retreat = (issues: number) =>
      buildRepoCard(repo({ open_issues_count: issues }), [], NOW).retreat;
    expect(retreat(0)).toBe(1);
    expect(retreat(49)).toBe(1);
    expect(retreat(50)).toBe(2);
    expect(retreat(5000)).toBe(4);
  });

  it("mantém fraqueza dentro dos 7 elementos, sem inventar um oitavo tipo", () => {
    const card = buildRepoCard(repo({ language: "Rust", open_issues_count: 900 }), [], NOW);
    expect(card.weakness).toBe("water");
    expect(card.resistance).toBe("grass");
  });
});

/*
 * O rodapé encolheu quando o serial virou elemento de design: o selo levou
 * 108px da direita, e o que passa do orçamento o Satori corta a seco, no meio da
 * palavra e sem reticências. O "…" só é o fim visível se o corte acontecer aqui.
 * Sem este teste, a próxima mudança em `layout.footer` volta a descalibrar a
 * linha e o sintoma só aparece na imagem.
 */
describe("orçamento do rodapé", () => {
  it("cabe na linha mesmo com descrição e dono longos", () => {
    const card = buildRepoCard(
      repo({
        description:
          "A declarative, efficient, and flexible JavaScript library for building user interfaces",
        owner: { login: "facebook", avatar_url: "x", type: "Organization" },
      }),
      [],
      NOW,
    );
    expect(card.footer.length).toBeLessThanOrEqual(FOOTER_CHARS);
    expect(card.footer).toContain("…");
  });

  it("nunca reticencia dono nem ano — eles cabem inteiros ou a descrição sai", () => {
    const card = buildRepoCard(
      repo({
        description: "qualquer descrição",
        owner: { login: "uma-organizacao-de-nome-absurdamente-longo", avatar_url: "x", type: "Organization" },
      }),
      [],
      NOW,
    );
    expect(card.footer).toBe("uma-organizacao-de-nome-absurdamente-longo · 2020");
  });

  it("dispensa a descrição sem deixar separador solto", () => {
    const card = buildRepoCard(repo({ description: null }), [], NOW);
    expect(card.footer).toBe("dev · 2020");
  });
});

describe("raridade", () => {
  it("premia repositório mantido sobre repositório parado com as mesmas estrelas", () => {
    // 700★ = 1400 pontos, logo abaixo da faixa double_rare (1500). O bônus de
    // atividade é exatamente o que decide entre um tier e outro aqui.
    const ativo = buildRepoCard(
      repo({ stargazers_count: 700, pushed_at: "2026-08-09T00:00:00Z" }),
      [],
      NOW,
    );
    const parado = buildRepoCard(
      repo({ stargazers_count: 700, pushed_at: "2020-01-01T00:00:00Z" }),
      [],
      NOW,
    );
    expect(ativo.rarity).toBe("double_rare");
    expect(parado.rarity).toBe("rare");
  });

  it("não dá bônus de atividade a repositório arquivado", () => {
    const arquivado = buildRepoCard(
      repo({ stargazers_count: 700, archived: true, pushed_at: "2026-08-09T00:00:00Z" }),
      [],
      NOW,
    );
    expect(arquivado.rarity).toBe("rare");
  });
});

describe("assinatura do repositório (radar)", () => {
  it("sai preenchida com os cinco eixos do repo", () => {
    const card = buildRepoCard(repo(), [], NOW);
    expect(card.ratings).toBeDefined();
    expect(card.ratings?.map((r) => r.axis)).toEqual([
      "reach",
      "community",
      "volume",
      "veterancy",
      "activity",
    ]);
  });

  it("reflete a recência do último push no eixo de atividade", () => {
    const recente = buildRepoCard(
      repo({ stargazers_count: 500, pushed_at: "2026-08-09T00:00:00Z" }),
      [],
      NOW,
    );
    const parado = buildRepoCard(
      repo({ stargazers_count: 500, pushed_at: "2019-01-01T00:00:00Z" }),
      [],
      NOW,
    );
    const activity = (card: ReturnType<typeof buildRepoCard>) =>
      card.ratings?.find((r) => r.axis === "activity");

    expect(activity(recente)?.value).toBeGreaterThan(50);
    expect(activity(parado)?.value).toBe(0);
    // Raw não é nota: o número cru de dias fica visível na tabela acessível.
    expect(activity(parado)?.raw).toBeGreaterThan(700);
  });
});

describe("classe ex/Mega ex", () => {
  it("sai do pico de estrelas/forks, não da soma", () => {
    // 700★ = alcance ~52, abaixo do piso de 80 → standard (raridade double_rare
    // com o bônus de atividade, mas a classe é outra dimensão).
    const modesto = buildRepoCard(repo({ stargazers_count: 700 }), [], NOW);
    expect(modesto.cardClass).toBe("standard");

    // 250k★ satura alcance → mega ex.
    const gigante = buildRepoCard(repo({ stargazers_count: 250_000 }), [], NOW);
    expect(gigante.cardClass).toBe("mega_ex");
  });

  it("recém-criado não vira mega ex só por atividade saturada", () => {
    const novinho = buildRepoCard(
      repo({ stargazers_count: 0, forks_count: 0, pushed_at: NOW.toISOString() }),
      [],
      NOW,
    );
    expect(novinho.cardClass).toBe("standard");
  });
});

describe("derivações", () => {
  function derivationsOf(card: ReturnType<typeof buildRepoCard>): Derivation[] {
    const list = card.derivations;
    expect(list).toBeDefined();
    return list as Derivation[];
  }

  function reasonFor(card: ReturnType<typeof buildRepoCard>, labelKey: string): Derivation {
    const found = derivationsOf(card).find((item) => item.labelKey === labelKey);
    expect(found, `sem derivação para ${labelKey}`).toBeDefined();
    return found as Derivation;
  }

  it("explica os oito valores derivados da carta", () => {
    const card = buildRepoCard(repo(), [contributor()], NOW);
    expect(derivationsOf(card).map((item) => item.labelKey)).toEqual([
      "card.type",
      "card.hp",
      "card.attacks",
      "card.weakness",
      "card.resistance",
      "card.retreat",
      "card.rarityLabel",
      "card.tagLabel",
    ]);
  });

  it("usa chaves que existem nos dois idiomas, e não deixa {placeholder} solto", () => {
    // O painel é montado por chave; chave inexistente vira `undefined` na tela
    // e placeholder não substituído vira "{stars}" no meio da frase.
    const cards = [
      buildRepoCard(repo(), [contributor()], NOW),
      buildRepoCard(repo({ language: null }), [], NOW),
      buildRepoCard(repo({ language: "Brainfuck", archived: true }), [], NOW),
      buildRepoCard(repo({ language: "Coq", pushed_at: "2019-01-01T00:00:00Z" }), [], NOW),
    ];

    for (const locale of LOCALES) {
      for (const card of cards) {
        for (const item of derivationsOf(card)) {
          expect(t(locale, item.labelKey as MessageKey)).toBeTypeOf("string");
          const reason = t(locale, item.reasonKey as MessageKey, item.reasonParams);
          expect(reason, `${item.reasonKey} em ${locale}`).toBeTypeOf("string");
          expect(reason).not.toMatch(/[{}]/);
        }
      }
    }
  });

  it("não afirma contribuidor quando o ataque é o próprio repositório", () => {
    const semGente = buildRepoCard(repo(), [contributor({ type: "Bot" })], NOW);
    expect(reasonFor(semGente, "card.attacks").reasonKey).toBe("why.repo.attacks.self");

    const comGente = buildRepoCard(repo(), [contributor({ login: "pessoa" })], NOW);
    const comReason = reasonFor(comGente, "card.attacks");
    expect(comReason.reasonKey).toBe("why.repo.attacks");
    expect(comReason.reasonParams?.names).toBe("pessoa");
  });

  it("separa linguagem ausente de linguagem fora do mapa de tipos", () => {
    // Os dois casos dão tipo `normal`, e uma frase só deixaria o segundo sem
    // explicação para o leitor: "linguagem é Brainfuck" não explica Normal.
    expect(reasonFor(buildRepoCard(repo({ language: null }), [], NOW), "card.type").reasonKey).toBe(
      "why.repo.element.none",
    );
    expect(
      reasonFor(buildRepoCard(repo({ language: "Brainfuck" }), [], NOW), "card.type").reasonKey,
    ).toBe("why.repo.element.unmapped");
    expect(
      reasonFor(buildRepoCard(repo({ language: "Go" }), [], NOW), "card.type").reasonKey,
    ).toBe("why.repo.element");
  });

  it("nomeia o motivo certo para a ausência do bônus de atividade", () => {
    const ativo = buildRepoCard(repo({ stargazers_count: 700 }), [], NOW);
    const bonus = reasonFor(ativo, "card.rarityLabel");
    expect(bonus.reasonKey).toBe("why.repo.rarity");
    expect(bonus.reasonParams?.bonus).toBe(300);

    const parado = buildRepoCard(repo({ pushed_at: "2020-01-01T00:00:00Z" }), [], NOW);
    expect(reasonFor(parado, "card.rarityLabel").reasonKey).toBe("why.repo.rarity.stale");

    // Arquivado e parado dão o mesmo score, mas por razões diferentes — a frase
    // genérica de "sem push há 90 dias" mentiria sobre um repo arquivado ontem.
    const arquivado = buildRepoCard(repo({ archived: true }), [], NOW);
    expect(reasonFor(arquivado, "card.rarityLabel").reasonKey).toBe("why.repo.rarity.archived");
  });

  it("acompanha o valor que a carta de fato carrega", () => {
    const card = buildRepoCard(
      repo({ stargazers_count: 700, open_issues_count: 120, language: "Rust" }),
      [],
      NOW,
    );
    expect(reasonFor(card, "card.hp").value).toBe(String(card.hp));
    expect(reasonFor(card, "card.retreat").value).toBe(String(card.retreat));
    expect(reasonFor(card, "card.type").value).toBe(`element.${card.element}`);
    expect(reasonFor(card, "card.rarityLabel").value).toBe(`rarity.${card.rarity}`);
    expect(reasonFor(card, "card.weakness").value).toBe(`element.${card.weakness}`);
  });
});
