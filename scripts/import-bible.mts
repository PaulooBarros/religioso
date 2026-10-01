// Imports the Bíblia Livre into Supabase: source row first, then translation,
// books and verses. Idempotent (upserts). Needs the service key.
// Usage: npm run import:bible
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { BOOKS } from "../src/lib/bible/books.ts";
import { BIBLIA_LIVRE_SOURCE } from "../src/lib/bible/source.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const data = JSON.parse(readFileSync("data/bible/blivre.json", "utf8")) as {
  books: Record<string, string[][]>;
};

function check<T>(res: { error: { message: string } | null; data?: T | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}

const { slug, name, author, year, license, license_url, url: srcUrl, verified_at, required_credit, notes } =
  BIBLIA_LIVRE_SOURCE;
const [source] = check<{ id: string }[]>(
  await db
    .from("sources")
    .upsert(
      { slug, name, author, year, license, license_url, url: srcUrl, verified_at, required_credit, notes },
      { onConflict: "slug" },
    )
    .select("id"),
  "source",
);

check(
  await db
    .from("bible_translations")
    .upsert({ id: "blivre", name: "Bíblia Livre", abbrev: "BLIVRE", source_id: source.id }),
  "translation",
);

check(
  await db.from("bible_books").upsert(
    BOOKS.map((b) => ({
      id: b.id,
      code: b.code,
      name: b.name,
      abbrev: b.abbrev,
      slug: b.slug,
      testament: b.testament,
      chapters: data.books[b.code].length,
    })),
  ),
  "books",
);

const BATCH = 1000;
let rows: { translation_id: string; book_id: number; chapter: number; verse: number; text: string }[] = [];
let total = 0;

async function flush() {
  if (!rows.length) return;
  check(await db.from("bible_verses").upsert(rows), "verses");
  total += rows.length;
  rows = [];
  process.stdout.write(`\r${total} verses`);
}

for (const b of BOOKS) {
  const chapters = data.books[b.code];
  for (let c = 0; c < chapters.length; c++) {
    for (let v = 0; v < chapters[c].length; v++) {
      rows.push({ translation_id: "blivre", book_id: b.id, chapter: c + 1, verse: v + 1, text: chapters[c][v] });
      if (rows.length >= BATCH) await flush();
    }
  }
}
await flush();
console.log("\nDone.");
