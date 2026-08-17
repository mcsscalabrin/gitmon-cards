# Carta no seu README em 30s

A carta é uma imagem PNG estática com URL própria. Cola o snippet no seu README e a imagem se atualiza sozinha — sem login, sem API key, sem build.

## URL da imagem

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Perfil | `https://<host>/<user>.png` | `https://<host>/torvalds.png` |
| Repositório | `https://<host>/<owner>/<repo>.png` | `https://<host>/facebook/react.png` |
| Resultado de batalha | `https://<host>/battle/<id>.png` | gerado após simular uma batalha |

## Snippet markdown

```markdown
[![torvalds](https://<host>/torvalds.png)](https://github.com/torvalds)
```

Para um repositório:

```markdown
[![react](https://<host>/facebook/react.png)](https://github.com/facebook/react)
```

O link aponta para o perfil ou repositório no GitHub. Quem clica na imagem vai direto para lá.

## Como funciona

- A imagem é renderizada no servidor a cada 请求, com cache CDN de 24h (`s-maxage=86400`).
- O `stale-while-revalidate` serve a versão em cache enquanto revalida em background — nenhum visitante espera.
- O PNG usa o mesmo pipeline de geração da carta no site: Satori + sharp, sem headless browser.
- O `og:image` da página aponta para uma versão landscape (1200×630) otimizada para previews de rede social.

## Formato da imagem

- **Retrato** (5:7, 500×700): a carta em si, ideal para READMEs e feeds.
- **Paisagem** (1.91:1, 1200×630): preview de rede social com a carta ao lado dos números.

## Troubleshooting

| Problema | Causa | Solução |
|----------|-------|---------|
| Ícone de quebra-link no README | Primeira geração ainda não terminou | Aguarda alguns segundos e recarrega |
| Imagem desatualizada | Cache de 24h ainda válido | Espera ou força refresh no browser |
| 404 na URL | Usuário/repositório não existe no GitHub | Verifica o nome exato no GitHub |
| Imagem sem estilo | CDN servindo versão antiga | O `stale-while-revalidate` resolve em background |

## Batalhas e duelos

O resultado de uma batalha ou duelo também gera uma imagem estática com URL própria. Após simular, o site mostra um `CopyField` com a URL do pôster — cole no mesmo snippet markdown.

```markdown
[![battle](https://<host>/battle/abc123.png)](https://<host>/battle/abc123)
```

## SVG não existe

Toda imagem exportada é PNG. O SVG que aparece no site (verso da carta Yu-Gi-Oh, ícones de tipo) é renderização interna e não está disponível para download.
