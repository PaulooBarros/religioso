const DAY = 24 * 60 * 60 * 1000;

function dayNumber(d: Date): number {
  // Calendar day in Brazil, so "ontem" flips at local midnight.
  const [y, m, day] = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" })
    .format(d)
    .split("-")
    .map(Number);
  return Date.UTC(y, m - 1, day) / DAY;
}

/** "hoje", "ontem", "há 3 dias", "há 2 semanas", "12 de março". */
export function relativeDay(iso: string, now = new Date()): string {
  const diff = dayNumber(now) - dayNumber(new Date(iso));
  if (diff <= 0) return "hoje";
  if (diff === 1) return "ontem";
  if (diff < 7) return `há ${diff} dias`;
  if (diff < 35) {
    const w = Math.floor(diff / 7);
    return w === 1 ? "há 1 semana" : `há ${w} semanas`;
  }
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }).format(
    new Date(iso),
  );
}
