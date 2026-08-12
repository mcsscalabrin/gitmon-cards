import Link from "next/link";
import { Shell } from "@/components/ui/Shell";
import { translator } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";

export default async function NotFound() {
  const locale = await getLocale();
  const t = translator(locale);

  return (
    <Shell locale={locale}>
      <div className="error-state">
        <h1>{t("error.not_found")}</h1>
        <Link className="button" href="/">
          Gitmon
        </Link>
      </div>
    </Shell>
  );
}
