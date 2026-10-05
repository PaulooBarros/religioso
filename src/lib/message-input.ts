import "server-only";
import { parseReference, type Reference } from "@/lib/bible/reference";
import { getChapter } from "@/lib/bible/text";

/** Parses a typed passage and checks it against the Bible text. */
export async function readPassage(input: string): Promise<{ ref: Reference } | { error: string }> {
  const ref = parseReference(input);
  if (!ref) return { error: "Não reconheci a passagem. Exemplos: Rm 8:31-39, Sl 23, Jo 3:16." };
  const verses = await getChapter(ref.book, ref.chapter);
  if (!verses) return { error: `${ref.book.name} não tem o capítulo ${ref.chapter}.` };
  const last = ref.verseEnd ?? ref.verse;
  if (last && last > verses.length) {
    return { error: `${ref.book.name} ${ref.chapter} tem ${verses.length} versículos.` };
  }
  return { ref };
}

export function passageColumns(ref: Reference) {
  return {
    book_id: ref.book.id,
    chapter: ref.chapter,
    verse_start: ref.verse ?? null,
    verse_end: ref.verse ? (ref.verseEnd ?? null) : null,
  };
}

export function cleanDuration(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n >= 5 && n <= 90 ? n : null;
}

export const optional = (value: unknown, max: number) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
