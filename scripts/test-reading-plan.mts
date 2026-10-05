// Reading plan checks. Usage: npm run test:plan
import { readFileSync } from "node:fs";
import { BOOKS } from "../src/lib/bible/books.ts";
import { buildPlan, dayLabel, planChapters, planProgress, planStatus, realignedStart, type VerseCounts } from "../src/lib/reading-plan.ts";

let fail = 0;
const eq = (label: string, a: unknown, b: unknown) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) fail++;
  console.log(ok ? "PASS" : "FAIL", label, ok ? "" : `→ got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
};
const ok = (label: string, value: boolean, detail = "") => eq(`${label}${detail ? ` (${detail})` : ""}`, value, true);

const bible = JSON.parse(readFileSync("data/bible/blivre.json", "utf8")) as { books: Record<string, string[][]> };
const counts: VerseCounts = {};
for (const b of BOOKS) counts[b.id] = bible.books[b.code].map((c) => c.length);
const abbrev = (id: number) => BOOKS[id - 1].abbrev;
const verses = (day: { bookId: number; chapter: number }[]) => day.reduce((s, c) => s + counts[c.bookId][c.chapter - 1], 0);

eq("whole Bible has 1189 chapters", planChapters(counts, 1, 66).length, 1189);

const year = buildPlan(counts, 1, 66, 365);
eq("one-year plan has 365 days", year.length, 365);
eq("every chapter appears once, in order", JSON.stringify(year.flat()), JSON.stringify(planChapters(counts, 1, 66)));
ok("no empty day", year.every((d) => d.length > 0));
const sizes = year.map(verses);
const average = 31102 / 365;
// The longest day is Psalm 119 alone (176 verses); the days right after a long chapter are lighter.
const longest = year[sizes.indexOf(Math.max(...sizes))];
eq("the longest day is a single chapter", [longest.length, Math.max(...sizes)], [1, 176]);
ok("no day under a quarter of the average", Math.min(...sizes) > average / 4, `min ${Math.min(...sizes)}, average ${Math.round(average)}`);
ok("nine days in ten stay within half and one and a half times the average", sizes.filter((v) => v > average * 0.5 && v < average * 1.5).length / sizes.length > 0.9);
eq("first day of the year plan", dayLabel(year[0], abbrev), "Gn 1–3");
eq("last day ends in Revelation 22", year[364][year[364].length - 1], { bookId: 66, chapter: 22 });

const psalms = buildPlan(counts, 19, 19, 60);
eq("psalms plan: 60 days, 150 psalms", [psalms.length, psalms.flat().length], [60, 150]);
ok("Psalm 119 gets a day of its own", psalms.some((d) => d.length === 1 && d[0].chapter === 119));

eq("more days than chapters: one chapter a day", buildPlan(counts, 57, 57, 10).map((d) => d.length), [1]);
eq("one day takes everything", buildPlan(counts, 50, 50, 1)[0].length, 4);
eq("label groups by book", dayLabel([{ bookId: 1, chapter: 49 }, { bookId: 1, chapter: 50 }, { bookId: 2, chapter: 1 }], abbrev), "Gn 49–50; Êx 1");
eq("label with a gap", dayLabel([{ bookId: 19, chapter: 1 }, { bookId: 19, chapter: 3 }], abbrev), "Sl 1; Sl 3");

const start = "2026-10-01";
let p = planProgress(30, [], start, "2026-10-01");
eq("first day, nothing read: on time", [p.next, p.expected, p.late, p.ahead, p.todayDone, planStatus(p)], [1, 1, 0, 0, false, "Em dia"]);
p = planProgress(30, [1], start, "2026-10-01");
eq("first day read", [p.next, p.todayDone, planStatus(p)], [2, true, "Em dia · leitura de hoje feita"]);
p = planProgress(30, [1], start, "2026-10-05");
eq("three days owed besides today's", [p.expected, p.late, planStatus(p)], [5, 3, "3 dias de atraso"]);
p = planProgress(30, [1, 2, 3], start, "2026-10-02");
eq("reading ahead", [p.ahead, planStatus(p)], [1, "1 dia adiantado"]);
p = planProgress(30, [], "2026-10-10", "2026-10-05");
eq("before the start date", [p.expected, planStatus(p)], [0, "Ainda não começou"]);
p = planProgress(3, [1, 2, 3], start, "2026-12-01");
eq("finished", [p.next, p.percent, planStatus(p)], [null, 100, "Concluído"]);
p = planProgress(30, [1, 3], start, "2026-10-03");
eq("out of order: next is the first gap", [p.next, p.done], [2, 2]);
eq("realign puts the next day on today", realignedStart(5, "2026-10-20"), "2026-10-16");
p = planProgress(30, [1, 2, 3, 4], realignedStart(5, "2026-10-20"), "2026-10-20");
eq("after realigning: on time, today's reading pending", [p.late, p.ahead, p.todayDone], [0, 0, false]);

console.log(fail ? `${fail} FAILED` : "all passed");
process.exit(fail ? 1 : 0);
