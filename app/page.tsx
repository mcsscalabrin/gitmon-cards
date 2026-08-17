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
