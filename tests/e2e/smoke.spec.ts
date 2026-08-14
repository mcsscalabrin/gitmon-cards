import { expect, test } from "@playwright/test";

/** Assinatura de arquivo PNG. */
const PNG_MAGIC = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/** Largura e altura do IHDR, que é sempre o primeiro chunk do arquivo. */
function pngSize(buffer: Buffer): { width: number; height: number } {
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

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

  /*
   * A prévia de link é a única imagem do produto que precisa de uma **proporção**
   * específica: 1.91:1. A carta é 5:7, e apontar o `og:image` direto para ela
   * fazia o X e o LinkedIn cortarem pelo centro, comendo o cabeçalho e o rodapé.
   * Por isso o teste mede o IHDR em vez de só conferir que saiu um PNG — o
   * sintoma de regressão aqui não é erro, é enquadramento.
   */
  test("serve a prévia de link em paisagem 1200x630", async ({ request }) => {
    /*
     * A rota mais cara do produto, e por construção: ela renderiza a carta
     * inteira e depois a compõe numa segunda passada de Satori, justamente para
     * não existir uma segunda versão da carta. Quente ela responde em meio
     * segundo, mas aqui ela é compilada pelo dev server enquanto quatro workers
     * disputam a mesma máquina, e os 30s padrão não bastam.
     */
    test.setTimeout(90_000);

    const response = await request.get("/api/card-og/torvalds");

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");

    const body = await response.body();
    expect(body.subarray(0, 8)).toEqual(PNG_MAGIC);
    expect(pngSize(body)).toEqual({ width: 1200, height: 630 });
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

  /*
   * O recorte de `/assets/` no rewrite. Sem ele, qualquer asset de dois segmentos
   * casa com `/:owner/:repo.png` e a resposta é uma carta de erro: um PNG de
   * verdade, com status 404, indistinguível dentro de um `<img>` de um arquivo
   * que só mudou de lugar. O sintoma da regressão não é erro — é arte errada.
   */
  test("mantém /assets/ fora do rewrite: arquivo estático não vira carta", async ({
    request,
  }) => {
    const asset = await request.get("/assets/backs/card-back.svg");

    expect(asset.status()).toBe(200);
    expect(asset.headers()["content-type"]).toContain("image/svg+xml");

    // Este não existe no disco, e é o caso que o rewrite engolia: tem que morrer
    // como arquivo ausente, não voltar como carta do dono "assets".
    const ausente = await request.get("/assets/card-back.png");

    expect(ausente.headers()["content-type"]).not.toContain("image/png");
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
    await expect(page.locator(".tilt-face-front img")).toBeVisible();
  });

  test("rasgar dispensa o pacote e revela a carta", async ({ page }) => {
    await page.goto("/torvalds");
    await page.locator(".pack-wrapper").click();

    // A coreografia inteira tem menos de 1s; o overlay se desmonta sozinho ao
    // fim dela, sem ninguém precisar clicar de novo.
    await expect(page.locator(".pack")).toHaveCount(0, { timeout: 5000 });
    await expect(page.locator(".tilt-face-front img")).toBeVisible();
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

test.describe("virar a carta", () => {
  test("clique no perfil revela o verso e outro clique volta", async ({ page }) => {
    await page.goto("/torvalds");
    await page.locator(".pack-skip").click();

    const card = page.locator(".tilt-card");
    // Virável é `role="button"`, não link: o clique vira, não navega.
    await expect(card).toHaveAttribute("role", "button");

    await card.click();
    await expect(page.locator(".tilt-inner")).toHaveAttribute("data-flipped", "true");
    await expect(page.locator(".tilt-face-back img")).toHaveAttribute(
      "src",
      "/assets/backs/card-back.svg",
    );

    await card.click();
    await expect(page.locator(".tilt-inner")).not.toHaveAttribute("data-flipped", "true");
  });

  test("teclado vira a carta com Enter", async ({ page }) => {
    await page.goto("/torvalds");
    await page.locator(".pack-skip").click();

    await page.locator(".tilt-card").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".tilt-inner")).toHaveAttribute("data-flipped", "true");
  });

  test("a home não vira: a carta de exemplo segue sendo um link", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".sample .tilt-card").first()).not.toHaveAttribute(
      "role",
      "button",
    );
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

  /*
   * O que uma prévia de link precisa está no HTML, não na imagem — e sai errado
   * em silêncio: nada quebra, a página abre, e só quem cola o link em outro
   * lugar descobre. Daí testar as tags e não a aparência delas.
   */
  test("aponta a prévia de link para a rota em paisagem", async ({ page }) => {
    await page.goto("/torvalds");

    const image = page.locator('meta[property="og:image"]');
    await expect(image).toHaveAttribute("content", /\/api\/card-og\/torvalds$/);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image",
    );
    // Sem dimensões declaradas alguns scrapers desistem antes de baixar a
    // imagem e caem no cartão pequeno, que é o desfecho que isto evita.
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute(
      "content",
      "1200",
    );
  });

  test("dá a carta em mãos: baixar o PNG e compartilhar", async ({ page }) => {
    await page.goto("/torvalds");
    await page.getByRole("button", { name: /Pular|Skip/ }).click();

    // O download é âncora, não botão com script: continua valendo em clique do
    // meio e em "salvar link como".
    const download = page.getByRole("link", { name: /Baixar PNG|Download PNG/ });
    await expect(download).toHaveAttribute("href", "/torvalds.png");
    await expect(download).toHaveAttribute("download", "torvalds.png");

    await expect(page.getByRole("button", { name: /Compartilhar|Share/ })).toBeVisible();
  });

  test("busca leva à carta de perfil", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("combobox").fill("torvalds");
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
