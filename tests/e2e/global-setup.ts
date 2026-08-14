/**
 * Sonda o deployment antes da primeira suíte, para que a Deployment Protection
 * da Vercel falhe como proteção e não como bug.
 *
 * ## O que acontecia sem isto
 *
 * Protegido, o deployment responde `302` para `vercel.com/sso-api`. O Playwright
 * segue o redirect, cai na tela de login e recebe dela um `200 text/html`. O
 * `expect(status).toBe(200)` passa, o `content-type` estoura, e o relatório diz
 * que a rota de imagem devolveu HTML — que é exatamente o sintoma de uma rota
 * quebrada. Vinte testes falham assim, depois de sete minutos de execução, e
 * nada na saída menciona proteção.
 *
 * A sonda troca isso por uma linha, em segundos, dizendo qual secret falta.
 *
 * ## Por que sondar em vez de exigir o secret
 *
 * Exigir `VERCEL_AUTOMATION_BYPASS_SECRET` sempre que houver `E2E_BASE_URL`
 * seria mais curto e estaria errado: quem desliga a Deployment Protection não
 * precisa de bypass nenhum, e passaria a ser barrado por um gate inventado
 * aqui. Quem responde se o runner entra é o próprio deployment, então é ele que
 * decide.
 */

const SSO = "vercel.com/sso-api";

export default async function globalSetup() {
  const baseUrl = process.env.E2E_BASE_URL;

  // Sem a variável o alvo é o `next dev` do `webServer`, que não tem proteção.
  if (!baseUrl) return;

  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

  /*
   * `redirect: "manual"` é o ponto: seguindo o redirect chegaríamos ao mesmo
   * `200 text/html` que engana os testes. O que interessa é o salto, não o
   * destino.
   */
  const response = await fetch(baseUrl, {
    redirect: "manual",
    headers: bypass
      ? {
          "x-vercel-protection-bypass": bypass,
          "x-vercel-set-bypass-cookie": "true",
        }
      : {},
  });

  const location = response.headers.get("location") ?? "";
  if (!location.includes(SSO)) return;

  /*
   * Duas causas, uma mensagem cada: sem o secret é configuração que falta, com
   * o secret é valor errado ou vencido. Trocar um pelo outro custa a tarde de
   * quem for atrás.
   */
  const diagnostico = bypass
    ? [
        "O secret VERCEL_AUTOMATION_BYPASS_SECRET está definido, mas o deployment",
        "não o aceitou — valor errado, ou regerado na Vercel depois de gravado aqui.",
      ]
    : [
        "Falta o secret VERCEL_AUTOMATION_BYPASS_SECRET.",
        "Na Vercel: Project Settings > Deployment Protection > Protection Bypass for",
        "Automation. Copie o valor para Settings > Secrets and variables > Actions,",
        "no GitHub, com esse mesmo nome.",
      ];

  throw new Error(
    [
      `A Deployment Protection da Vercel está barrando o runner em ${baseUrl}.`,
      "",
      ...diagnostico,
      "",
      "Alternativa: desligar a Deployment Protection para Preview, e aí nenhum",
      "secret é necessário — ao custo de o preview ficar público.",
    ].join("\n"),
  );
}
