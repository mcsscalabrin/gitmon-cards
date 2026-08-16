"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GUIDE_STEPS } from "@/lib/guide/steps";
import { translator, type Locale } from "@/lib/i18n/dictionaries";

/**
 * Tour guiado em camadas: um spotlight escurece a página e recorta o elemento
 * explicado, com uma tooltip de passos por cima.
 *
 * Vive no `Shell` e sobrevive à navegação client-side (mesma posição da árvore),
 * o que permite ao tour navegar até a página onde cada alvo mora e iluminá-lo
 * depois que a rota assenta — o alvo é procurado por polling até aparecer.
 *
 * Sem biblioteca (RFC 7.1 recusa peso por efeito): o spotlight é um retângulo
 * com `box-shadow` gigante, a coreografia é CSS e o JS faz exatamente o que o
 * `PackOpening` faz — decidir o estágio, esperar o alvo e confinar o foco.
 *
 * A entrada é um evento `CustomEvent("gitmon:guide:start")`, disparado pelo
 * botão da /docs. Não há auto-tour na primeira visita: é uma consulta, não um
 * onboarding (RFC 9.2).
 */

/** Constante compartilhada com `StartGuideButton` da /docs. */
export const GUIDE_START_EVENT = "gitmon:guide:start";

/** Quanto tempo o tour espera um alvo depois de navegar. */
const TARGET_TIMEOUT = 6000;

export function GuideLauncher({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const step = GUIDE_STEPS[index];
  const isLast = index === GUIDE_STEPS.length - 1;

  const close = useCallback(() => {
    setOpen(false);
    setRect(null);
    // Devolve o foco para onde o tour foi aberto.
    lastFocus.current?.focus();
  }, []);

  const next = useCallback(() => {
    setIndex((i) => {
      if (i >= GUIDE_STEPS.length - 1) {
        close();
        return i;
      }
      return i + 1;
    });
  }, [close]);

  const back = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  // Mede o alvo sem rolar — usado no scroll/resize para o spotlight colar.
  const measureOnly = useCallback((target: string | undefined): DOMRect | null => {
    if (!target) return null;
    const el = document.querySelector(target);
    if (!(el instanceof HTMLElement)) return null;
    return el.getBoundingClientRect();
  }, []);

  // Entrada pelo botão da /docs.
  useEffect(() => {
    function onStart() {
      lastFocus.current = document.activeElement as HTMLElement | null;
      setRect(null);
      setIndex(0);
      setOpen(true);
    }
    window.addEventListener(GUIDE_START_EVENT, onStart);
    return () => window.removeEventListener(GUIDE_START_EVENT, onStart);
  }, []);

  // Passo mudou: navega para a rota do alvo (se preciso) e espera o seletor.
  useEffect(() => {
    if (!open) return;

    if (step.to && !window.location.href.includes(step.to)) {
      router.push(step.to);
    }

    let cancelled = false;
    const startAt = Date.now();

    const settle = (r: DOMRect | null) => {
      if (cancelled) return;
      setRect(r);
      dialogRef.current?.focus();
    };

    const poll = () => {
      if (cancelled) return;
      if (!step.target) {
        settle(null);
        return;
      }
      const el = document.querySelector(step.target);
      if (el instanceof HTMLElement) {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
        requestAnimationFrame(() => settle(el.getBoundingClientRect()));
      } else if (Date.now() - startAt < TARGET_TIMEOUT) {
        requestAnimationFrame(poll);
      } else {
        // Alvo nunca apareceu (ex.: rota caiu num erro): segue com tooltip
        // central, sem spotlight, em vez de travar o tour.
        settle(null);
      }
    };
    poll();

    return () => {
      cancelled = true;
    };
  }, [open, index, step, router]);

  // Re-mede no scroll/resize para o spotlight acompanhar o elemento.
  useEffect(() => {
    if (!open) return;
    function onMove() {
      if (!step.target) return;
      const r = measureOnly(step.target);
      if (r) setRect(r);
    }
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open, step, measureOnly]);

  // Teclado global do tour: Escape fecha, setas navegam.
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        back();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close, next, back]);

  // Foco inicial ao abrir.
  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="guide-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t("docs.nav")}
      tabIndex={-1}
      ref={dialogRef}
      onKeyDown={trapFocus}
    >
      {/*
        Com spotlight, quem escurece é o `box-shadow` dele (o furo fica limpo);
        sem alvo, o dim cobre a página inteira. Os dois juntos escureceriam
        duas vezes.
      */}
      {rect ? null : <div className="guide-dim" aria-hidden="true" />}

      {rect ? (
        <div
          className="guide-spotlight"
          aria-hidden="true"
          style={{
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          }}
        />
      ) : null}

      <div className="guide-tooltip">
        <button type="button" className="guide-close" onClick={close} aria-label={t("guide.close")}>
          ×
        </button>
        <p className="guide-progress">
          {t("guide.step", { current: index + 1, total: GUIDE_STEPS.length })}
        </p>
        <h2>{t(step.titleKey)}</h2>
        <p className="guide-body">{t(step.bodyKey)}</p>
        <div className="guide-actions">
          <button type="button" className="ghost-link" onClick={back} disabled={index === 0}>
            {t("guide.back")}
          </button>
          <button type="button" className="button" onClick={isLast ? close : next}>
            {isLast ? t("guide.done") : t("guide.next")}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Confina o Tab dentro da tooltip; `aria-modal` promete que o resto não existe. */
function trapFocus(event: React.KeyboardEvent<HTMLDivElement>) {
  if (event.key !== "Tab") return;
  const root = event.currentTarget;
  const items = Array.from(
    root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    ),
  );
  if (items.length === 0) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
