"use client";

import { useEffect, useRef, useState } from "react";
import { translator, type Locale } from "@/lib/i18n/dictionaries";

/**
 * Abertura de pacote: a carta chega dentro de uma embalagem lacrada que o
 * visitante rasga.
 *
 * **Toca em toda visita, sem estado por visitante** (RFC 7.2), igual à animação
 * de revelação que já existia. Quem consulta vários perfis seguidos vai ver o
 * pacote toda vez — por isso o botão de pular é obrigatório e visível desde o
 * primeiro quadro, não um enfeite escondido.
 *
 * Tudo em CSS: `clip-path` para a aresta serrilhada, `transform` para o
 * movimento. Nenhuma biblioteca de animação — o projeto não tem nenhuma, e o
 * gesto não justifica a primeira (a RFC 7.1 já recusou peso por efeito).
 *
 * O JS aqui faz três coisas e só: guardar em que estágio está, ouvir o fim da
 * animação para desmontar, e devolver o foco. A coreografia inteira é CSS.
 */

type Stage = "sealed" | "opening";

export function PackOpening({ name, locale }: { name: string; locale: Locale }) {
  const t = translator(locale);
  const [stage, setStage] = useState<Stage>("sealed");
  const [dismissed, setDismissed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const tearRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef<Element | null>(null);

  useEffect(() => {
    restoreFocus.current = document.activeElement;
    tearRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!dismissed) return;
    // Devolve o foco para onde ele estava, senão quem navega por teclado é
    // largado no topo do documento depois da animação.
    const target = restoreFocus.current;
    if (target instanceof HTMLElement) target.focus();
  }, [dismissed]);

  /*
   * Confinamento de foco.
   *
   * `aria-modal="true"` promete ao leitor de tela que nada fora do diálogo
   * existe. Sem isto o Tab escapa para a página atrás, que está visualmente
   * coberta pelo overlay — quem navega por teclado ficaria interagindo às cegas
   * com elementos que não consegue ver. A promessa do atributo tem que valer no
   * DOM.
   */
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDismissed(true);
        return;
      }
      if (event.key !== "Tab") return;

      const root = rootRef.current;
      if (!root) return;

      // Só os habilitados: o botão de rasgar some da ordem depois do clique.
      const focusables = root.querySelectorAll<HTMLElement>("button:not([disabled])");
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      const outside = !(active instanceof Node) || !root.contains(active);

      if (event.shiftKey && (active === first || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (dismissed) return null;

  return (
    <div
      ref={rootRef}
      className="pack"
      data-stage={stage}
      role="dialog"
      aria-modal="true"
      aria-label={t("pack.label", { name })}
      /*
       * A última etapa da coreografia avisa que terminou. Sob
       * `prefers-reduced-motion` o globals.css zera as durações, então isto
       * dispara quase imediatamente e o overlay some sem movimento nenhum —
       * que é o comportamento certo, não um caso degradado.
       */
      onAnimationEnd={(event) => {
        if (event.animationName === "pack-finish") setDismissed(true);
      }}
    >
      <div className="pack-stage">
        <button
          ref={tearRef}
          type="button"
          className="pack-wrapper"
          onClick={() => setStage("opening")}
          disabled={stage === "opening"}
          aria-label={t("pack.tear")}
        >
          {/*
            A respiração de espera vive aqui dentro, e não no botão: um alvo de
            clique em movimento permanente nunca "assenta" — o Playwright se
            recusa a clicar nele, e a mesma instabilidade atrapalha quem tem
            dificuldade motora. O que se mexe é o desenho; a área clicável fica
            parada.
          */}
          <span className="pack-float" aria-hidden="true">
            <span className="pack-strip" />
            <span className="pack-body">
              <span className="pack-mark" />
              <span className="pack-brand">{t("pack.brand")}</span>
            </span>
            <span className="pack-glow" />
          </span>
        </button>

        <span className="pack-hint" aria-hidden="true">
          {t("pack.tear")}
        </span>
      </div>

      <button type="button" className="pack-skip" onClick={() => setDismissed(true)}>
        {t("pack.skip")}
      </button>
    </div>
  );
}
