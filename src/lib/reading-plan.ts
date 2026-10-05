/** Bible reading plans. Pure: shared by server, client and tests. */

/** Verses per chapter of each book: counts[bookId][chapter - 1]. */
export type VerseCounts = Record<number, number[]>;

export type PlanChapter = { bookId: number; chapter: number };

export type PlanPreset = { id: string; title: string; summary: string; bookStart: number; bookEnd: number; days: number };

export const PLAN_PRESETS: PlanPreset[] = [
  { id: "biblia-1-ano", title: "Bíblia em um ano", summary: "De Gênesis a Apocalipse, na ordem dos livros.", bookStart: 1, bookEnd: 66, days: 365 },
  { id: "nt-90-dias", title: "Novo Testamento em 90 dias", summary: "De Mateus a Apocalipse.", bookStart: 40, bookEnd: 66, days: 90 },
  { id: "evangelhos-30-dias", title: "Evangelhos em 30 dias", summary: "Mateus, Marcos, Lucas e João.", bookStart: 40, bookEnd: 43, days: 30 },
  { id: "salmos-60-dias", title: "Salmos em 60 dias", summary: "Os 150 salmos.", bookStart: 19, bookEnd: 19, days: 60 },
];

export const MAX_PLAN_DAYS = 1100;

export function planChapters(counts: VerseCounts, bookStart: number, bookEnd: number): PlanChapter[] {
  const out: PlanChapter[] = [];
  for (let bookId = bookStart; bookId <= bookEnd; bookId++) {
    (counts[bookId] ?? []).forEach((_, i) => out.push({ bookId, chapter: i + 1 }));
  }
  return out;
}

/**
 * Splits the chapters of a book range into days of similar length, measured
 * in verses (so a day with Psalm 119 is not paired with two more psalms).
 * Chapters are never split. With more days than chapters, the plan is
 * shortened to one chapter a day.
 */
export function buildPlan(counts: VerseCounts, bookStart: number, bookEnd: number, days: number): PlanChapter[][] {
  const chapters = planChapters(counts, bookStart, bookEnd);
  const total = Math.min(Math.max(1, Math.floor(days)), chapters.length);
  if (chapters.length === 0) return [];
  const size = (c: PlanChapter) => counts[c.bookId][c.chapter - 1];
  const verses = chapters.reduce((sum, c) => sum + size(c), 0);

  const plan: PlanChapter[][] = [];
  let index = 0;
  let read = 0;
  for (let day = 1; day <= total; day++) {
    const target = (verses * day) / total;
    const left = total - day; // days still to fill after this one
    const today: PlanChapter[] = [];
    while (index < chapters.length - left) {
      const next = size(chapters[index]);
      // Stop when adding the chapter would overshoot the target by more than stopping short does.
      if (today.length > 0 && day < total && read + next - target > target - read) break;
      today.push(chapters[index]);
      read += next;
      index++;
    }
    plan.push(today);
  }
  return plan;
}

/** "Gn 49–50; Êx 1" from a day's chapters, given each book's abbreviation. */
export function dayLabel(chapters: PlanChapter[], abbrev: (bookId: number) => string): string {
  const groups: { bookId: number; from: number; to: number }[] = [];
  for (const c of chapters) {
    const last = groups[groups.length - 1];
    if (last && last.bookId === c.bookId && c.chapter === last.to + 1) last.to = c.chapter;
    else groups.push({ bookId: c.bookId, from: c.chapter, to: c.chapter });
  }
  return groups.map((g) => `${abbrev(g.bookId)} ${g.from}${g.to > g.from ? `–${g.to}` : ""}`).join("; ");
}

const DAY_MS = 86_400_000;
const toTime = (day: string) => new Date(`${day}T00:00:00Z`).getTime();

export function addDays(day: string, n: number): string {
  return new Date(toTime(day) + n * DAY_MS).toISOString().slice(0, 10);
}

export type PlanProgress = {
  /** Days read. */
  done: number;
  total: number;
  percent: number;
  /** First day not read yet, or null when the plan is finished. */
  next: number | null;
  /** Day the calendar expects today (1-based, capped at the total; 0 before the start). */
  expected: number;
  /** Days owed besides today's reading. */
  late: number;
  /** Days read beyond what the calendar expects. */
  ahead: number;
  /** Everything expected up to today is read. */
  todayDone: boolean;
};

/**
 * Progress against the calendar: day 1 falls on the start date and one day is
 * expected per calendar day. Reading ahead or out of order is allowed.
 */
export function planProgress(total: number, doneDays: number[], startDate: string, today: string): PlanProgress {
  const done = new Set(doneDays.filter((d) => d >= 1 && d <= total));
  let next: number | null = null;
  for (let d = 1; d <= total; d++) {
    if (!done.has(d)) {
      next = d;
      break;
    }
  }
  const elapsed = Math.floor((toTime(today) - toTime(startDate)) / DAY_MS) + 1;
  const expected = Math.min(total, Math.max(0, elapsed));
  return {
    done: done.size,
    total,
    percent: total ? Math.round((done.size / total) * 100) : 0,
    next,
    expected,
    late: next === null ? 0 : Math.max(0, expected - done.size - 1),
    ahead: Math.max(0, done.size - expected),
    todayDone: expected > 0 && done.size >= expected,
  };
}

/** Start date that puts the first unread day on today (used by "reajustar datas"). */
export function realignedStart(next: number, today: string): string {
  return addDays(today, -(next - 1));
}

/** One-line status of a plan against the calendar. */
export function planStatus(p: PlanProgress): string {
  if (p.next === null) return "Concluído";
  if (p.expected === 0) return "Ainda não começou";
  if (p.late > 0) return `${p.late} ${p.late === 1 ? "dia de atraso" : "dias de atraso"}`;
  if (p.ahead > 0) return `${p.ahead} ${p.ahead === 1 ? "dia adiantado" : "dias adiantado"}`;
  return p.todayDone ? "Em dia · leitura de hoje feita" : "Em dia";
}
