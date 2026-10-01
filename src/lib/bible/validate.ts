import { formatRef, parseReference } from "./reference.ts";

export type BibleText = Record<string, string[][]>;

/**
 * Normalizes a list of typed references ("rm 8.28; Ef 1:11-12") and checks
 * that every chapter and verse exists in the given Bible text.
 */
export function validateRefsIn(bible: BibleText, input: string): { refs: string[] } | { error: string } {
  const parts = input
    .split(/[;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const refs: string[] = [];
  for (const part of parts) {
    const ref = parseReference(part);
    if (!ref) return { error: `Não reconheci a referência “${part}”.` };
    const chapterVerses = bible[ref.book.code]?.[ref.chapter - 1];
    if (!chapterVerses) return { error: `${ref.book.name} não tem capítulo ${ref.chapter}.` };
    const last = ref.verseEnd ?? ref.verse;
    if (last && last > chapterVerses.length)
      return { error: `${ref.book.name} ${ref.chapter} tem ${chapterVerses.length} versículos.` };
    refs.push(formatRef(ref.book.id, ref.chapter, ref.verse, ref.verseEnd));
  }
  return { refs: [...new Set(refs)] };
}
