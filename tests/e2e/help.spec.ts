import { expect, test } from "@playwright/test";

/*
 * A ajuda por seção: o "?" de cada aba abre uma bolha curta, fecha no clique
 * fora e no Escape, e não navega. A página do perfil também confere que as
 * seções da carta têm suas próprias bolhas.
 */
test.describe("ajuda por seção (?)", () => {
  test("na home o '?' abre a bolha da busca e não navega", async ({ page }) => {
    await page.goto("/");

    const trigger = page.getByRole("button", { name: /O que é esta seção|What is this section/ });
    await expect(trigger).toBeVisible();
    await trigger.click();

    const popover = page.locator(".help-popover");
    await expect(popover).toBeVisible();
    await expect(popover).toContainText("Gerar uma carta");
    // Leve de propósito: abrir ajuda não muda de rota.
    await expect(page).toHaveURL(/\/$/);
  });

  test("Escape fecha a bolha", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /O que é esta seção|What is this section/ }).click();
    await expect(page.locator(".help-popover")).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(page.locator(".help-popover")).toHaveCount(0);
  });

  test("clique fora fecha a bolha", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /O que é esta seção|What is this section/ }).click();
    await expect(page.locator(".help-popover")).toBeVisible();

    await page.getByRole("heading", { name: /Cartas geradas|Cards generated/ }).click();

    await expect(page.locator(".help-popover")).toHaveCount(0);
  });

  test("a página da carta tem uma bolha por seção", async ({ page }) => {
    await page.goto("/torvalds?guide=1");

    // Cabeçalho da carta: raridade, tag e classe.
    await page.locator(".card-headline .help-trigger").click();
    await expect(page.locator(".help-popover")).toContainText("Raridade, tag e classe");
    await page.keyboard.press("Escape");

    // Radar.
    await page.locator(".radar .help-trigger").click();
    await expect(page.locator(".help-popover")).toContainText("Assinatura do perfil");
    await page.keyboard.press("Escape");

    // Embutir no README.
    await page.locator(".embed .help-trigger").click();
    await expect(page.locator(".help-popover")).toContainText("Embutir no README");
    await page.keyboard.press("Escape");

    // Batalha e o seletor de modos Speed Duel.
    await page.locator(".battle-form-heading .help-trigger").click();
    await expect(page.locator(".help-popover")).toContainText("Batalha");
    await page.keyboard.press("Escape");
    await page.locator(".battle-form-modes-row .help-trigger").click();
    await expect(page.locator(".help-popover")).toContainText("Speed Duel");
  });

  test("o 'Passo a passo' da seção Carta roda um mini-tour só dela", async ({ page }) => {
    await page.goto("/torvalds?guide=1");

    await page.locator(".card-headline .help-trigger").click();
    await page.locator(".help-popover .help-start").click();

    // O mini-tour da carta tem 3 passos (pacote → frente → cabeçalho), não os
    // 14 do tour universal — e a bolha fecha na hora do disparo.
    const tooltip = page.locator(".guide-tooltip");
    await expect(tooltip).toBeVisible();
    await expect(page.locator(".help-popover")).toHaveCount(0);
    await expect(tooltip).toContainText(/1 de 3|1 of 3/);
    await expect(tooltip).toContainText("Abertura de pacote");
  });

  test("o mini-tour da busca na home tem um passo só", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /O que é esta seção|What is this section/ }).click();
    await page.locator(".help-popover .help-start").click();

    const tooltip = page.locator(".guide-tooltip");
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText(/1 de 1|1 of 1/);
    // Fecha com Escape como o tour completo.
    await page.keyboard.press("Escape");
    await expect(page.locator(".guide-overlay")).toHaveCount(0);
  });
});
