// Converts the eBible VPL file of the Bíblia Livre into data/bible/blivre.json.
// Source: https://eBible.org/Scriptures/porbr2018_vpl.zip (CC BY 4.0 Brasil).
// Usage: node scripts/build-bible.mts
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { BOOKS } from "../src/lib/bible/books.ts";

const SRC = "data/source/porbr2018_vpl.txt";
const OUT = "data/bible/blivre.json";

const lines = readFileSync(SRC, "utf8").split(/\r?\n/).filter(Boolean);
const LINE_RE = /^([1-3A-Z]{3}) (\d+):(\d+) (.*)$/;

// books[code][chapter - 1][verse - 1] = text
const books: Record<string, string[][]> = {};
let count = 0;

for (const line of lines) {
  const m = LINE_RE.exec(line);
  if (!m) throw new Error(`Unexpected line: ${line.slice(0, 80)}`);
  const [, code, ch, vs, text] = m;
  const c = Number(ch) - 1;
  const v = Number(vs) - 1;
  const chapters = (books[code] ??= []);
  const verses = (chapters[c] ??= []);
  if (verses.length !== v) throw new Error(`Gap before ${code} ${ch}:${vs}`);
  verses.push(text.trim());
  count++;
}

const codes = Object.keys(books);
const expected = BOOKS.map((b) => b.code);
if (codes.join() !== expected.join()) {
  throw new Error(`Book order mismatch:\n${codes.join()}\n${expected.join()}`);
}

mkdirSync("data/bible", { recursive: true });
writeFileSync(OUT, JSON.stringify({ translation: "blivre", books }));
console.log(`${OUT}: ${codes.length} books, ${count} verses`);
