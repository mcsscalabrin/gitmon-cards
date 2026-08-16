import { expect, test } from "@playwright/test";

/*
 * O guia e o tour guiado. O tour navega pelas páginas reais (home, perfil) e
 * ilumina o elemento de cada passo — estes testes cobrem o laço de entrada e a
 * navegação, e o caso de supressão do pacote que o tour usa (`?guide=1`).
 */
test.describe("guia (/docs) e tour guiado", () => {
  test("a página /docs carrega o conteúdo e o botão de tour", async ({ page }) => {
    await page.goto("/docs");

    await expect(page.getByRole("heading", { name: /Guia de uso|How to use/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Iniciar tour guiado|Start guided tour/ })).toBeVisible();
    await expect(page.locator(".docs-sections li")).toHaveCount(14);
  });

  test("iniciar o tour abre a tooltip do primeiro passo com spotlight", async ({ page }) => {
    await page.goto("/docs");
    await page.getByRole("button", { name: /Iniciar tour guiado|Start guided tour/ }).click();

    const tooltip = page.locator(".guide-tooltip");
    await expect(tooltip).toBeVisible();
    // O diálogo (com `aria-modal`) é o overlay; a tooltip é a caixa dentro dele.
    await expect(page.locator(".guide-overlay")).toHaveAttribute("aria-modal", "true");
    await expect(tooltip).toContainText("O que é o Gitmon Cards");
    // O primeiro passo ilumina o herói da própria /docs.
    await expect(page.locator(".guide-spotlight")).toBeVisible();
    // O progresso conta os 14 passos.
    await expect(tooltip).toContainText(/1 de 14|1 of 14/);
  });

  test("avançar navega até a home e ilumina a busca", async ({ page }) => {
    await page.goto("/docs");
    await page.getByRole("button", { name: /Iniciar tour guiado|Start guided tour/ }).click();

    // Escopo na tooltip: o rótulo "Next" também casa com o botão do Next.js Dev
    // Tools em dev, que aparece de forma não determinística.
    await page.locator(".guide-tooltip").getByRole("button", { name: /Próximo|Next/ }).click();

    // O passo "gerar carta" navega para a home e espera o seletor da busca.
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator(".guide-tooltip")).toContainText("Gerar uma carta");
    await expect(page.locator(".guide-tooltip")).toContainText(/2 de 14|2 of 14/);
  });

  test("Escape fecha o tour", async ({ page }) => {
    await page.goto("/docs");
    await page.getByRole("button", { name: /Iniciar tour guiado|Start guided tour/ }).click();
    await expect(page.locator(".guide-tooltip")).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(page.locator(".guide-overlay")).toHaveCount(0);
  });

  test("?guide=1 suprime a abertura de pacote (usada pelo tour)", async ({ page }) => {
    await page.goto("/torvalds?guide=1");

    await expect(page.locator(".pack")).toHaveCount(0);
    await expect(page.locator(".tilt-card")).toBeVisible();
  });
});
