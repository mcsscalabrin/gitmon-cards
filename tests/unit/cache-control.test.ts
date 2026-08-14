import { describe, expect, it } from "vitest";
import {
  BATTLE_IMAGE_CACHE_CONTROL,
  CARD_IMAGE_CACHE_CONTROL,
} from "@/lib/config";

/**
 * A política de cache da RFC 4.2 não tinha cobertura nenhuma, e a tentativa de
 * cobri-la vivia no e2e — no único ângulo em que ela é **invisível**.
 *
 * A Vercel consome `s-maxage` e `stale-while-revalidate` para o próprio cache de
 * borda e não repassa nenhum dos dois ao cliente: a resposta chega com
 * `public, max-age=3600` e um `x-vercel-cache: HIT` ao lado. O e2e afirmava
 * `s-maxage=86400` no header recebido e falhava contra uma produção onde a
 * política estava, de fato, valendo.
 *
 * Aqui a política é observável, porque é uma string que nós escrevemos. O e2e
 * fica com o que só ele pode provar: que a borda cacheou.
 */
describe("política de cache das imagens (RFC 4.2)", () => {
  /** `a=b, c` → `{ a: "b", c: true }`, para asserir diretiva a diretiva. */
  function parse(header: string): Record<string, string | true> {
    return Object.fromEntries(
      header.split(",").map((parte) => {
        const [nome, valor] = parte.trim().split("=");
        return [nome.toLowerCase(), valor ?? true];
      }),
    );
  }

  describe("carta", () => {
    const diretivas = parse(CARD_IMAGE_CACHE_CONTROL);

    it("é pública: a carta vive dentro do README de terceiro, sem sessão", () => {
      expect(diretivas.public).toBe(true);
      expect(diretivas.private).toBeUndefined();
      expect(diretivas["no-store"]).toBeUndefined();
    });

    it("dá à CDN 24h e ao navegador 1h", () => {
      expect(diretivas["s-maxage"]).toBe("86400");
      expect(diretivas["max-age"]).toBe("3600");
    });

    /*
     * A janela de revalidação é o que separa "carta velha por uma semana" de
     * "erro no README de alguém": expirado o s-maxage, a borda serve o que tem
     * enquanto busca a versão nova, em vez de deixar o visitante esperando a
     * API do GitHub.
     */
    it("serve carta velha enquanto revalida, por uma semana", () => {
      expect(diretivas["stale-while-revalidate"]).toBe("604800");
    });

    it("dá ao navegador uma janela menor que a da CDN", () => {
      // Invertido, a CDN expiraria antes do navegador e a atualização de uma
      // carta demoraria mais que o previsto — sem nada quebrar visivelmente.
      expect(Number(diretivas["max-age"])).toBeLessThan(
        Number(diretivas["s-maxage"]),
      );
    });
  });

  describe("pôster de batalha", () => {
    const diretivas = parse(BATTLE_IMAGE_CACHE_CONTROL);

    /*
     * Um resultado já sorteado não muda nunca (RFC 7.3), então aqui o cache é
     * duro. O que não pode ter cache duro é a rota `/<a>/vs/<b>`, que precisa
     * sortear de novo a cada visita — e essa não passa por estas constantes.
     */
    it("é imutável, porque o resultado já foi sorteado", () => {
      expect(diretivas.immutable).toBe(true);
      expect(diretivas["max-age"]).toBe("31536000");
      expect(diretivas["s-maxage"]).toBe("31536000");
    });

    it("dura mais que a carta, que ainda pode mudar", () => {
      expect(Number(diretivas["s-maxage"])).toBeGreaterThan(
        Number(parse(CARD_IMAGE_CACHE_CONTROL)["s-maxage"]),
      );
    });
  });
});
