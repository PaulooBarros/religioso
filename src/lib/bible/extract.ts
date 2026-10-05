import { findBook, normalize } from "./books.ts";
import { formatRef } from "./reference.ts";

/** Verses per chapter of each book: counts[bookId][chapter - 1]. */
export type VerseCounts = Record<number, number[]>;

export type FoundRef = {
  /** Normalized label, e.g. "Rm 8:31–39" or "v. 35". */
  label: string;
  /** Problem found when checking against the Bible text, if any. */
  error?: string;
  /** Verse cited with "v." that exists but lies outside the message passage. */
  outside?: boolean;
};

export type Passage = { bookId: number; chapter: number; start: number | null; end: number | null };

// "Rm 8:31-39", "Romanos 8.28", "1 Co 13", "Cântico dos Cânticos 2:1". The book
// must start with a capital letter, so ordinary words are not taken for books.
const FULL_RE =
  /(?<![\p{L}\d])((?:[1-3]\s?)?\p{Lu}\p{L}*(?:\s+d[eo]s?\s+\p{Lu}\p{L}+)?)\.?\s+(\d{1,3})(?:\s*[:.]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?)?(?!\d)/gu;

// "v. 35", "vv. 31–32": verses of the message's own chapter.
const VERSE_RE = /(?<![\p{L}\d])vv?\.\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?(?!\d)/giu;

// Abbreviations that are also common Portuguese words. They only count as a
// book when followed by chapter and verse ("Os 3:1"), not by a bare number.
const AMBIGUOUS = new Set(["os", "na", "as", "ao", "am", "is", "ed", "ag", "ne", "no", "se", "em"]);

function check(bookId: number, bookName: string, chapter: number, verse: number | undefined, verseEnd: number | undefined, counts: VerseCounts) {
  const verses = counts[bookId]?.[chapter - 1];
  if (!verses) return `${bookName} não tem o capítulo ${chapter}.`;
  const last = verseEnd ?? verse;
  if (last && last > verses) return `${bookName} ${chapter} tem ${verses} versículos.`;
  return undefined;
}

/**
 * Finds Bible references written in free text and checks each one against
 * the verse counts of the base. Unknown book names are ignored: they cannot
 * be told apart from ordinary words.
 */
export function extractRefs(text: string, counts: VerseCounts, passage?: Passage): FoundRef[] {
  const found = new Map<string, FoundRef>();

  const re = new RegExp(FULL_RE);
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const book = findBook(m[1]);
    if (!book) {
      // A capitalized word followed by a number ("Leia 1 Co 13"): look again right after it.
      re.lastIndex = m.index + 1;
      continue;
    }
    const chapter = Number(m[2]);
    const verse = m[3] ? Number(m[3]) : undefined;
    let verseEnd = m[4] ? Number(m[4]) : undefined;
    if (!verse && AMBIGUOUS.has(normalize(m[1]))) continue;
    if (verse && verseEnd && verseEnd < verse) verseEnd = undefined;
    const label = formatRef(book.id, chapter, verse, verseEnd);
    if (!found.has(label)) found.set(label, { label, error: check(book.id, book.name, chapter, verse, verseEnd, counts) });
  }

  if (passage) {
    const total = counts[passage.bookId]?.[passage.chapter - 1] ?? 0;
    const first = passage.start ?? 1;
    const last = passage.start ? (passage.end ?? passage.start) : total;
    for (const m of text.matchAll(VERSE_RE)) {
      const start = Number(m[1]);
      const end = m[2] && Number(m[2]) >= start ? Number(m[2]) : start;
      const label = end > start ? `vv. ${start}–${end}` : `v. ${start}`;
      if (found.has(label)) continue;
      if (start < 1 || end > total) found.set(label, { label, error: `O capítulo ${passage.chapter} tem ${total} versículos.` });
      else found.set(label, { label, outside: start < first || end > last });
    }
  }
  return [...found.values()];
}
