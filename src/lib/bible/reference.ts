import { type Book, bookById, findBook } from "./books";

export type Reference = {
  book: Book;
  chapter: number;
  verse?: number;
  verseEnd?: number;
};

const REF_RE =
  /^\s*((?:[1-3]\s*)?[\p{L}]+(?:\s+[\p{L}]+)*)\.?\s*(\d+)?(?:\s*[:.,]\s*(\d+)(?:\s*[-–]\s*(\d+))?)?\s*$/u;

/** Parse "Rm 8:28", "romanos 8.28-30", "1 Co 13", "Sl 23". */
export function parseReference(input: string): Reference | null {
  const m = REF_RE.exec(input);
  if (!m) return null;
  const book = findBook(m[1]);
  if (!book) return null;
  const chapter = m[2] ? Number(m[2]) : 1;
  const verse = m[3] ? Number(m[3]) : undefined;
  let verseEnd = m[4] ? Number(m[4]) : undefined;
  if (verse && verseEnd && verseEnd < verse) verseEnd = undefined;
  return { book, chapter, verse, verseEnd };
}

/** "Rm 8:28", "Rm 8:28–30", "Rm 8". */
export function formatRef(
  bookId: number,
  chapter: number,
  verse?: number | null,
  verseEnd?: number | null,
  long = false,
): string {
  const b = bookById(bookId);
  const name = b ? (long ? b.name : b.abbrev) : "?";
  if (!verse) return `${name} ${chapter}`;
  if (verseEnd && verseEnd !== verse) return `${name} ${chapter}:${verse}–${verseEnd}`;
  return `${name} ${chapter}:${verse}`;
}

/** Compact label for a set of selected verses: "8:28", "8:28–30", "8:28, 31". */
export function formatSelection(chapter: number, verses: number[]): string {
  if (verses.length === 0) return `${chapter}`;
  const sorted = [...verses].sort((a, b) => a - b);
  const contiguous = sorted.every((v, i) => i === 0 || v === sorted[i - 1] + 1);
  if (sorted.length === 1) return `${chapter}:${sorted[0]}`;
  if (contiguous) return `${chapter}:${sorted[0]}–${sorted[sorted.length - 1]}`;
  return `${chapter}:${sorted.join(", ")}`;
}

export function chapterHref(book: Book, chapter: number, verse?: number): string {
  return `/biblia/${book.slug}/${chapter}${verse ? `#v${verse}` : ""}`;
}

/** Other (copyrighted) versions are never embedded: we only link out. */
export const OTHER_VERSIONS = [
  { code: "ARC", name: "Almeida Revista e Corrigida" },
  { code: "NVI-PT", name: "Nova Versão Internacional" },
  { code: "NVT", name: "Nova Versão Transformadora" },
  { code: "NTLH", name: "Nova Tradução na Linguagem de Hoje" },
] as const;

export function otherVersionHref(book: Book, chapter: number, version: string, verse?: number): string {
  const search = `${book.en} ${chapter}${verse ? `:${verse}` : ""}`;
  return `https://www.biblegateway.com/passage/?search=${encodeURIComponent(search)}&version=${encodeURIComponent(version)}`;
}
