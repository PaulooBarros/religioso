// Spaced repetition: SM-2 with a single learning step.
//
// New and lapsed items go through a short learning phase (1 min / 6 min);
// "Bom" graduates them. Review items grow by their ease factor, which goes
// down on "Difícil"/"Errei" and up on "Fácil". Intervals for a new item match
// the design: Errei < 1 min, Difícil 6 min, Bom 1 dia, Fácil 4 dias.

export type Grade = 1 | 2 | 3 | 4; // Errei, Difícil, Bom, Fácil

export const GRADES: { grade: Grade; label: string; key: string }[] = [
  { grade: 1, label: "Errei", key: "1" },
  { grade: 2, label: "Difícil", key: "2" },
  { grade: 3, label: "Bom", key: "3" },
  { grade: 4, label: "Fácil", key: "4" },
];

export type ReviewState = {
  state: "learning" | "review" | "relearning";
  ease: number;
  /** Current interval in days (for relearning: the interval to return to). */
  interval_days: number;
  reps: number;
  lapses: number;
  due_at: string;
};

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export const START_EASE = 2.5;
const MIN_EASE = 1.3;
const AGAIN_DELAY = 1 * MINUTE;
const HARD_DELAY = 6 * MINUTE;
const GRADUATE_DAYS = 1;
const EASY_DAYS = 4;
const EASY_BONUS = 1.3;
const HARD_FACTOR = 1.2;
const LAPSE_FACTOR = 0.5;
const MAX_DAYS = 3650;

type Next = { ease: number; interval_days: number; state: ReviewState["state"]; delayMs: number; lapse: boolean };

function plan(current: ReviewState | null, grade: Grade): Next {
  const ease = current?.ease ?? START_EASE;

  // New item, or learning/relearning phase.
  if (!current || current.state !== "review") {
    const relearning = current?.state === "relearning";
    const state = relearning ? "relearning" : "learning";
    const back = current?.interval_days ?? 0;
    if (grade === 1) return { ease, interval_days: back, state, delayMs: AGAIN_DELAY, lapse: false };
    if (grade === 2) return { ease, interval_days: back, state, delayMs: HARD_DELAY, lapse: false };
    const days = relearning
      ? Math.max(1, grade === 4 ? back * EASY_BONUS : back)
      : grade === 4
        ? EASY_DAYS
        : GRADUATE_DAYS;
    return { ease, interval_days: days, state: "review", delayMs: days * DAY, lapse: false };
  }

  // Review phase.
  const i = current.interval_days;
  if (grade === 1) {
    return {
      ease: Math.max(MIN_EASE, ease - 0.2),
      interval_days: Math.max(1, i * LAPSE_FACTOR),
      state: "relearning",
      delayMs: AGAIN_DELAY,
      lapse: true,
    };
  }
  const nextEase = grade === 2 ? Math.max(MIN_EASE, ease - 0.15) : grade === 4 ? ease + 0.15 : ease;
  const raw = grade === 2 ? i * HARD_FACTOR : grade === 3 ? i * ease : i * ease * EASY_BONUS;
  const days = Math.min(MAX_DAYS, Math.max(i + 1, Math.round(raw)));
  return { ease: nextEase, interval_days: days, state: "review", delayMs: days * DAY, lapse: false };
}

export function schedule(current: ReviewState | null, grade: Grade, now = new Date()): ReviewState {
  const p = plan(current, grade);
  return {
    state: p.state,
    ease: Math.round(p.ease * 100) / 100,
    interval_days: p.interval_days,
    reps: (current?.reps ?? 0) + 1,
    lapses: (current?.lapses ?? 0) + (p.lapse ? 1 : 0),
    due_at: new Date(now.getTime() + p.delayMs).toISOString(),
  };
}

/** "< 1 min", "6 min", "1 dia", "4 dias", "2 meses". */
export function formatDelay(ms: number): string {
  if (ms < 1.5 * MINUTE) return "< 1 min";
  if (ms < 60 * MINUTE) return `${Math.round(ms / MINUTE)} min`;
  const days = ms / DAY;
  if (days < 1) return `${Math.round(ms / (60 * MINUTE))} h`;
  if (days < 30) return Math.round(days) === 1 ? "1 dia" : `${Math.round(days)} dias`;
  if (days < 365) return Math.round(days / 30) === 1 ? "1 mês" : `${Math.round(days / 30)} meses`;
  const y = Math.round((days / 365) * 10) / 10;
  return y === 1 ? "1 ano" : `${String(y).replace(".", ",")} anos`;
}

/** Label of the next interval for each grade, shown on the buttons. */
export function previewIntervals(current: ReviewState | null): Record<Grade, string> {
  const out = {} as Record<Grade, string>;
  for (const { grade } of GRADES) out[grade] = formatDelay(plan(current, grade).delayMs);
  return out;
}

// ---- Calendar days in Brazil (no DST since 2019: UTC-3) ----
const TZ = "America/Sao_Paulo";

export function dayKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d); // YYYY-MM-DD
}

/** Last instant of the given day in Brasília time, as ISO. */
export function endOfDay(d = new Date()): string {
  return new Date(`${dayKey(d)}T23:59:59.999-03:00`).toISOString();
}

export function startOfDay(d = new Date()): string {
  return new Date(`${dayKey(d)}T00:00:00.000-03:00`).toISOString();
}

/** Consecutive study days ending today (or yesterday, if today is still pending). */
export function streak(days: Set<string>, now = new Date()): { count: number; todayDone: boolean } {
  const todayDone = days.has(dayKey(now));
  let count = 0;
  const cursor = new Date(now);
  if (!todayDone) cursor.setTime(cursor.getTime() - DAY);
  while (days.has(dayKey(cursor))) {
    count++;
    cursor.setTime(cursor.getTime() - DAY);
  }
  return { count, todayDone };
}

/** The last n calendar days, oldest first. */
export function lastDays(n: number, now = new Date()): string[] {
  return Array.from({ length: n }, (_, i) => dayKey(new Date(now.getTime() - (n - 1 - i) * DAY)));
}

export const NEW_PER_DAY = 10;
