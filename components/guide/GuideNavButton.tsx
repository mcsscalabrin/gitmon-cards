"use client";

import { usePathname } from "next/navigation";
import { GUIDE_START_EVENT } from "@/lib/guide/events";
import { stepsForPath } from "@/lib/guide/pages";

/**
 * O "Guia" do cabeçalho. Clicar inicia o tour da página atual — a rota resolve
 * os passos cujos alvos existem nela, sem navegar para uma página de guia.
 */
export function GuideNavButton({ label }: { label: string }) {
  const pathname = usePathname();

  return (
    <button
      type="button"
      className="ghost-link"
      onClick={() =>
        window.dispatchEvent(
          new CustomEvent(GUIDE_START_EVENT, { detail: { steps: stepsForPath(pathname ?? "") } }),
        )
      }
    >
      {label}
    </button>
  );
}
