"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GUIDE_STEPS, type GuideStep } from "@/lib/guide/steps";
import { GUIDE_START_EVENT } from "@/lib/guide/events";
import { translator, type Locale } from "@/lib/i18n/dictionaries";

/**
 * Tour guiado em camadas: um spotlight escurece a página e recorta o elemento
 * explicado, com uma tooltip de passos por cima.
 *
 * Vive no `Shell` e sobrevive à navegação client-side (mesma posição da árvore),
 * o que permite ao tour iluminar os alvos da rota atual depois que ela assenta —
 * o alvo é procurado por polling até aparecer. O tour nunca navega: o "Guia"
 * do cabeçalho roda só os passos da página em que você está.
 *
 * Sem biblioteca (RFC 7.1 recusa peso por efeito): o spotlight é um retângulo
 * com `box-shadow` gigante, a coreografia é CSS e o JS faz exatamente o que o
 * `PackOpening` faz — decidir o estágio, esperar o alvo e confinar o foco.
 *
 * A entrada é um evento `CustomEvent("gitmon:guide:start")`, disparado pelo
 * "Guia" do cabeçalho com `detail.steps` (os passos da página atual). Não há
 * auto-tour na primeira visita: é uma consulta, não um onboarding (RFC 9.2).
 */

/** Quanto tempo o tour espera um alvo depois de navegar. */
const TARGET_TIMEOUT = 6000;

export function GuideLauncher({ locale }: { locale: Locale }) {
  const t = translator(locale);

  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [tipPos, setTipPos] = useState<{ left: number; top: number } | null>(null);
  const [steps, setSteps] = useState<readonly GuideStep[]>(GUIDE_STEPS);
  const lastFocus = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  const step = steps[index];
  const isLast = index === steps.length - 1;

  const close = useCallback(() => {
    setOpen(false);
    setRect(null);
    // Devolve o foco para onde o tour foi aberto.
    lastFocus.current?.focus();
  }, []);

  const next = useCallback(() => {
    setIndex((i) => {
      if (i >= steps.length - 1) {
        close();
        return i;
      }
      return i + 1;
    });
  }, [close, steps.length]);

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

  // Ancora a tooltip fora do alvo que ela explica: acima se couber, senão
  // abaixo, senão encostada na borda com mais folga. Sem alvo (passo
  // conceitual) devolve `null` e a tooltip volta a centralizar na tela.
  const placeTip = useCallback((r: DOMRect | null): { left: number; top: number } | null => {
    const tip = tipRef.current;
    if (!r || !tip) return null;
    const margin = 16;
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let top: number;
    if (r.top - th - margin >= 8) {
      top = r.top - th - margin;
    } else if (r.bottom + th + margin <= vh - 8) {
      top = r.bottom + margin;
    } else {
      /*
       * Alvo alto demais para caber a tooltip de qualquer um dos lados — no
       * telefone é o caso da carta e do bloco do radar, que sozinhos passam de
       * meia tela.
       *
       * Antes, o último recurso centrava a tooltip **sobre** o alvo: medido a
       * 390px, ela cobria o elemento explicado por inteiro em 3 dos 9 passos,
       * o que anula o tour — a pessoa lê a explicação de uma coisa que não
       * está vendo. Encostar na borda com mais folga também sobrepõe, mas só
       * uma ponta: a outra continua visível dentro do recorte do spotlight.
       */
      const folgaAcima = r.top;
      const folgaAbaixo = vh - r.bottom;
      top = folgaAbaixo >= folgaAcima ? vh - th - 8 : 8;
    }
    const left = Math.max(8, Math.min(vw - tw - 8, r.left + r.width / 2 - tw / 2));
    return { left, top };
  }, []);

  // Entrada pelo "Guia" do cabeçalho: o evento carrega os passos da página.
  useEffect(() => {
    function onStart(event: Event) {
      const detail = (event as CustomEvent<{ steps?: readonly GuideStep[] }>).detail;
      const subset = detail?.steps;
      lastFocus.current = document.activeElement as HTMLElement | null;
      setSteps(subset && subset.length > 0 ? subset : GUIDE_STEPS);
      setRect(null);
      setTipPos(null);
      setIndex(0);
      setOpen(true);
    }
    window.addEventListener(GUIDE_START_EVENT, onStart);
    return () => window.removeEventListener(GUIDE_START_EVENT, onStart);
  }, []);

  // Passo mudou: espera o seletor do alvo aparecer e mede a posição dele.
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const startAt = Date.now();

    const settle = (r: DOMRect | null) => {
      if (cancelled) return;
      setRect(r);
      setTipPos(placeTip(r));
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
        /*
         * Alvo alto vai para o topo da tela, não para o meio.
         *
         * `block: "center"` divide a sobra em duas metades iguais, e quando o
         * alvo é grande nenhuma das duas comporta a tooltip: as duas saídas
         * boas do `placeTip` falham de uma vez e sobra a sobreposição — era o
         * que cobria a carta e o bloco do radar no telefone. Encostando o alvo
         * no topo, a sobra vira um bloco só, embaixo, e aí ela cabe.
         *
         * O corte não é uma fração fixa da tela: é a própria conta que o
         * `placeTip` fará em seguida. Centrado, cada lado recebe `(vh - h) / 2`;
         * se isso não comporta a tooltip mais a margem, centrar já perdeu. Com
         * uma fração fixa o critério erra dos dois lados — sobra alvo médio
         * roçando a tooltip, e alvo alto indo para o topo sem precisar.
         */
        const alvoH = el.getBoundingClientRect().height;
        const tipH = tipRef.current?.offsetHeight ?? 0;
        const cabeCentrado = (window.innerHeight - alvoH) / 2 >= tipH + 24;
        el.scrollIntoView({
          behavior: reduced ? "auto" : "smooth",
          block: cabeCentrado ? "center" : "start",
        });
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
  }, [open, index, step, placeTip]);

  // Re-mede no scroll/resize para o spotlight acompanhar o elemento.
  useEffect(() => {
    if (!open) return;
    function onMove() {
      if (!step.target) return;
      const r = measureOnly(step.target);
      if (r) {
        setRect(r);
        setTipPos(placeTip(r));
      }
    }
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open, step, measureOnly, placeTip]);

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

      <div
        ref={tipRef}
        className="guide-tooltip"
        data-anchored={tipPos ? "" : undefined}
        style={tipPos ? { left: tipPos.left, top: tipPos.top } : undefined}
      >
        <button type="button" className="guide-close" onClick={close} aria-label={t("guide.close")}>
          ×
        </button>
        <p className="guide-progress">
          {t("guide.step", { current: index + 1, total: steps.length })}
        </p>
        <h2>{t(step.titleKey)}</h2>
        <p className="guide-body">{t(step.bodyKey)}</p>
        <div className="guide-actions">
          <button type="button" className="ghost-link" onClick={close}>
            {t("guide.skip")}
          </button>
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
