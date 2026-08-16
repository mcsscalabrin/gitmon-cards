"use client";

import { useEffect, useRef, useState } from "react";

type Placement = "top" | "bottom";
type Align = "left" | "center" | "right";

/**
 * O "?" que explica a respectiva seção numa bolha curta — a ajuda por aba que
 * não exige o tour completo. Leve de propósito: abre no clique, fecha no clique
 * fora ou no Escape, e não navega.
 *
 * O conteúdo vem pronto (título + corpo): quem chama resolve as chaves de i18n,
 * então o componente não conhece o domínio nem o idioma.
 */
export function HelpButton({
  title,
  body,
  label,
  placement = "bottom",
  align = "left",
  className,
}: {
  title: string;
  body: string;
  /** Nome acessível do botão, ex.: "O que é esta seção?". */
  label: string;
  placement?: Placement;
  align?: Align;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);

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

  const anchorClass = className ? `help-anchor ${className}` : "help-anchor";

  return (
    <span ref={anchorRef} className={anchorClass}>
      <button
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
          role="tooltip"
          data-placement={placement}
          data-align={align}
        >
          <strong>{title}</strong>
          <span>{body}</span>
        </span>
      ) : null}
    </span>
  );
}
