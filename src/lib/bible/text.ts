import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { type Book, bookById } from "./books";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

type LocalBible = { books: Record<string, string[][]> };

let local: Promise<LocalBible> | null = null;

/** The imported Bíblia Livre file. Also the source of chapter counts. */
function loadLocal(): Promise<LocalBible> {
  local ??= readFile(path.join(process.cwd(), "data/bible/blivre.json"), "utf8").then(
    (s) => JSON.parse(s) as LocalBible,
  );
  return local;
}

export async function chapterCount(book: Book): Promise<number> {
  const bible = await loadLocal();
  return bible.books[book.code]?.length ?? 0;
}

export async function chapterCounts(): Promise<Record<number, number>> {
  const bible = await loadLocal();
  const out: Record<number, number> = {};
  for (let id = 1; id <= 66; id++) {
    const b = bookById(id)!;
    out[id] = bible.books[b.code].length;
  }
  return out;
}

/** Verses of a chapter (index 0 = verse 1), or null if it doesn't exist. */
export async function getChapter(book: Book, chapter: number): Promise<string[] | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("bible_verses")
      .select("verse, text")
      .eq("translation_id", "blivre")
      .eq("book_id", book.id)
      .eq("chapter", chapter)
      .order("verse");
    // Fall back to the local file if the text was not imported yet.
    if (!error && data && data.length > 0) return data.map((r) => r.text as string);
  }
  const bible = await loadLocal();
  return bible.books[book.code]?.[chapter - 1] ?? null;
}

/** Text of one verse, used for previews (bookmarks, "continuar lendo"). */
export async function getVerseText(bookId: number, chapter: number, verse: number): Promise<string | null> {
  const book = bookById(bookId);
  if (!book) return null;
  const bible = await loadLocal();
  return bible.books[book.code]?.[chapter - 1]?.[verse - 1] ?? null;
}
