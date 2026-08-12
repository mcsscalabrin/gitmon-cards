import type { MetadataRoute } from "next";
import { baseUrl } from "@/lib/config";

/**
 * Sitemap estático. As páginas de perfil (`/<owner>` e `/<owner>/<repo>`) são
 * dinâmicas e não entram aqui — o Google descobre pelo crawl. Este arquivo
 * garante que a home e as páginas de batalha indexem corretamente.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = baseUrl();

  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
