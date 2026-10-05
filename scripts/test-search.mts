// Bible word search checks. Usage: npm run test:search
import { readFileSync } from "node:fs";
import { BOOKS } from "../src/lib/bible/books.ts";
import { fold, highlight, parseQuery, searchable, searchVerses, type SearchVerse } from "../src/lib/bible/search.ts";

let fail = 0;
const eq = (label: string, a: unknown, b: unknown) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) fail++;
  console.log(ok ? "PASS" : "FAIL", label, ok ? "" : `→ got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
};

eq("fold removes accents, case and punctuation", fold("  O SENHOR é o meu pastor; nada me faltará. "), "o senhor e o meu pastor nada me faltara");
eq("plain words", parseQuery("Graça  fé"), [{ kind: "word", value: "graca" }, { kind: "word", value: "fe" }]);
eq("prefix", parseQuery("am*"), [{ kind: "prefix", value: "am" }]);
eq("phrase in quotes, straight or curly", [parseQuery('"bom pastor"'), parseQuery("“bom pastor”")], [[{ kind: "phrase", value: "bom pastor" }], [{ kind: "phrase", value: "bom pastor" }]]);
eq("one quoted word is a word", parseQuery('"graça"'), [{ kind: "word", value: "graca" }]);
eq("hyphenated token becomes its words", parseQuery("bem-aventurados"), [{ kind: "word", value: "bem" }, { kind: "word", value: "aventurados" }]);
eq("repeated terms kept once, punctuation alone ignored", parseQuery("fé Fé , ;"), [{ kind: "word", value: "fe" }]);
eq("empty query", parseQuery("   "), []);

const sample: SearchVerse[] = [
  { bookId: 19, chapter: 23, verse: 1, text: "O SENHOR é o meu pastor; nada me faltará." },
  { bookId: 43, chapter: 10, verse: 11, text: "Eu sou o bom pastor; o bom pastor dá a sua vida pelas ovelhas." },
  { bookId: 43, chapter: 10, verse: 12, text: "Mas o empregado, e que não é o pastor, vê o lobo vir." },
  { bookId: 45, chapter: 8, verse: 28, text: "Todas as coisas contribuem juntamente para o bem daqueles que amam a Deus." },
].map((v) => ({ ...v, folded: searchable(v.text) }));
const ids = (q: string, filter = {}) => searchVerses(sample, parseQuery(q), filter).hits.map((v) => `${v.bookId}:${v.chapter}:${v.verse}`);

eq("word, ignoring accents and case", ids("PASTOR"), ["19:23:1", "43:10:11", "43:10:12"]);
eq("every word must appear", ids("pastor ovelhas"), ["43:10:11"]);
eq("phrase needs the exact order", [ids('"bom pastor"'), ids('"pastor bom"')], [["43:10:11"], []]);
eq("whole words only", ids("am"), []);
eq("prefix reaches longer words", ids("am*"), ["45:8:28"]);
eq("testament filter", [ids("pastor", { testament: "OT" }), ids("pastor", { testament: "NT" })], [["19:23:1"], ["43:10:11", "43:10:12"]]);
eq("book filter keeps the per-book counts of the whole search", searchVerses(sample, parseQuery("pastor"), { bookId: 19 }), {
  hits: [sample[0]],
  perBook: [
    { bookId: 19, count: 1 },
    { bookId: 43, count: 2 },
  ],
});
eq("no terms, no results", searchVerses(sample, []).hits, []);

eq("highlight keeps accents and marks whole words", highlight("O SENHOR é o meu pastor; nada.", parseQuery("senhor pastor")), [
  { text: "O ", hit: false },
  { text: "SENHOR", hit: true },
  { text: " é o meu ", hit: false },
  { text: "pastor", hit: true },
  { text: "; nada.", hit: false },
]);
eq("highlight with prefix", highlight("que amam a Deus", parseQuery("am*")).filter((p) => p.hit).map((p) => p.text), ["amam"]);
eq("highlight rebuilds the original text", highlight(sample[1].text, parseQuery('"bom pastor"')).map((p) => p.text).join(""), sample[1].text);

// Against the real text.
const bible = JSON.parse(readFileSync("data/bible/blivre.json", "utf8")) as { books: Record<string, string[][]> };
const all: SearchVerse[] = [];
for (const b of BOOKS) bible.books[b.code].forEach((ch, c) => ch.forEach((text, v) => all.push({ bookId: b.id, chapter: c + 1, verse: v + 1, text, folded: searchable(text) })));
eq("whole Bible indexed", all.length, 31102);
const started = performance.now();
const grace = searchVerses(all, parseQuery("graça"));
const ms = performance.now() - started;
eq("a common word is found in both testaments", [grace.hits.length > 100, grace.perBook.some((b) => b.bookId <= 39), grace.perBook.some((b) => b.bookId > 39)], [true, true, true]);
eq("search over the whole Bible is fast", ms < 500, true);
console.log(`     "graça": ${grace.hits.length} verses in ${grace.perBook.length} books, ${Math.round(ms)} ms`);
eq("John 3:16 found by phrase", searchVerses(all, parseQuery('"amou ao mundo"')).hits.map((v) => `${v.bookId}:${v.chapter}:${v.verse}`).includes("43:3:16"), true);

console.log(fail ? `${fail} FAILED` : "all passed");
process.exit(fail ? 1 : 0);
