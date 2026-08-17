"use client";

/**
 * Badge compacto de contador — mostra um label e um número formatado.
 * Usado para exibir stars/forks de repositórios de forma leve, sem a
 * carta inteira.
 */
export function StatBadge({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  const formatted = value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : String(value);

  return (
    <span className={`stat-badge${className ? ` ${className}` : ""}`}>
      <span className="stat-badge-label">{label}</span>
      <span className="stat-badge-value">{formatted}</span>
    </span>
  );
}
