import Link from "next/link";
import { TiltCard } from "@/components/card/TiltCard";
import { SearchForm } from "@/components/ui/SearchForm";
import { Shell } from "@/components/ui/Shell";
import { translator } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { oauthEnabled } from "@/lib/github/oauth";

/**
 * Cartas de exemplo aparecem de cara, antes de qualquer texto explicativo — quem
 * nunca ouviu falar do projeto precisa entender o conceito olhando, não lendo
 * (RFC 9.4). Deliberadamente diferente do gitfut, que abre com busca vazia.
 *
 * São usuários reais e fixos: as cartas se atualizam sozinhas, como qualquer
 * outra, então a home nunca mostra dado velho.
 */
const SAMPLES = ["torvalds", "sindresorhus", "facebook/react"];

export default async function HomePage() {
  const locale = await getLocale();
  const t = translator(locale);

  const showOAuth = oauthEnabled();

  return (
    <Shell locale={locale} landing>
      <section className="hero">
        <h1>{t("home.tagline")}</h1>
        <p>{t("home.description")}</p>
        <SearchForm placeholder={t("home.search")} action={t("home.searchAction")} />
        {showOAuth ? (
          <Link href="/api/auth/login" prefetch={false} className="oauth-link">
            <svg className="oauth-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            {t("home.rateSelf")}
          </Link>
        ) : null}
      </section>

      <section className="samples" aria-label={t("home.samples")}>
        {SAMPLES.map((id, index) => (
          <Link key={id} href={`/${id}`} className="sample">
            <TiltCard src={`/${id}.png`} alt={id} priority={index === 0} />
            <span>{id}</span>
          </Link>
        ))}
      </section>
    </Shell>
  );
}
