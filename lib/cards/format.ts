/** Utilitários numéricos e de texto usados pelas fórmulas de scoring. */

/**
 * `1234` → `1.2k`. Compacto porque o espaço é apertado nos dois lugares onde
 * aparece: o rodapé da carta e o contador da faixa de apoio. Não usa
 * `toLocaleString` de propósito — o sufixo precisa ser o mesmo nos dois idiomas
 * para a largura não mudar entre PT e EN.
 */
export function formatCount(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** HP sempre em dezenas, como em carta de verdade (RFC 6.1). */
export function roundToTen(value: number): number {
  return Math.round(value / 10) * 10;
}

export function yearsSince(iso: string, now: Date = new Date()): number {
  const start = new Date(iso).getTime();
  if (Number.isNaN(start)) return 0;
  const years = (now.getTime() - start) / (365.25 * 24 * 60 * 60 * 1000);
  return Math.max(0, years);
}

export function daysSince(iso: string | null, now: Date = new Date()): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const start = new Date(iso).getTime();
  if (Number.isNaN(start)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (now.getTime() - start) / (24 * 60 * 60 * 1000));
}

export function year(iso: string): number {
  return new Date(iso).getUTCFullYear();
}

/**
 * Trunca sem cortar palavra no meio quando dá, e usa reticências de um caractere
 * só (não três pontos) para não roubar espaço na linha.
 */
export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const body = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${body.trimEnd()}…`;
}

/**
 * Dano sempre em dezenas.
 *
 * Presentacional, não estrutural: a fórmula da RFC 6.1 (`estrelas×4`) continua
 * inteira — mesma curva, mesmo teto —, só o número impresso é arredondado. Carta
 * de TCG não tem ataque de 84 de dano, e fidelidade visual é objetivo declarado
 * do projeto (RFC 5).
 */
export function roundDamage(value: number): number {
  return Math.max(10, Math.round(value / 10) * 10);
}

/**
 * Custo de energia derivado do dano. Ataque forte custa caro — é o que impede a
 * carta de virar só "quem tem mais estrela ganha" quando o custo passar a
 * importar em variantes futuras da batalha.
 */
export function costForDamage(damage: number): number {
  if (damage <= 50) return 1;
  if (damage <= 120) return 2;
  if (damage <= 220) return 3;
  return 4;
}
