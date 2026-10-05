// Message checklist and reference extraction checks. Usage: npm run test:messages
import { readFileSync } from "node:fs";
import { BOOKS } from "../src/lib/bible/books.ts";
import { extractRefs, type VerseCounts } from "../src/lib/bible/extract.ts";
import { buildChecklist, pointKey, splitPoints } from "../src/lib/message-checks.ts";
import { blocksFor, retitle, type MessageBlock } from "../src/lib/message-templates.ts";
import { passagesOverlap, splitWeekLine } from "../src/lib/passage.ts";

let fail = 0;
const eq = (label: string, a: unknown, b: unknown) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) fail++;
  console.log(ok ? "PASS" : "FAIL", label, ok ? "" : `→ got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
};

const bible = JSON.parse(readFileSync("data/bible/blivre.json", "utf8")) as { books: Record<string, string[][]> };
const counts: VerseCounts = {};
for (const b of BOOKS) counts[b.id] = bible.books[b.code].map((c) => c.length);
const rm8 = { bookId: 45, chapter: 8, start: 31, end: 39 };
const labels = (text: string) => extractRefs(text, counts, rm8).map((r) => r.label);

eq("abbreviation with range", labels("Como em Rm 8:31-39, Deus é por nós."), ["Rm 8:31–39"]);
eq("full name, dot separator", labels("Veja Romanos 8.28 e Efésios 1:11."), ["Rm 8:28", "Ef 1:11"]);
eq("numbered book and bare chapter", labels("Leia 1 Co 13 e Sl 23."), ["1Co 13", "Sl 23"]);
eq("repeated reference listed once", labels("Jo 3:16. De novo: Jo 3:16."), ["Jo 3:16"]);
eq("ordinary words are not books", labels("Os 3 pontos. Na 2ª semana. Em 5 minutos, no dia 12."), []);
eq("ambiguous abbreviation with verse counts", labels("Compare com Os 3:1."), ["Os 3:1"]);
eq("lowercase word before a number ignored", labels("temos sal 3 vezes"), []);
eq("relative verses", labels("Deus é por nós (vv. 31-32) e nada separa (v. 39)."), ["vv. 31–32", "v. 39"]);

const errors = extractRefs("Rm 17:1, Rm 8:40 e v. 45; também v. 5.", counts, rm8);
eq("missing chapter flagged", errors[0].error, "Romanos não tem o capítulo 17.");
eq("missing verse flagged", errors[1].error, "Romanos 8 tem 39 versículos.");
eq("relative verse beyond the chapter flagged", errors[2].error, "O capítulo 8 tem 39 versículos.");
eq("relative verse outside the passage is a warning", [errors[3].label, errors[3].outside, errors[3].error], ["v. 5", true, undefined]);

eq("numbered points keep continuation lines", splitPoints("1. Deus é por nós\n(vv. 31-32)\n2) Ninguém condena\n\n3. Nada separa"), [
  "1. Deus é por nós (vv. 31-32)",
  "2) Ninguém condena",
  "3. Nada separa",
]);
eq("unnumbered points split by paragraph", splitPoints("Deus é por nós\nvv. 31-32\n\nNada separa"), ["Deus é por nós vv. 31-32", "Nada separa"]);
eq("empty points", splitPoints("  \n"), []);

let n = 0;
const blocks: MessageBlock[] = blocksFor("expositiva", () => String(++n)).map((b) => ({ ...b, text: b.kind === "leitura" ? "" : "Texto." }));
const set = (kind: string, text: string) => blocks.map((b) => (b.kind === kind ? { ...b, text } : b));
const base = { passage: rm8, passageLabel: "Rm 8:31–39", passageWords: 200, duration: 15, counts };
const withPoints = set("pontos", "1. Deus é por nós (vv. 31-32)\n2. Nada separa (vv. 35-39)");

let list = buildChecklist({ ...base, blocks: withPoints, checked: [] });
eq("manual items: two points, application, questions, reread", list.manual.map((m) => m.key.split(":")[0]), ["ponto", "ponto", "aplicacao", "perguntas", "releitura"]);
eq("nothing ticked: not complete", [list.done, list.total, list.complete], [0, 5, false]);
eq("empty reading block is not a blank block", list.auto.find((a) => a.key === "blocos")?.status, "ok");

const all = list.manual.map((m) => m.key);
list = buildChecklist({ ...base, blocks: withPoints, checked: all });
eq("all ticked: complete", list.complete, true);

const edited = set("pontos", "1. Deus é por nós (vv. 31-32)\n2. Nada nos separa do amor de Cristo (vv. 35-39)");
list = buildChecklist({ ...base, blocks: edited, checked: all });
eq("editing a point clears only its tick", [list.done, list.complete, list.manual[1].done], [4, false, false]);
eq("point key ignores case and spacing", pointKey("1.  Deus É por nós"), pointKey("1. deus é por nós"));

list = buildChecklist({ ...base, blocks: set("pontos", "1. Ver Rm 17:1"), checked: ["ponto:1. ver rm 17:1", "aplicacao", "perguntas", "releitura"] });
eq("broken reference blocks completion", [list.auto[0].status, list.complete], ["fail", false]);

list = buildChecklist({ ...base, blocks: set("aplicacao", " "), checked: all });
eq("blank block blocks completion", [list.auto.find((a) => a.key === "blocos")?.status, list.complete], ["fail", false]);

list = buildChecklist({ ...base, blocks: withPoints, checked: all, passageWords: 5000 });
eq("too long is a warning, not a blocker", [list.auto.find((a) => a.key === "tempo")?.status, list.complete], ["warn", true]);

const renamed = retitle(blocks, "expositiva", "narrativa");
eq("template change renames default titles", renamed.find((b) => b.kind === "pontos")?.title, "A história em cenas");
eq(
  "template change keeps edited titles",
  retitle(blocks.map((b) => (b.kind === "pontos" ? { ...b, title: "Meus pontos" } : b)), "expositiva", "narrativa").find((b) => b.kind === "pontos")?.title,
  "Meus pontos",
);

const p = (chapter: number, verse_start: number | null, verse_end: number | null, book_id = 45) => ({ book_id, chapter, verse_start, verse_end });
eq("overlapping ranges", passagesOverlap(p(8, 31, 39), p(8, 35, null)), true);
eq("touching ranges share a verse", passagesOverlap(p(8, 1, 11), p(8, 11, 17)), true);
eq("separate ranges", passagesOverlap(p(8, 1, 11), p(8, 12, 17)), false);
eq("whole chapter overlaps any verse of it", passagesOverlap(p(8, null, null), p(8, 28, null)), true);
eq("other chapter", passagesOverlap(p(8, 1, 11), p(9, 1, 11)), false);
eq("other book", passagesOverlap(p(8, 1, 11), p(8, 1, 11, 46)), false);
eq("week line with title", splitWeekLine("Rm 8:1-11 | Nenhuma condenação"), { passage: "Rm 8:1-11", title: "Nenhuma condenação" });
eq("week line without title", splitWeekLine("  Sl 23 "), { passage: "Sl 23", title: "" });

console.log(fail ? `${fail} FAILED` : "all passed");
process.exit(fail ? 1 : 0);
