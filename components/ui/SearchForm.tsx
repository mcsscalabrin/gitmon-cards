"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import UserSearchInput, { type UserSearchInputHandle } from "./UserSearchInput";

/**
 * Busca por usuário ou `owner/repo`. Aceita URL do GitHub colada inteira, porque
 * é o que a pessoa tem na mão quando chega aqui. Usa UserSearchInput para
 * sugestões de nome em tempo real.
 */
export function SearchForm({
  placeholder,
  action,
}: {
  placeholder: string;
  action: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const inputRef = useRef<UserSearchInputHandle>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const resolved = inputRef.current?.resolve(value);
    const target = resolved ?? normalize(value);
    if (target) router.push(`/${target}`);
  }

  return (
    <form className="search-form" onSubmit={submit}>
      <UserSearchInput
        ref={inputRef}
        value={value}
        onValueChange={setValue}
        label={placeholder}
        placeholder={placeholder}
      />
      <button type="submit">{action}</button>
    </form>
  );
}

/** `https://github.com/facebook/react` e `@torvalds` chegam ao mesmo lugar. */
function normalize(raw: string): string | null {
  const trimmed = raw
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    .replace(/^@/, "")
    .replace(/^\/+|\/+$/g, "");

  if (!trimmed) return null;

  const parts = trimmed.split("/").filter(Boolean).slice(0, 2);
  return parts.join("/");
}
