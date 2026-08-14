import type { Metadata } from "next";
import { baseUrl } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl()),
  title: {
    default: "Gitmon Cards",
    template: "%s — Gitmon Cards",
  },
  description:
    "Cartas de trading card game geradas a partir de dados reais do GitHub. Uma URL de imagem, sem login, embutível em qualquer README.",
  /*
    Um desenho só para a marca, em `public/assets/brand/`. O favicon aponta para
    o mesmo arquivo que o `mask-image` de `.brand-mark` consome, então aba e
    cabeçalho não podem divergir. O `app/icon.svg` da convenção do Next saiu
    junto: dois arquivos para o mesmo símbolo é onde a divergência nasce.
  */
  icons: {
    icon: "/assets/brand/gitmon-mark.svg",
  },
  openGraph: {
    type: "website",
    siteName: "Gitmon Cards",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        {/*
          A face da carta é usada no primeiro texto visível de toda página — a
          marca no topo e o título logo abaixo. Sem o preload ela só é descoberta
          depois que o CSS é baixado e casado, e o `swap` troca a fonte com a
          página já lida. São 28 KB, o custo que a decisão do revamp aceitou.
        */}
        {["Bold", "Black"].map((weight) => (
          <link
            key={weight}
            rel="preload"
            as="font"
            type="font/woff2"
            href={`/assets/fonts/Rounded-${weight}.woff2`}
            crossOrigin="anonymous"
          />
        ))}
      </head>
      <body>{children}</body>
    </html>
  );
}
