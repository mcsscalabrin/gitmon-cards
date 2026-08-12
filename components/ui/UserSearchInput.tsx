"use client";

import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import type { UserSearchHit } from "@/lib/github/search";

// Same grammar as lib/github/client.ts: alphanumerics + hyphens, 1–39 chars, at
// least one alphanumeric. A username-shaped query skips the debounced search
// (it's already a login); anything else is treated as a name and searched.
const USERNAME_RE = /^(?=.*[a-z\d])[a-z\d-]{1,39}$/i;

const AVATAR_FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="%23e8dfcd"/><circle cx="32" cy="26" r="12" fill="%23cfc4a8"/><rect x="14" y="44" width="36" height="28" rx="14" fill="%23cfc4a8"/></svg>',
  );

export interface UserSearchInputHandle {
  /** Resolve a raw value to a login: usernames pass through as-is, real names
   *  resolve via the last search round (first hit). Null when unresolvable —
   *  the caller keeps the raw value and lets the route 404. */
  resolve: (value: string) => string | null;
}

// Reusable "username or name" field with debounced by-name suggestions. Used by
// the home scout form's sibling flows (compat picker) so name search works
// everywhere. The field is controlled; suggestions resolve into `value` as the
// chosen login.
const UserSearchInput = forwardRef<UserSearchInputHandle, {
  value: string;
  onValueChange: (v: string) => void;
  label: string;
  placeholder: string;
}>(function UserSearchInput({ value, onValueChange, label, placeholder }, ref) {
  const [open, setOpen] = useState(false);
  // Latest search round, tagged with the query it was run for. Render derives
  // "show suggestions" from results.q === current query, so a keystroke that
  // leaves the round stale never shows it — no sync clears needed.
  const [results, setResults] = useState<{ q: string; hits: UserSearchHit[]; searching: boolean }>({
    q: "",
    hits: [],
    searching: false,
  });
  const resultsRef = useRef(results);
  resultsRef.current = results;
  const wrapRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const q = value.trim().replace(/^@/, "");
  const matching = results.q === q && q.length >= 2 && !USERNAME_RE.test(q);

  useImperativeHandle(ref, () => ({
    resolve: (raw: string) => {
      const v = raw.trim().replace(/^@/, "");
      if (!v) return null;
      if (USERNAME_RE.test(v)) return v;
      const round = resultsRef.current;
      return round.q === v && round.hits[0] ? round.hits[0].login : null;
    },
  }));

  // Debounced by-name search: fires only while the input is focused and holds a
  // non-username-shaped query.
  useEffect(() => {
    if (q.length < 2 || USERNAME_RE.test(q)) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setResults((prev) => ({ ...prev, searching: true }));
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { hits?: UserSearchHit[] };
        if (!cancelled) setResults({ q, hits: data.hits ?? [], searching: false });
      } catch {
        if (!cancelled) setResults({ q, hits: [], searching: false });
      }
    }, 260);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);

  const showList = open && (results.searching || (matching && results.hits.length > 0));

  return (
    <div
      ref={wrapRef}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
      className="search-input-wrap"
    >
      <span className="search-input-at">@</span>
      <input
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-label={label}
        className="search-input"
      />
      {showList && (
        <ul
          id={listboxId}
          role="listbox"
          className="search-dropdown"
        >
          {results.searching && results.hits.length === 0 && (
            <li className="search-dropdown-status">
              searching names…
            </li>
          )}
          {results.hits.map((s) => (
            <li key={s.login}>
              <button
                type="button"
                role="option"
                aria-selected
                onMouseDown={(e) => {
                  e.preventDefault();
                  onValueChange(s.login);
                  setOpen(false);
                }}
                className="search-dropdown-item"
              >
                <img
                  src={s.avatarUrl ?? AVATAR_FALLBACK}
                  alt=""
                  aria-hidden
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = AVATAR_FALLBACK;
                  }}
                  className="search-dropdown-avatar"
                />
                <span className="search-dropdown-text">
                  <span className="search-dropdown-name">
                    {s.name ?? s.login}
                  </span>
                  <span className="search-dropdown-login">
                    @{s.login}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

export default UserSearchInput;
