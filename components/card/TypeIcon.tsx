import type { Element } from "@/lib/cards/types";

/**
 * O disco colorido do tipo, na interface web.
 *
 * Os 18 SVGs já eram copiados para `public/assets/types/` por
 * `scripts/build-assets.mjs` desde que os tipos chegaram, mas só a **imagem** da
 * carta os usava (rasterizados em `public/assets/energy/*.png`, para o Satori).
 * Aqui entra o SVG direto: é a mesma arte de onde a paleta de `palette.json` foi
 * extraída, então ícone e cor do elemento não têm como divergir.
 *
 * Sempre decorativo: `alt=""` e `aria-hidden`. Em todo lugar onde ele aparece, o
 * nome do tipo está escrito ao lado — um leitor de tela que anunciasse o ícone
 * leria o tipo duas vezes.
 */
export function TypeIcon({
  element,
  size = 18,
}: {
  element: Element;
  /** Lado do disco em px. O SVG é quadrado (viewBox 256×256). */
  size?: number;
}) {
  return (
    <img
      className="type-icon"
      src={`/assets/types/${element}.svg`}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      // `loading="eager"`: são 18 arquivos de ~1KB e no máximo três aparecem por
      // página. Adiar carrega depois do primeiro quadro e o disco aparece
      // pulando, que é pior do que o custo de carregar junto.
      loading="eager"
    />
  );
}
