"use client";

import { useEffect, useRef, useState } from "react";
import { GUIDE_START_EVENT } from "@/lib/guide/events";
import type { GuideStep } from "@/lib/guide/steps";

type Placement = "top" | "bottom";
type Align = "left" | "center" | "right";

/**
 * O "?" que explica a respectiva seção numa bolha curta — a ajuda por aba que
 * não exige o tour completo. Leve de propósito: abre no clique, fecha no clique
 * fora ou no Escape, e não navega.
 *
 * O conteúdo vem pronto (título + corpo): quem chama resolve as chaves de i18n,
 * então o componente não conhece o domínio nem o idioma.
 *
 * Quando `steps` aponta os passos da seção, a bolha ganha o "Passo a passo":
 * um mini-tour que guia só por aquela aba, sem arrastar o tour universal.
 */
export function HelpButton({
  title,
  body,
  label,
  placement = "bottom",
  align = "left",
  className,
  steps,
  stepByStepLabel,
}: {
  title: string;
  body: string;
  /** Nome acessível do botão, ex.: "O que é esta seção?". */
  label: string;
  placement?: Placement;
  align?: Align;
  className?: string;
  /** Passos do mini-tour desta seção; quando presente, a bolha ganha o botão. */
  steps?: readonly GuideStep[];
  /** Rótulo do botão que inicia o mini-tour, ex.: "Passo a passo". */
  stepByStepLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (anchorRef.current && !anchorRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function startTour() {
    // Devolve o foco ao "?" quando o tour fechar: quem o tour lembra é quem
    // estava focado no instante do disparo.
    triggerRef.current?.focus();
    window.dispatchEvent(new CustomEvent(GUIDE_START_EVENT, { detail: { steps } }));
    setOpen(false);
  }

  const hasSteps = steps !== undefined && steps.length > 0 && stepByStepLabel !== undefined;
  const anchorClass = className ? `help-anchor ${className}` : "help-anchor";

  return (
    <span ref={anchorRef} className={anchorClass}>
      <button
        ref={triggerRef}
        type="button"
        className="help-trigger"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={label}
        onClick={() => setOpen((prev) => !prev)}
      >
        ?
      </button>
      {open ? (
        <span
          className="help-popover"
          role="group"
          aria-label={title}
          data-placement={placement}
          data-align={align}
        >
          <strong>{title}</strong>
          <span>{body}</span>
          {hasSteps ? (
            <button type="button" className="help-start" onClick={startTour}>
              {stepByStepLabel}
            </button>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
