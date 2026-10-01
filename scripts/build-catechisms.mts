// Builds data/catechisms/*.json (original texts) from the downloaded sources
// in data/source/catechisms/. All three texts are in the public domain:
//
// - Westminster Shorter Catechism (1647), English original.
//   Creeds.json (NonlinearFruit), creeds/westminster_shorter_catechism.json
// - Heidelberg Catechism (1563): German original and the English translation
//   of 1863, both as printed in Philip Schaff, The Creeds of Christendom,
//   vol. 3 (1877). https://www.ccel.org/ccel/schaff/creeds3.iv.vi.html
//   (The Heidelberg text in Creeds.json is a modern translation and is NOT used.)
// - Spurgeon's "A Puritan Catechism" (1855): held back, see the note at the bottom.
//   Creeds.json, creeds/puritan_catechism.json
//
// Usage: npm run catechisms:build
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { validateRefsIn, type BibleText } from "../src/lib/bible/validate.ts";
import { BOOKS } from "../src/lib/bible/books.ts";
import { formatRef } from "../src/lib/bible/reference.ts";

const SRC = "data/source/catechisms";
const OUT = "data/catechisms";
mkdirSync(OUT, { recursive: true });

const bible = (JSON.parse(readFileSync("data/bible/blivre.json", "utf8")) as { books: BibleText }).books;

type Question = {
  number: number;
  question: string;
  answer: string;
  /** Heidelberg only: the 1863 English translation, kept next to the German original. */
  question_en?: string;
  answer_en?: string;
  refs: string[];
};

const clean = (s: string) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

// ---------- Westminster Shorter ----------
function westminster(): Question[] {
  const d = JSON.parse(readFileSync(`${SRC}/westminster_shorter_catechism.json`, "utf8")) as {
    Data: { Number: number; Question: string; Answer: string }[];
  };
  return d.Data.map((q) => ({ number: q.Number, question: q.Question.trim(), answer: q.Answer.trim(), refs: [] }));
}

// ---------- Spurgeon ----------
// Creeds.json uses OSIS-like references: "1Cor.10.31", "Ps.73.25-Ps.73.26".
const OSIS: Record<string, string> = {
  Gen: "GEN", Exod: "EXO", Lev: "LEV", Num: "NUM", Deut: "DEU", Josh: "JOS", Judg: "JDG", Ruth: "RUT",
  "1Sam": "1SA", "2Sam": "2SA", "1Kgs": "1KI", "2Kgs": "2KI", "1Chr": "1CH", "2Chr": "2CH", Ezra: "EZR",
  Neh: "NEH", Esth: "EST", Job: "JOB", Ps: "PSA", Prov: "PRO", Eccl: "ECC", Song: "SOL", Isa: "ISA",
  Jer: "JER", Lam: "LAM", Ezek: "EZE", Dan: "DAN", Hos: "HOS", Joel: "JOE", Amos: "AMO", Obad: "OBA",
  Jonah: "JON", Mic: "MIC", Nah: "NAH", Hab: "HAB", Zeph: "ZEP", Hag: "HAG", Zech: "ZEC", Mal: "MAL",
  Matt: "MAT", Mark: "MAR", Luke: "LUK", John: "JOH", Acts: "ACT", Rom: "ROM", "1Cor": "1CO", "2Cor": "2CO",
  Gal: "GAL", Eph: "EPH", Phil: "PHI", Col: "COL", "1Thess": "1TH", "2Thess": "2TH", "1Tim": "1TI",
  "2Tim": "2TI", Titus: "TIT", Phlm: "PHM", Heb: "HEB", Jas: "JAM", "1Pet": "1PE", "2Pet": "2PE",
  "1John": "1JO", "2John": "2JO", "3John": "3JO", Jude: "JUD", Rev: "REV",
};

const problems: string[] = [];

function osisToRefs(osis: string, where: string): string[] {
  const [a, b] = osis.split("-");
  const pa = a.split(".");
  const book = BOOKS.find((x) => x.code === OSIS[pa[0]]);
  if (!book) {
    problems.push(`${where}: livro desconhecido em "${osis}"`);
    return [];
  }
  const chapter = Number(pa[1]);
  const verse = pa[2] ? Number(pa[2]) : undefined;
  let out: string[];
  if (!b) out = [formatRef(book.id, chapter, verse)];
  else {
    const pb = b.split(".");
    const endChapter = Number(pb[1]);
    const endVerse = pb[2] ? Number(pb[2]) : undefined;
    if (pb[0] !== pa[0]) {
      problems.push(`${where}: intervalo entre livros "${osis}"`);
      return [];
    }
    if (endChapter === chapter) out = [formatRef(book.id, chapter, verse, endVerse)];
    else {
      // Range across chapters: split into one reference per chapter.
      out = [];
      for (let c = chapter; c <= endChapter; c++) {
        const lastVerse = bible[book.code][c - 1]?.length ?? 0;
        const from = c === chapter ? (verse ?? 1) : 1;
        const to = c === endChapter ? (endVerse ?? lastVerse) : lastVerse;
        out.push(formatRef(book.id, c, from, to));
      }
    }
  }
  const checked = validateRefsIn(bible, out.join("; "));
  if ("error" in checked) {
    problems.push(`${where}: ${checked.error} (${osis})`);
    return [];
  }
  return checked.refs;
}

function spurgeon(): Question[] {
  const d = JSON.parse(readFileSync(`${SRC}/puritan_catechism.json`, "utf8")) as {
    Data: { Number: number; Question: string; Answer: string; Proofs?: { References: string[] }[] }[];
  };
  return d.Data.map((q) => ({
    number: q.Number,
    question: q.Question.trim(),
    answer: q.Answer.trim(),
    refs: [...new Set((q.Proofs ?? []).flatMap((p) => p.References.flatMap((r) => osisToRefs(r, `Spurgeon ${q.Number}`))))],
  }));
}

// ---------- Heidelberg (Schaff, German | English in a two-column table) ----------
/** Removes Schaff's editorial footnotes: the marker and the (nested) margin-note span. */
function stripFootnotes(html: string): string {
  let out = html.replace(/<sup class="Note"[\s\S]*?<\/sup>/g, "");
  for (let start = out.indexOf('<span class="mnote"'); start !== -1; start = out.indexOf('<span class="mnote"')) {
    let depth = 0;
    let i = start;
    const tag = /<(\/?)span\b[^>]*>/g;
    tag.lastIndex = start;
    for (let m = tag.exec(out); m; m = tag.exec(out)) {
      depth += m[1] ? -1 : 1;
      if (depth === 0) {
        i = tag.lastIndex;
        break;
      }
    }
    if (i === start) throw new Error("Unclosed footnote span");
    out = out.slice(0, start) + out.slice(i);
  }
  return out;
}

function heidelberg(): Question[] {
  const html = stripFootnotes(readFileSync(`${SRC}/heidelberg_schaff.html`, "utf8"));
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map((m) =>
    [...m[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map((c) => clean(c[1])),
  );
  const out: Question[] = [];
  let cur: { n: number; de: [string[], string[]]; en: [string[], string[]] } | null = null;
  let mode: 0 | 1 = 0; // 0 = question, 1 = answer
  const flush = () => {
    if (!cur) return;
    // Question 80 is wrapped in parentheses in the source: drop the closing one.
    const join = (parts: string[]) => parts.join(" ").replace(/\s+/g, " ").replace(/\.\)$/, ".").trim();
    out.push({
      number: cur.n,
      question: join(cur.de[0]),
      answer: join(cur.de[1]),
      question_en: join(cur.en[0]),
      answer_en: join(cur.en[1]),
      refs: [],
    });
  };
  for (const cells of rows) {
    if (cells.length !== 2) continue;
    const [de, en] = cells;
    // Also matches "Question33." and "(Question 80." (question 80 is parenthesised in the source).
    const q = /^\(?\s*Q\s*uestion\s*(\d+)\s*\.?$/i.exec(en);
    if (q) {
      flush();
      cur = { n: Number(q[1]), de: [[], []], en: [[], []] };
      mode = 0;
      continue;
    }
    if (/^A\s*nswer\s*\.?$/i.test(en)) {
      mode = 1;
      continue;
    }
    if (!cur) continue;
    // Part and Lord's Day headings sit between questions, in capitals or dashes.
    if (/^[—–\-\s]*$/.test(en) || /^(THE |OF |LORD'S DAY|[IVXL]+\. LORD)/.test(en)) continue;
    if (de) cur.de[mode].push(de);
    if (en) cur.en[mode].push(en);
  }
  flush();
  return out;
}

function report(name: string, qs: Question[], expected: number) {
  const numbers = qs.map((q) => q.number);
  const sequential = numbers.every((n, i) => n === i + 1);
  const empty = qs.filter((q) => !q.question || !q.answer || (q.question_en !== undefined && (!q.question_en || !q.answer_en)));
  console.log(
    `${name}: ${qs.length} perguntas (esperado ${expected}), sequência ${sequential ? "ok" : "QUEBRADA"}, ` +
      `vazias: ${empty.map((q) => q.number).join(",") || "nenhuma"}, com referências: ${qs.filter((q) => q.refs.length).length}`,
  );
  if (qs.length !== expected || !sequential || empty.length) process.exitCode = 1;
}

const sets: [string, Question[], number][] = [
  ["westminster-breve", westminster(), 107],
  ["heidelberg", heidelberg(), 129],
];
// Spurgeon's catechism is NOT built by default: every source reachable so far
// (Creeds.json, Spurgeon Archive, CCEL) carries a modernised edition that
// changes the 1855 wording (e.g. Q. 9 "six normal consecutive days" instead of
// "in the space of six days"). Pass --with-spurgeon only to inspect it.
if (process.argv.includes("--with-spurgeon")) sets.push(["spurgeon", spurgeon(), 82]);
for (const [id, qs, expected] of sets) {
  report(id, qs, expected);
  writeFileSync(`${OUT}/${id}.json`, JSON.stringify(qs, null, 1) + "\n");
}
if (problems.length) {
  console.log("\nReferências com problema (ficaram de fora):");
  for (const p of problems) console.log(" -", p);
}
