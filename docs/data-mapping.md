# Mapeamento GitHub → campos da carta

Fonte: RFC seção 6. Copy do tom: **técnico-neutro** — o dado fala por si, sem flavor text
inventado (RFC 9.2).

## Carta de perfil

Origem: `GET /users/{username}` + `GET /users/{username}/repos?per_page=100`

| Campo | Fórmula |
|---|---|
| HP | `clamp(30 + estrelasTotais×3 + seguidores×1 + reposPúblicos×2, 30, 250)`, arredondado pra dezena |
| Tipo | Linguagem mais frequente entre os repos próprios, ponderada por estrelas → mapa linguagem→elemento |
| Ataques | 2 repositórios mais estrelados. `damage = clamp(estrelas×4, 10, 300)`; `text` = descrição truncada |
| Fraqueza | Segunda linguagem mais frequente, `×2` |
| Recuo | `clamp(round(idadeContaEmAnos / 2), 1, 4)` pips |
| Raridade | `score = estrelasTotais×2 + seguidores×3 + reposPúblicos + idadeContaEmAnos×5` → faixas |
| Arte | `avatar_url` |
| Rodapé | bio truncada + ano de criação da conta |

Tiers de raridade (8, no padrão do TCG Pokémon):
`common / uncommon / rare / double_rare / illustration_rare / ultra_rare /
special_illustration_rare / hyper_rare`.

As faixas **não** vêm do protótipo: foram calibradas contra perfis reais medidos
pela API, porque o score cresce muito mais rápido que a intuição (estrelas contam
×2 e seguidores ×3 — `sindresorhus` dá 1.945.490). A tabela de calibração vive no
cabeçalho de `lib/cards/rarity.ts` e está travada por
`tests/unit/rarity.test.ts`. Cada carta também recebe um **número de série**
sequencial (`lib/cards/serial.ts`).

**O mapa linguagem→elemento completo está no protótipo**
(`reference/github-card-prototype.html`) e deve ser transcrito de lá — não
reinventado.

## Carta de repositório

**Não fechada no planejamento** (RFC 6.2) — precisa de uma rodada de decisão antes de implementar.
Proposta inicial:

| Campo | Fórmula proposta |
|---|---|
| HP | Baseado em `stargazers_count` |
| Tipo | Linguagem principal do repositório |
| Ataques | Top contribuidores (nome = ataque, contribuições = dano) **ou** releases marcantes |
| Fraqueza | `open_issues_count` alto → fraqueza a "manutenção" |
| Raridade | Estrelas + forks + frequência de commits recentes |
| Arte | `owner.avatar_url` ou social preview do repo, se exposto pela API |

Pontos a resolver: contribuidores custam uma chamada a mais por carta (impacto no rate limit e no
cache); "fraqueza a manutenção" não é um dos elementos, então ou vira um elemento existente ou
quebra o modelo de tipos.

**Resolvido (Q5).** `open_issues_count` virou **custo de recuo**, não fraqueza:
1 pip a cada 50 issues, teto de 4. Carrega a mesma leitura — repo com fila grande
é mais difícil de largar — sem inventar um tipo fora da tabela. A fraqueza da
carta de repositório vem da cadeia do tipo, como todo o resto.

**Nota sobre a contagem de tipos.** Este documento foi escrito quando eram 7
elementos. São **18**, e `neutral` virou `normal` — ver o adendo na seção 4.4 da
RFC. Onde se lê `neutral` abaixo, leia `normal`.

## Casos de borda

| Caso | Comportamento |
|---|---|
| Usuário inexistente | Erro claro, tom técnico-neutro (RFC 9.2) |
| `type: Organization` | **Fora da v1** — detectar e devolver erro explícito, não gerar carta degradada (RFC 9.5) |
| Perfil sem repositórios | Carta válida com tipo `normal` e sem ataques — definir fallback |
| Perfil sem linguagem detectável | `normal` |
| Rate limit atingido | Erro explícito; cache Redis é obrigatório, não opcional (RFC 11) |

## Motor de batalha

Ver RFC 7.3. Resumo: HP inicial = HP da carta; ataque escolhido aleatoriamente entre os 2 a cada
turno; dano `×` efetividade de tipo (`×2` / `×0.5`, tabela em [`layout-spec.md`](layout-spec.md))
`×` variância de ±15%; alterna turnos, desafiante começa; termina em HP ≤ 0 ou teto de 20 turnos
(vence maior % de HP restante).

O resultado gera um `battle-id` imutável — é ele, e não o par de usuários, que é cacheável.
