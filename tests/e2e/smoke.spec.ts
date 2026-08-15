import { expect, test } from "@playwright/test";

/** Assinatura de arquivo PNG. */
const PNG_MAGIC = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/** Largura e altura do IHDR, que é sempre o primeiro chunk do arquivo. */
function pngSize(buffer: Buffer): { width: number; height: number } {
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/*
 * `@smoke` é o recorte que `production.yml` roda contra o deployment recém-subido:
 * os casos que provam que produção está de fato ligada, sem escrever nada.
 *
 * A tag existe porque o recorte era `-g "rotas de imagem"`, casando pelo título
 * em português deste describe. Renomear o describe desligava o smoke de produção
 * em silêncio, e nada nos dois lados do acoplamento dizia que ele existia.
 */
test.describe("rotas de imagem", { tag: "@smoke" }, () => {
  test("serve a carta de perfil em /<user>.png", async ({ request }) => {
    const response = await request.get("/torvalds.png");

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
    // A janela do navegador é a única do header que sobrevive à CDN. Ver abaixo.
    expect(response.headers()["cache-control"]).toContain("max-age=3600");
    expect((await response.body()).subarray(0, 8)).toEqual(PNG_MAGIC);
  });

  /*
   * Este teste afirmava `s-maxage=86400` no header recebido, e falhava contra uma
   * produção onde a política estava valendo.
   *
   * A Vercel **consome** `s-maxage` e `stale-while-revalidate` para o próprio
   * cache de borda e não repassa nenhum dos dois ao cliente: a resposta chega
   * como `public, max-age=3600`, com um `x-vercel-cache` ao lado. A asserção
   * pedia para ver uma coisa que a plataforma esconde por construção — e o
   * sintoma da falha (`Received: "public, max-age=3600"`) parecia com a rota
   * servindo a política errada.
   *
   * A política em si passou a ser conferida onde é visível, em
   * `tests/unit/cache-control.test.ts`, sobre a constante que a declara. Aqui
   * fica o que só o e2e pode provar, e que aquele teste não alcança: que a borda
   * de fato cacheou. Duas requisições, e a segunda tem que vir de lá.
   */
  test("é cacheada na borda, e não regerada a cada visita", async ({ request }) => {
    test.skip(
      !process.env.E2E_BASE_URL,
      "só vale contra um deployment: o `next dev` não tem CDN na frente",
    );

    await request.get("/torvalds.png");
    const segunda = await request.get("/torvalds.png");

    // HIT ou STALE: os dois significam servido pela borda. Um MISS na segunda
    // volta é o que este teste existe para pegar — carta regerada por visita
    // esgota o rate limit do token e devolve a lentidão que o cache evita.
    expect(segunda.headers()["x-vercel-cache"]).toMatch(/HIT|STALE/);
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

  test("pular dispensa o pacote e revela o verso", async ({ page }) => {
    await page.goto("/torvalds");
    await page.locator(".pack-skip").click();

    await expect(page.locator(".pack")).toHaveCount(0);
    // O rasgo revela o verso, não a frente: os status são a recompensa do gesto
    // de virar, e não vão aparecer de graça no bolso do botão de pular.
    await expect(page.locator(".tilt-inner")).toHaveAttribute("data-flipped", "true");
    await expect(page.locator(".tilt-face-back img")).toHaveAttribute(
      "src",
      "/assets/backs/card-back.svg",
    );
  });

  test("rasgar dispensa o pacote e revela o verso", async ({ page }) => {
    await page.goto("/torvalds");
    await page.locator(".pack-wrapper").click();

    // A coreografia inteira tem menos de 1s; o overlay se desmonta sozinho ao
    // fim dela, sem ninguém precisar clicar de novo.
    await expect(page.locator(".pack")).toHaveCount(0, { timeout: 5000 });
    await expect(page.locator(".tilt-inner")).toHaveAttribute("data-flipped", "true");
  });

  test("Escape pula a abertura", async ({ page }) => {
    await page.goto("/torvalds");

    /*
     * Esperar o foco antes de digitar não é zelo: o overlay vem pronto no HTML,
     * mas quem ouve o Escape é um listener que só existe depois da hidratação.
     * Um Escape mandado antes dela não é adiado, é perdido — e o teste falha
     * acusando o pacote, que estava certo. O foco no botão de rasgar é o sinal
     * de que o componente montou, e é o mesmo que o teste de confinamento já
     * espera antes de mandar Tab.
     */
    await expect(page.locator(".pack-wrapper")).toBeFocused();
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

/*
 * Rolagem lateral no telefone é falha silenciosa: nada quebra, nada some, a
 * página só ganha uns 100px de vazio à direita e o polegar escorrega para lá.
 * A origem era a auréola atrás da carta, um quadrado de 620px que sangra de
 * propósito — e, por tabela, esticava o viewport de layout, tirando o pacote do
 * centro da tela. Daí medir o documento, e não a auréola: o sintoma a evitar é
 * a página larga demais, venha de onde vier.
 */
test.describe("largura no telefone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const path of ["/", "/torvalds", "/torvalds/linux"]) {
    test(`${path} não rola de lado`, async ({ page }) => {
      await page.goto(path);

      // Com o pacote na frente e depois sem ele: o overlay é fixo e cobre a
      // tela, então ele esconderia um vazamento da página atrás.
      const larguras = async () =>
        page.evaluate(() => ({
          tela: document.documentElement.clientWidth,
          documento: document.documentElement.scrollWidth,
        }));

      const comPacote = await larguras();
      expect(comPacote.documento).toBe(comPacote.tela);

      if (await page.locator(".pack").count()) {
        // O overlay vem no HTML, mas só ouve o teclado depois de hidratar — e
        // quem avisa que isso aconteceu é o foco que ele próprio move para o
        // botão de rasgar. Sem esperar por ele, o Escape se perde e o pacote
        // fica na tela.
        await expect(page.locator(".pack-wrapper")).toBeFocused();
        await page.keyboard.press("Escape");
        await expect(page.locator(".pack")).toHaveCount(0);
      }

      const semPacote = await larguras();
      expect(semPacote.documento).toBe(semPacote.tela);
    });
  }
});

/*
 * O flip do perfil nasce virado: quem abre o pacote recebe o verso, e a frente
 * (com os status) é a recompensa de um clique ou de um Enter. Nada disso existe
 * na home — lá a carta de exemplo é só um link.
 */
test.describe("virar a carta", () => {
  test("o perfil chega virado e um clique entrega a frente", async ({ page }) => {
    await page.goto("/torvalds");
    await page.locator(".pack-skip").click();

    const card = page.locator(".tilt-card");
    // Virável é `role="button"`, não link: o clique vira, não navega.
    await expect(card).toHaveAttribute("role", "button");

    // Nasceu virado: o verso para cima, a frente escondida.
    await expect(page.locator(".tilt-inner")).toHaveAttribute("data-flipped", "true");
    await expect(page.locator(".tilt-face-back img")).toHaveAttribute(
      "src",
      "/assets/backs/card-back.svg",
    );

    await card.click();
    await expect(page.locator(".tilt-inner")).not.toHaveAttribute("data-flipped", "true");

    await card.click();
    await expect(page.locator(".tilt-inner")).toHaveAttribute("data-flipped", "true");
  });

  test("teclado devolve o verso com Enter", async ({ page }) => {
    await page.goto("/torvalds");
    await page.locator(".pack-skip").click();

    // Do verso para a frente com um clique, e o Enter traz o verso de volta.
    await page.locator(".tilt-card").click();
    await expect(page.locator(".tilt-inner")).not.toHaveAttribute("data-flipped", "true");

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

  /*
   * A home cabe numa tela, e é a única página do site em que isso vale.
   *
   * A regressão aqui é silenciosa por construção: um bloco cresce alguns
   * pixels, a barra de rolagem volta, e nada quebra — a página continua
   * inteira, só deixa de ser a composição que ela é. Sem este teste, o sintoma
   * só aparece para quem abre a home.
   *
   * A altura importa mais que a largura: abaixo de 560px de altura a home volta
   * a rolar de propósito (não há espaço para espremer), então a medida é feita
   * acima desse corte.
   */
  test("a home cabe na tela, sem rolagem", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    const doc = await page.evaluate(() => ({
      scroll: document.documentElement.scrollHeight,
      client: document.documentElement.clientHeight,
    }));

    expect(doc.scroll).toBe(doc.client);
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

/*
 * `@stateful`: estes gravam. Cada execução cria um registro de batalha no Redis
 * com `BATTLE_TTL_SECONDS` (30 dias), e é por isso que produção roda só `@smoke`
 * — o motivo estava comentado em `production.yml`, do lado de lá do recorte, e
 * agora está aqui, do lado que o causa.
 */
test.describe("batalha", { tag: "@stateful" }, () => {
  test("sorteia, redireciona para um resultado estável e serve o pôster", async ({
    page,
    request,
  }) => {
    await page.goto("/torvalds/vs/sindresorhus");

    // O confronto é uma ação; o resultado é que tem página (RFC 7.3).
    await expect(page).toHaveURL(/\/battle\/[0-9a-f]{16}$/);

    const battleId = page.url().split("/").pop();
    const poster = await request.get(`/battle/${battleId}.png`);

    /*
     * Este 200 depende de `REDIS_URL`, e é a única asserção da suíte que
     * depende. Sem Redis o resultado sorteado fica no fallback em memória de
     * uma instância, e o pedido do pôster cai noutra: 404. Não é falha de
     * cache nem de rota — é o comportamento que `.env.example` descreve para
     * serverless, aparecendo onde ele aparece de verdade.
     */
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
