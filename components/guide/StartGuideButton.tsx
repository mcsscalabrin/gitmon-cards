"use client";

import { GUIDE_START_EVENT } from "./GuideLauncher";

/** Botão da /docs que inicia o tour. O overlay escuta o evento globalmente. */
export function StartGuideButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="button"
      onClick={() => window.dispatchEvent(new CustomEvent(GUIDE_START_EVENT))}
    >
      {label}
    </button>
  );
}
