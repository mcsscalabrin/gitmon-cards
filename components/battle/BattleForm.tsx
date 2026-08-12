"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import UserSearchInput, { type UserSearchInputHandle } from "../ui/UserSearchInput";

/**
 * Manda para `/<desafiante>/vs/<adversário>`, que sorteia uma batalha nova e
 * redireciona para o resultado. Cada envio dá um resultado diferente — é o ponto
 * da mecânica (RFC 7.3).
 */
export function BattleForm({
  challenger,
  label,
  placeholder,
  action,
}: {
  challenger: string;
  label: string;
  placeholder: string;
  action: string;
}) {
  const router = useRouter();
  const [opponent, setOpponent] = useState("");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<UserSearchInputHandle>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const resolved = inputRef.current?.resolve(opponent);
    const target = resolved ?? opponent.trim().replace(/^@/, "").replace(/^\/+|\/+$/g, "");
    if (!target) return;
    startTransition(() => router.push(`/${challenger}/vs/${target}`));
  }

  return (
    <form className="battle-form" onSubmit={submit}>
      <h2>{label}</h2>
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
