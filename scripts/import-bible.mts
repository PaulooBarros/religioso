// Imports the Bíblia Livre into the database: source row first, then
// translation, books and verses. Idempotent (upserts). Uses the direct
// Postgres connection, so it never needs the service key.
// Usage: npm run import:bible
import { readFileSync } from "node:fs";
import pg from "pg";
import { BOOKS } from "../src/lib/bible/books.ts";
import { BIBLIA_LIVRE_SOURCE as S } from "../src/lib/bible/source.ts";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Missing DATABASE_URL in .env.local");
  process.exit(1);
}

const data = JSON.parse(readFileSync("data/bible/blivre.json", "utf8")) as {
  books: Record<string, string[][]>;
};

const db = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await db.connect();

try {
  await db.query("begin");

  const {
    rows: [source],
  } = await db.query<{ id: string }>(
    `insert into public.sources (slug, name, author, year, license, license_url, url, verified_at, required_credit, notes)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     on conflict (slug) do update set
       name = excluded.name, author = excluded.author, year = excluded.year, license = excluded.license,
       license_url = excluded.license_url, url = excluded.url, verified_at = excluded.verified_at,
       required_credit = excluded.required_credit, notes = excluded.notes
     returning id`,
    [S.slug, S.name, S.author, S.year, S.license, S.license_url, S.url, S.verified_at, S.required_credit, S.notes],
  );

  await db.query(
    `insert into public.bible_translations (id, name, abbrev, source_id) values ('blivre', 'Bíblia Livre', 'BLIVRE', $1)
     on conflict (id) do update set name = excluded.name, abbrev = excluded.abbrev, source_id = excluded.source_id`,
    [source.id],
  );

  for (const b of BOOKS) {
    await db.query(
      `insert into public.bible_books (id, code, name, abbrev, slug, testament, chapters)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (id) do update set code = excluded.code, name = excluded.name, abbrev = excluded.abbrev,
         slug = excluded.slug, testament = excluded.testament, chapters = excluded.chapters`,
      [b.id, b.code, b.name, b.abbrev, b.slug, b.testament, data.books[b.code].length],
    );
  }

  // Verses go in batches through unnest() to keep round trips low.
  const BATCH = 2000;
  let books: number[] = [];
  let chapters: number[] = [];
  let verses: number[] = [];
  let texts: string[] = [];
  let total = 0;

  async function flush() {
    if (!texts.length) return;
    await db.query(
      `insert into public.bible_verses (translation_id, book_id, chapter, verse, text)
       select 'blivre', * from unnest($1::smallint[], $2::smallint[], $3::smallint[], $4::text[])
       on conflict (translation_id, book_id, chapter, verse) do update set text = excluded.text`,
      [books, chapters, verses, texts],
    );
    total += texts.length;
    books = [];
    chapters = [];
    verses = [];
    texts = [];
    process.stdout.write(`\r${total} verses`);
  }

  for (const b of BOOKS) {
    const chs = data.books[b.code];
    for (let c = 0; c < chs.length; c++) {
      for (let v = 0; v < chs[c].length; v++) {
        books.push(b.id);
        chapters.push(c + 1);
        verses.push(v + 1);
        texts.push(chs[c][v]);
        if (texts.length >= BATCH) await flush();
      }
    }
  }
  await flush();
  await db.query("commit");
  console.log("\nDone.");
} catch (e) {
  await db.query("rollback");
  throw e;
} finally {
  await db.end();
}
