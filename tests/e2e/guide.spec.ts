import { expect, test } from "@playwright/test";

/*
 * O "Guia" do cabeçalho: clicar inicia o tour da página atual — a home roda a
 * busca, a página da carta percorre as seções dela, e "Pular" fecha na hora.
 */
test.describe("o 'Guia' do cabeçalho", () => {
  test("na home inicia o tour da busca, sem navegar", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /^Guia$|^Guide$/ }).click();

    const tooltip = page.locator(".guide-tooltip");
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText(/1 de 1|1 of 1/);
    await expect(tooltip).toContainText(/Gerar uma carta|Generate a card/);
    // Leve de propósito: o tour não troca de rota.
    await expect(page).toHaveURL(/\/$/);
  });

  test("na página da carta percorre as seções dela", async ({ page }) => {
    await page.goto("/torvalds?guide=1");

    await page.getByRole("button", { name: /^Guia$|^Guide$/ }).click();

    const tooltip = page.locator(".guide-tooltip");
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText(/1 de 9|1 of 9/);
    await expect(tooltip).toContainText("Abertura de pacote");
  });

  test("Pular fecha o tour", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /^Guia$|^Guide$/ }).click();
    await expect(page.locator(".guide-tooltip")).toBeVisible();

    await page.getByRole("button", { name: /Pular|Skip/ }).click();

    await expect(page.locator(".guide-overlay")).toHaveCount(0);
  });

  // A página /docs deixou de existir — o "Guia" do cabeçalho não leva mais a
  // lugar nenhum (o teste da home prova que ele abre o tour, sem navegar).
  // `/docs` em si continua servindo como qualquer rota de um segmento: cai no
  // perfil genérico `[owner]`, então não há o que asserar de "404" aqui.
});
