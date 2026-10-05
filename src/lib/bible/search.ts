/** Word search in the Bible text. Pure: used by the server and by tests. */

export type SearchVerse = { bookId: number; chapter: number; verse: number; text: string; folded: string };

export type SearchTerm =
  | { kind: "word"; value: string }
  /** Typed with a trailing asterisk: "am*" matches "amor", "amou". */
  | { kind: "prefix"; value: string }
  /** Typed between quotes: the words in this exact order. */
  | { kind: "phrase"; value: string };

/** Lower case, no accents, punctuation turned into single spaces. */
export function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Folded text padded with spaces, so " palavra " finds whole words. */
export const searchable = (text: string) => ` ${fold(text)} `;

export const MAX_TERMS = 8;

/** Parses what was typed: plain words, prefixes ("am*") and "exact phrases". */
export function parseQuery(query: string): SearchTerm[] {
  const terms: SearchTerm[] = [];
  const seen = new Set<string>();
  const add = (term: SearchTerm) => {
    const key = `${term.kind}:${term.value}`;
    if (term.value && !seen.has(key) && terms.length < MAX_TERMS) {
      seen.add(key);
      terms.push(term);
    }
  };
  for (const m of query.matchAll(/["“”]([^"“”]+)["“”]|(\S+)/g)) {
    if (m[1] !== undefined) {
      const value = fold(m[1]);
      add(value.includes(" ") ? { kind: "phrase", value } : { kind: "word", value });
      continue;
    }
    const prefix = m[2].endsWith("*");
    // A hyphenated or punctuated token ("bem-aventurado") becomes its words.
    const words = fold(m[2]).split(" ").filter(Boolean);
    words.forEach((value, i) => add(prefix && i === words.length - 1 ? { kind: "prefix", value } : { kind: "word", value }));
  }
  return terms;
}

function matches(folded: string, term: SearchTerm): boolean {
  return folded.includes(term.kind === "prefix" ? ` ${term.value}` : ` ${term.value} `);
}

export type SearchFilter = { testament?: "OT" | "NT"; bookId?: number };

export type SearchResult = {
  /** Verses that match every term, in Bible order, after the filter. */
  hits: SearchVerse[];
  /** Matches per book before the book filter, to offer narrowing. */
  perBook: { bookId: number; count: number }[];
};

/** Verses containing every term. Books 1–39 are the Old Testament. */
export function searchVerses(verses: SearchVerse[], terms: SearchTerm[], filter: SearchFilter = {}): SearchResult {
  if (terms.length === 0) return { hits: [], perBook: [] };
  const counts = new Map<number, number>();
  const hits: SearchVerse[] = [];
  for (const v of verses) {
    if (filter.testament === "OT" && v.bookId > 39) continue;
    if (filter.testament === "NT" && v.bookId <= 39) continue;
    if (!terms.every((t) => matches(v.folded, t))) continue;
    counts.set(v.bookId, (counts.get(v.bookId) ?? 0) + 1);
    if (!filter.bookId || filter.bookId === v.bookId) hits.push(v);
  }
  return { hits, perBook: [...counts.entries()].map(([bookId, count]) => ({ bookId, count })) };
}

/**
 * Splits a verse into pieces, flagging the words that match the query, so
 * the page can highlight them. Accents and case of the original are kept.
 */
export function highlight(text: string, terms: SearchTerm[]): { text: string; hit: boolean }[] {
  const words = new Set<string>();
  const prefixes: string[] = [];
  for (const t of terms) {
    if (t.kind === "prefix") prefixes.push(t.value);
    else t.value.split(" ").forEach((w) => words.add(w));
  }
  const out: { text: string; hit: boolean }[] = [];
  for (const piece of text.split(/([\p{L}\p{N}]+)/u)) {
    if (!piece) continue;
    const folded = fold(piece);
    const hit = Boolean(folded) && (words.has(folded) || prefixes.some((p) => folded.startsWith(p)));
    const last = out[out.length - 1];
    if (last && last.hit === hit) last.text += piece;
    else out.push({ text: piece, hit });
  }
  return out;
}
