/** A passage inside one chapter. A null start means the whole chapter. */
export type PassageRange = { book_id: number; chapter: number; verse_start: number | null; verse_end: number | null };

/** True when two passages share at least one verse. */
export function passagesOverlap(a: PassageRange, b: PassageRange): boolean {
  if (a.book_id !== b.book_id || a.chapter !== b.chapter) return false;
  if (!a.verse_start || !b.verse_start) return true;
  return a.verse_start <= (b.verse_end ?? b.verse_start) && b.verse_start <= (a.verse_end ?? a.verse_start);
}

/** One line of the series planner: "Rm 8:1-11 | Nenhuma condenação" (the title is optional). */
export function splitWeekLine(line: string): { passage: string; title: string } {
  const at = line.search(/[|;\t]/);
  if (at === -1) return { passage: line.trim(), title: "" };
  return { passage: line.slice(0, at).trim(), title: line.slice(at + 1).trim() };
}

export const MAX_WEEKS = 12;
