import Link from "next/link";
import { AUTHORS, PROJECT_REPO_URL } from "@/lib/config";
import { translator, type Locale } from "@/lib/i18n/dictionaries";
import { getProjectStars } from "@/lib/project";
import { LocaleToggle } from "./LocaleToggle";
import { SupportBand } from "./SupportBand";

/**
 * Cabeçalho e rodapé do site.
 *
 * O patrocínio aparece **só aqui**, nunca na imagem exportada (RFC 9.6): o que
 * viaja para dentro do README de outra pessoa fica limpo. A marca pessoal é
 * discreta, um crédito no rodapé — o produto tem identidade própria (RFC 9.3).
 */
export async function Shell({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const t = translator(locale);
  const stars = await getProjectStars();

  return (
    <div className="shell">
      <header className="shell-header">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">Gitmon</span>
        </Link>
        <div className="shell-actions">
          <a
            className="ghost-link"
            href={PROJECT_REPO_URL}
            target="_blank"
            rel="noreferrer noopener"
          >
            {t("home.viewOnGitHub")}
          </a>
          <LocaleToggle locale={locale} />
        </div>
      </header>

      <main className="shell-main">{children}</main>

      <SupportBand locale={locale} stars={stars} />

      {/*
        O sponsor saiu daqui e foi para a faixa acima: no rodapé ele era um link
        de texto, ignorável por construção. O crédito ao autor fica — é atribuição,
        não chamada para ação, e o lugar dele é discreto mesmo (RFC 9.3).
      */}
      <footer className="shell-footer">
        <span>
          {t("home.madeBy")}{" "}
          {/*
            Separador entre os dois e nenhum depois do último. Com `join` de
            string a vírgula viraria texto dentro do link; aqui ela fica fora,
            que é o que deixa o alvo de clique ser só o handle.
          */}
          {AUTHORS.map((author, i) => (
            <span key={author.url}>
              {i > 0 && <span aria-hidden="true"> · </span>}
              <a href={author.url} target="_blank" rel="noreferrer noopener">
                {author.handle}
              </a>
            </span>
          ))}
        </span>
      </footer>
    </div>
  );
}
