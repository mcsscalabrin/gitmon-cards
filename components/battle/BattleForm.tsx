"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import UserSearchInput, { type UserSearchInputHandle } from "../ui/UserSearchInput";
import { HelpButton } from "../ui/HelpButton";
import type { GuideStep } from "@/lib/guide/steps";

/**
 * Manda para `/<desafiante>/vs/<adversário>`, que sorteia uma batalha nova e
 * redireciona para o resultado. Cada envio dá um resultado diferente — é o ponto
 * da mecânica (RFC 7.3).
 *
 * Com `ygoMode`, um seletor escolhe a versão: em "Yugioh" o envio vai para
 * `/ygo/<desafiante>/vs/<adversário>`, que sorteia um duelo de Speed Duel.
 */
/**
 * Ajuda por seção ("?"): bolha que explica o formulário sem o tour completo.
 * O conteúdo chega pronto de quem chama (que resolve as chaves de i18n), junto
 * com os passos do mini-tour da seção.
 */
type HelpContent = {
  title: string;
  body: string;
  label: string;
  steps?: readonly GuideStep[];
  stepByStepLabel?: string;
};

export function BattleForm({
  challenger,
  label,
  placeholder,
  action,
  ygoMode = false,
  modeLabels,
  help,
  helpModes,
}: {
  challenger: string;
  label: string;
  placeholder: string;
  action: string;
  ygoMode?: boolean;
  modeLabels?: { battle: string; ygo: string };
  help?: HelpContent;
  /** Ajuda do seletor de modos Batalha/Speed Duel, quando `ygoMode`. */
  helpModes?: HelpContent;
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
      <div className="battle-form-heading">
        <h2>{label}</h2>
        {help ? <HelpButton {...help} /> : null}
      </div>
      {ygoMode && modeLabels ? (
        <div className="battle-form-modes-row">
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
          {helpModes ? <HelpButton {...helpModes} /> : null}
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
