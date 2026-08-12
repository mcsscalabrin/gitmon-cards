"use client";

import { useState } from "react";

/**
 * Levar a carta embora: baixar o PNG e compartilhar.
 *
 * O destino principal da carta é o feed social, e no feed o PNG **é** o produto
 * inteiro — não há site em volta dele. Até aqui a única saída era o snippet de
 * markdown, que serve ao destino secundário (o README) e não ao primeiro: ninguém
 * cola markdown no Instagram.
 *
 * O download é um `<a download>` e não um botão com JavaScript. A imagem é do
 * mesmo domínio, então o navegador resolve sozinho — e continua funcionando com
 * script desligado, em clique do meio e em "salvar link como". Um `fetch` +
 * `URL.createObjectURL` faria o mesmo trabalho pior.
 *
 * O compartilhar tem três degraus, nesta ordem:
 *
 *   1. o **arquivo**, quando `canShare` aceita — no celular isso põe a carta
 *      direto na composição do post, que é o caminho inteiro do produto;
 *   2. a **URL**, quando há `navigator.share` mas não compartilhamento de
 *      arquivo (o caso do Safari desktop);
 *   3. **copiar o link**, no desktop em geral, onde `navigator.share` não existe.
 *
 * O botão é sempre renderizado, com o comportamento decidido no clique e não na
 * montagem. Decidir na montagem exigiria esperar o cliente para saber se o botão
 * existe, e isso ou dá divergência de hidratação ou faz um botão aparecer do nada
 * depois que a página já assentou.
 */
export function ShareActions({
  imagePath,
  pageUrl,
  name,
  filename,
  downloadLabel,
  shareLabel,
  copiedLabel,
}: {
  /** Caminho da carta no mesmo domínio, ex. `/torvalds.png`. */
  imagePath: string;
  /** URL absoluta da página, que é o que se compartilha. */
  pageUrl: string;
  name: string;
  /** Nome do arquivo salvo. O id tem barra no repositório; aqui não pode ter. */
  filename: string;
  downloadLabel: string;
  shareLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        const file = await pngFile(imagePath, filename);
        if (file && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ title: name, text: name, files: [file] });
        } else {
          await navigator.share({ title: name, text: name, url: pageUrl });
        }
        return;
      } catch (error) {
        // Fechar a folha de compartilhamento é `AbortError`, e não é falha:
        // cair no fallback de copiar depois de a pessoa ter desistido seria
        // fazer uma coisa que ela acabou de recusar.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(pageUrl);
    } catch {
      // Sem permissão de clipboard (http, navegador antigo). A URL está na
      // barra de endereços; não vale interromper com erro.
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="share-actions">
      <a className="share-button" href={imagePath} download={filename}>
        {downloadLabel}
      </a>
      <button type="button" className="share-button" onClick={share}>
        {copied ? copiedLabel : shareLabel}
      </button>
    </div>
  );
}

/**
 * A carta como `File`, para o compartilhamento nativo.
 *
 * Falha vira `null` e o fluxo cai para a URL: uma carta que não compartilha o
 * arquivo ainda compartilha o link, e é melhor que um erro.
 */
async function pngFile(imagePath: string, filename: string): Promise<File | null> {
  try {
    const response = await fetch(imagePath);
    if (!response.ok) return null;
    return new File([await response.blob()], filename, { type: "image/png" });
  } catch {
    return null;
  }
}
