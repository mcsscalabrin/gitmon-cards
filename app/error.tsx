"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="shell">
      <main className="shell-main">
        <div className="error-state">
          <h1>A API do GitHub não respondeu.</h1>
          <p className="error-subject">{error.message}</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="button" type="button" onClick={reset}>
              Tentar de novo
            </button>
            <Link className="button" href="/" style={{ background: "var(--bg-raised)", color: "var(--text)", border: "1px solid var(--border)" }}>
              Gitmon
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
