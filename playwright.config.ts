import { defineConfig, devices } from "@playwright/test";

/**
 * E2E. Os testes batem na API de verdade, que é o ponto: o que quebra em
 * produção é o contrato com o GitHub, não o nosso código isolado. As fórmulas em
 * si já têm cobertura unitária em tests/unit.
 *
 * Dois modos, decididos por `E2E_BASE_URL`:
 *
 *   - **Local** (sem a variável): sobe `npm run dev` e testa contra ele. Precisa
 *     de `GITHUB_TOKEN` no ambiente, porque quem chama o GitHub é este processo.
 *   - **Contra um deployment** (com a variável): é o que o CI faz, apontando
 *     para o preview da Vercel. Aqui o Playwright só fala HTTP; o token vive na
 *     Vercel e `GITHUB_TOKEN` no runner é desnecessário.
 *
 * Antes da primeira execução: `npx playwright install chromium`.
 */

/*
 * Deployment Protection da Vercel devolve a tela de login para o runner, e todos
 * os testes falham de um jeito que não parece proteção — parece bug. O
 * `set-bypass-cookie` não é redundante com o header: sem o cookie, os `page.goto`
 * passariam pelo header no documento e esbarrariam na proteção nos subrecursos.
 *
 * Estes headers resolvem o caso em que o secret existe. Quando ele falta, quem
 * fala é o `globalSetup`: mandar a suíte inteira contra a tela de login produz
 * vinte falhas que acusam as rotas de imagem, e nenhuma que acuse a proteção.
 */
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const protectionHeaders = bypass
  ? {
      "x-vercel-protection-bypass": bypass,
      "x-vercel-set-bypass-cookie": "true",
    }
  : undefined;

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // No CI, os dois: `github` anota a falha na linha do diff, e o `html` é o que
  // sobe como artefato — anotação sem trace não conta o que aconteceu.
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"]],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    extraHTTPHeaders: protectionHeaders,
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
