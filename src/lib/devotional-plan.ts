/** Devotional templates and schedule. Pure: shared by server, client and tests. */

export type DevotionalBlock = { id: string; title: string; text: string };

export type DevotionalTemplateId = "completo" | "soap" | "livre";

export type DevotionalTemplate = {
  id: DevotionalTemplateId;
  name: string;
  summary: string;
  blocks: { title: string; hint: string }[];
};

const PRAYER = { title: "Oração", hint: "Uma oração curta que nasce do texto." };

export const DEVOTIONAL_TEMPLATES: DevotionalTemplate[] = [
  {
    id: "completo",
    name: "Observação, reflexão, aplicação e oração",
    summary: "Quatro passos curtos depois da passagem.",
    blocks: [
      { title: "Observação", hint: "O que o texto diz: quem fala, a quem, o que se repete, o que chama atenção." },
      { title: "Reflexão", hint: "O que o texto ensina sobre Deus e sobre nós." },
      { title: "Aplicação", hint: "Um passo concreto para hoje." },
      PRAYER,
    ],
  },
  {
    id: "soap",
    name: "SOAP",
    summary: "Escritura (a passagem), observação, aplicação e oração.",
    blocks: [
      { title: "Observação", hint: "O que o texto diz, com as suas palavras." },
      { title: "Aplicação", hint: "Como isso alcança a sua vida hoje." },
      PRAYER,
    ],
  },
  {
    id: "livre",
    name: "Texto livre",
    summary: "Um texto só, sem divisões.",
    blocks: [{ title: "Texto", hint: "Escreva o devocional do dia." }],
  },
];

export function devotionalTemplate(id: string): DevotionalTemplate {
  return DEVOTIONAL_TEMPLATES.find((t) => t.id === id) ?? DEVOTIONAL_TEMPLATES[0];
}

export function isDevotionalTemplate(id: string): id is DevotionalTemplateId {
  return DEVOTIONAL_TEMPLATES.some((t) => t.id === id);
}

export function devotionalBlocks(id: DevotionalTemplateId, makeId: () => string): DevotionalBlock[] {
  return devotionalTemplate(id).blocks.map((b) => ({ id: makeId(), title: b.title, text: "" }));
}

export const MAX_DAYS = 60;
const MAX_BLOCKS = 8;
const MAX_TEXT = 10_000;

export function parseDevotionalBlocks(value: unknown): DevotionalBlock[] | null {
  if (!Array.isArray(value) || value.length > MAX_BLOCKS) return null;
  const out: DevotionalBlock[] = [];
  const seen = new Set<string>();
  for (const v of value) {
    if (!v || typeof v !== "object") return null;
    const { id, title, text } = v as Record<string, unknown>;
    if (typeof id !== "string" || !id || id.length > 64 || seen.has(id)) return null;
    if (typeof title !== "string" || typeof text !== "string" || text.length > MAX_TEXT) return null;
    seen.add(id);
    out.push({ id, title: title.trim().slice(0, 80) || "Texto", text });
  }
  return out;
}

export const isWritten = (blocks: DevotionalBlock[]) => blocks.some((b) => b.text.trim());

// ---------- Schedule ----------

export type SeriesStatus = "draft" | "active" | "paused" | "done" | "archived";

export const STATUS_LABEL: Record<SeriesStatus, string> = {
  draft: "Rascunho",
  active: "Ativa",
  paused: "Pausada",
  done: "Concluída",
  archived: "Arquivada",
};

export const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"] as const;
export const WEEKDAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"] as const;

/** Dates are "YYYY-MM-DD" strings; arithmetic is done in UTC so it never drifts. */
const toDate = (day: string) => new Date(`${day}T00:00:00Z`);
const toDay = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(day: string, n: number): string {
  const d = toDate(day);
  d.setUTCDate(d.getUTCDate() + n);
  return toDay(d);
}

export const weekdayOf = (day: string) => toDate(day).getUTCDay();

export function cleanWeekdays(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const days = [...new Set(value.map(Number))].filter((n) => Number.isInteger(n) && n >= 0 && n <= 6).sort((a, b) => a - b);
  return days.length ? days : null;
}

/** First day on or after the given one that belongs to the rhythm. */
export function nextRhythmDay(day: string, weekdays: number[]): string {
  let d = day;
  for (let i = 0; i < 7 && !weekdays.includes(weekdayOf(d)); i++) d = addDays(d, 1);
  return d;
}

export function rhythmLabel(weekdays: number[]): string {
  if (weekdays.length === 7) return "Diário";
  if (weekdays.join() === "1,2,3,4,5") return "Segunda a sexta";
  return weekdays.map((w) => WEEKDAY_NAMES[w].slice(0, 3)).join(", ");
}

/**
 * Date of every day of a series (index 0 = day 1). The day at anchorPosition
 * falls on anchorDate and the following ones on the next days of the rhythm.
 * Days before the anchor are in the past and get null.
 */
export function scheduleDates(count: number, anchorPosition: number, anchorDate: string, weekdays: number[]): (string | null)[] {
  const out: (string | null)[] = [];
  let date = nextRhythmDay(anchorDate, weekdays);
  for (let position = 1; position <= count; position++) {
    if (position < anchorPosition) {
      out.push(null);
      continue;
    }
    out.push(date);
    date = nextRhythmDay(addDays(date, 1), weekdays);
  }
  return out;
}

export type DayState = "lido" | "hoje" | "futuro" | "pulado" | "sem-data";

/** State of a day in the series calendar. */
export function dayState(read: boolean, date: string | null, scheduled: boolean, today: string): DayState {
  if (read) return "lido";
  if (!scheduled) return "sem-data";
  if (date === null || date < today) return "pulado";
  return date === today ? "hoje" : "futuro";
}

export const DAY_ICON: Record<DayState, string> = { lido: "✓", hoje: "◆", futuro: "○", pulado: "–", "sem-data": "○" };
export const DAY_LABEL: Record<DayState, string> = { lido: "Lido", hoje: "Hoje", futuro: "Futuro", pulado: "Pulado", "sem-data": "Sem data" };
