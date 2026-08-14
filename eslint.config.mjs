import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * `next lint` foi removido no Next 16 — este arquivo é a substituição, e
 * `npm run lint` passou a chamar o CLI do ESLint direto.
 *
 * Formato flat, como a doc do Next 16 prescreve
 * (node_modules/next/dist/docs/01-app/03-api-reference/05-config/03-eslint.md).
 *
 * O script roda com `--max-warnings=0`: aviso que não quebra é aviso que
 * ninguém lê. Ou a regra vale para este projeto e fica ligada, ou não vale e é
 * desligada aqui, com o motivo escrito. Não há terceira categoria.
 */
export default defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    rules: {
      /*
       * `<img>` cru é decisão do projeto, não descuido, nos quatro lugares onde
       * aparece: a carta (`TiltCard`) vem de uma rota de API já em 500x700 e com
       * o Cache-Control da RFC 4.2 — passar pelo otimizador acrescentaria um
       * segundo cache no caminho de uma imagem que já é o produto final; os
       * ícones de tipo (`TypeIcon`) são SVG local de poucos KB; e o avatar da
       * busca (`UserSearchInput`) vem da CDN do GitHub já dimensionado.
       */
      "@next/next/no-img-element": "off",
    },
  },

  {
    /*
     * Os renderizadores de `lib/og/` não produzem DOM: são JSX que o Satori lê
     * para desenhar um PNG. Não há leitor de tela do outro lado — o destino é um
     * arquivo de imagem — e `alt` ali é prop que o Satori ignora. A
     * acessibilidade da imagem exportada vive no `alt` de quem a embute.
     */
    files: ["lib/og/**/*.tsx"],
    rules: {
      "jsx-a11y/alt-text": "off",
    },
  },

  globalIgnores([
    // Defaults do eslint-config-next, que precisam ser repetidos ao sobrescrever.
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // Material de consulta clonado, não é código nosso (ver README).
    "reference/**",
    // Diretório de trabalho do Superdesign, ignorado pelo git.
    ".superdesign/**",
  ]),
]);
