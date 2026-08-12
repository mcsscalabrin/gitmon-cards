import type { Metadata } from "next";
import { absoluteUrl } from "./config";
import { translator, type Locale } from "./i18n/dictionaries";

/**
 * Metadados de prévia de link das páginas de carta.
 *
 * Existe compartilhado porque perfil e repositório precisam ser idênticos nisto,
 * e duas cópias de tags de OG divergem em silêncio: nada quebra, nada avisa, e
 * meio ano depois um dos dois compartilha diferente do outro.
 *
 * A imagem é a prévia em paisagem (`/api/card-og/…`), **não** o `/<id>.png` da
 * carta. Ver o comentário de `lib/og/renderCardOg.tsx` — a carta é 5:7 e as
 * prévias são 1.91:1, e o corte come exatamente o cabeçalho e o rodapé.
 *
 * `width` e `height` são declarados porque sem eles o scraper precisa baixar a
 * imagem para descobrir a proporção, e alguns desistem antes disso e caem no
 * cartão pequeno.
 */
export function cardMetadata({
  subject,
  path,
  ogPath,
  locale,
}: {
  /** Nome exibido: `owner` ou `owner/repo`. */
  subject: string;
  /** Caminho canônico da página. */
  path: string;
  /** Caminho da rota de prévia em paisagem. */
  ogPath: string;
  locale: Locale;
}): Metadata {
  const t = translator(locale);
  const description = t("card.metaDescription", { subject });
  const url = absoluteUrl(path);
  const images = [{ url: absoluteUrl(ogPath), width: 1200, height: 630, alt: subject }];

  return {
    title: subject,
    description,
    alternates: { canonical: url },
    openGraph: { type: "article", url, title: subject, description, images },
    twitter: { card: "summary_large_image", title: subject, description, images },
  };
}
