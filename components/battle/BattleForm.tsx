"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import UserSearchInput, { type UserSearchInputHandle } from "../ui/UserSearchInput";

/**
 * Manda para `/<desafiante>/vs/<adversário>`, que sorteia uma batalha nova e
 * redireciona para o resultado. Cada envio dá um resultado diferente — é o ponto
 * da mecânica (RFC 7.3).
 *
 * Com `ygoMode`, um seletor escolhe a versão: em "Yugioh" o envio vai para
 * `/ygo/<desafiante>/vs/<adversário>`, que sorteia um duelo de Speed Duel.
 */
export function BattleForm({
  challenger,
  label,
  placeholder,
  action,
  ygoMode = false,
  modeLabels,
}: {
  challenger: string;
  label: string;
  placeholder: string;
  action: string;
  ygoMode?: boolean;
  modeLabels?: { battle: string; ygo: string };
}) {
  const router = useRouter();
  const [opponent, setOpponent] = useState("");
  const [mode, setMode] = useState<"battle" | "ygo">("battle");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<UserSearchInputHandle>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const resolved = inputRef.current?.resolve(opponent);
    const target = resolved ?? opponent.trim().replace(/^@/, "").replace(/^\/+|\/+$/g, "");
    if (!target) return;
    const path = mode === "ygo" ? `/ygo/${challenger}/vs/${target}` : `/${challenger}/vs/${target}`;
    startTransition(() => router.push(path));
  }

  return (
    <form className="battle-form" onSubmit={submit}>
      <h2>{label}</h2>
      {ygoMode && modeLabels ? (
        <div className="battle-form-modes" role="tablist" aria-label={label}>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "battle"}
            className={mode === "battle" ? "is-active" : undefined}
            onClick={() => setMode("battle")}
          >
            {modeLabels.battle}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "ygo"}
            className={mode === "ygo" ? "is-active" : undefined}
            onClick={() => setMode("ygo")}
          >
            {modeLabels.ygo}
          </button>
        </div>
      ) : null}
      <div className="battle-form-row">
        <UserSearchInput
          ref={inputRef}
          value={opponent}
          onValueChange={setOpponent}
          label={placeholder}
          placeholder={placeholder}
        />
        <button type="submit" disabled={pending}>
          {action}
        </button>
      </div>
    </form>
  );
}
