import { expect, test } from "@playwright/test";

/** Assinatura de arquivo PNG. */
const PNG_MAGIC = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

test.describe("rotas de imagem", () => {
  test("serve a carta de perfil em /<user>.png com o cache da RFC 4.2", async ({ request }) => {
    const response = await request.get("/torvalds.png");

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
    expect(response.headers()["cache-control"]).toContain("s-maxage=86400");
    expect((await response.body()).subarray(0, 8)).toEqual(PNG_MAGIC);
  });

  test("serve a carta de repositório em /<owner>/<repo>.png", async ({ request }) => {
    const response = await request.get("/torvalds/linux.png");

    expect(response.status()).toBe(200);
    expect((await response.body()).subarray(0, 8)).toEqual(PNG_MAGIC);
  });

  test("devolve carta de erro, e não imagem quebrada, para usuário inexistente", async ({
    request,
  }) => {
    const response = await request.get("/nao-existe-mesmo-gitmon-teste-0000.png");

    expect(response.status()).toBe(404);
    // O ponto: um embed quebrado num README precisa dizer o que houve.
    expect((await response.body()).subarray(0, 8)).toEqual(PNG_MAGIC);
    // Erro não herda o cache longo da carta.
    expect(response.headers()["cache-control"]).toContain("max-age=60");
  });
});

/*
 * A abertura de pacote é um overlay que cobre a página da carta inteira até ser
 * rasgado ou pulado. Qualquer teste futuro que clique em algo da página da carta
 * vai esbarrar nele — estes existem para que esse esbarrão tenha um nome, em vez
 * de virar uma falha confusa em outro teste.
 */
test.describe("abertura de pacote", () => {
  test("cobre a página da carta e o foco começa no pacote", async ({ page }) => {
    await page.goto("/torvalds");

    const pack = page.locator(".pack");
    await expect(pack).toBeVisible();
    await expect(pack).toHaveAttribute("aria-modal", "true");

    // Foco inicial no objeto interativo, não no botão de escapar.
    await expect(page.locator(".pack-wrapper")).toBeFocused();
  });

  test("pular dispensa o pacote e revela a carta", async ({ page }) => {
    await page.goto("/torvalds");
    await page.locator(".pack-skip").click();

    await expect(page.locator(".pack")).toHaveCount(0);
    await expect(page.locator(".tilt-card img")).toBeVisible();
  });

  test("rasgar dispensa o pacote e revela a carta", async ({ page }) => {
    await page.goto("/torvalds");
    await page.locator(".pack-wrapper").click();

    // A coreografia inteira tem menos de 1s; o overlay se desmonta sozinho ao
    // fim dela, sem ninguém precisar clicar de novo.
    await expect(page.locator(".pack")).toHaveCount(0, { timeout: 5000 });
    await expect(page.locator(".tilt-card img")).toBeVisible();
  });

  test("Escape pula a abertura", async ({ page }) => {
    await page.goto("/torvalds");
    await page.keyboard.press("Escape");

    await expect(page.locator(".pack")).toHaveCount(0);
  });

  /*
   * `aria-modal="true"` promete que nada fora do diálogo existe. Sem o
   * confinamento, o Tab cairia nos links do cabeçalho, que estão cobertos pelo
   * overlay — navegação por teclado às cegas.
   */
  test("confina o foco no overlay", async ({ page }) => {
    await page.goto("/torvalds");
    await expect(page.locator(".pack-wrapper")).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.locator(".pack-skip")).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.locator(".pack-wrapper")).toBeFocused();

    await page.keyboard.press("Shift+Tab");
    await expect(page.locator(".pack-skip")).toBeFocused();
  });
});

test.describe("site", () => {
  test("abre a home com cartas de exemplo já visíveis", async ({ page }) => {
    await page.goto("/");

    // RFC 9.4: o conceito precisa ser entendido olhando, não lendo.
    const samples = page.locator(".sample img");
    await expect(samples).toHaveCount(3);
    await expect(samples.first()).toBeVisible();
  });

  test("troca o idioma da interface e mantém a escolha", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "English" }).click();
    await expect(page.getByRole("button", { name: "English" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.goto("/torvalds");
    // `dt` explícito: a faixa de apoio também escreve "stars" (no contador do
    // botão de favoritar), e um getByText solto casa com os dois.
    await expect(page.locator("dl.stat-grid dt").filter({ hasText: "Stars" })).toBeVisible();
  });

  test("busca leva à carta de perfil", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("textbox").fill("torvalds");
    await page.getByRole("button", { name: /Gerar carta|Generate card/ }).click();

    await expect(page).toHaveURL(/\/torvalds$/);
    await expect(page.getByRole("heading", { name: "Linus Torvalds" })).toBeVisible();
  });
});

test.describe("batalha", () => {
  test("sorteia, redireciona para um resultado estável e serve o pôster", async ({
    page,
    request,
  }) => {
    await page.goto("/torvalds/vs/sindresorhus");

    // O confronto é uma ação; o resultado é que tem página (RFC 7.3).
    await expect(page).toHaveURL(/\/battle\/[0-9a-f]{16}$/);

    const battleId = page.url().split("/").pop();
    const poster = await request.get(`/battle/${battleId}.png`);

    expect(poster.status()).toBe(200);
    expect((await poster.body()).subarray(0, 8)).toEqual(PNG_MAGIC);
    // Resultado já sorteado não muda nunca.
    expect(poster.headers()["cache-control"]).toContain("immutable");
  });

  test("dois confrontos seguidos geram resultados distintos", async ({ page }) => {
    await page.goto("/torvalds/vs/sindresorhus");
    const first = page.url();

    await page.goto("/torvalds/vs/sindresorhus");
    const second = page.url();

    // Por isso a URL de confronto não pode ter cache duro (RFC 7.3/11).
    expect(first).not.toBe(second);
  });
});
