// Devotional schedule checks. Usage: npm run test:devotionals
import {
  addDays,
  cleanWeekdays,
  dayState,
  devotionalBlocks,
  isWritten,
  nextRhythmDay,
  parseDevotionalBlocks,
  pickToday,
  rhythmLabel,
  scheduleDates,
  shareText,
  weekdayOf,
} from "../src/lib/devotional-plan.ts";

let fail = 0;
const eq = (label: string, a: unknown, b: unknown) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) fail++;
  console.log(ok ? "PASS" : "FAIL", label, ok ? "" : `→ got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
};

const DAILY = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];

// 2026-10-05 is a Monday.
eq("weekday of a known date", weekdayOf("2026-10-05"), 1);
eq("add days across a month", addDays("2026-10-30", 3), "2026-11-02");
eq("rhythm day: already one", nextRhythmDay("2026-10-05", WEEKDAYS), "2026-10-05");
eq("rhythm day: Saturday moves to Monday", nextRhythmDay("2026-10-10", WEEKDAYS), "2026-10-12");
eq("rhythm day: only Sundays", nextRhythmDay("2026-10-05", [0]), "2026-10-11");

eq("daily schedule", scheduleDates(3, 1, "2026-10-05", DAILY), ["2026-10-05", "2026-10-06", "2026-10-07"]);
eq("weekdays skip the weekend", scheduleDates(4, 1, "2026-10-08", WEEKDAYS), ["2026-10-08", "2026-10-09", "2026-10-12", "2026-10-13"]);
eq("start on a day off moves to the next rhythm day", scheduleDates(2, 1, "2026-10-10", WEEKDAYS), ["2026-10-12", "2026-10-13"]);
eq("resumed series: days before the anchor have no date", scheduleDates(4, 3, "2026-10-20", DAILY), [null, null, "2026-10-20", "2026-10-21"]);
eq("twice a week", scheduleDates(3, 1, "2026-10-05", [2, 4]), ["2026-10-06", "2026-10-08", "2026-10-13"]);

eq("read wins over any date", dayState(true, "2026-10-01", true, "2026-10-05"), "lido");
eq("today", dayState(false, "2026-10-05", true, "2026-10-05"), "hoje");
eq("future", dayState(false, "2026-10-06", true, "2026-10-05"), "futuro");
eq("past and unread is skipped", dayState(false, "2026-10-04", true, "2026-10-05"), "pulado");
eq("before the anchor and unread is skipped", dayState(false, null, true, "2026-10-05"), "pulado");
eq("draft series has no dates", dayState(false, null, false, "2026-10-05"), "sem-data");

eq("weekdays cleaned and sorted", cleanWeekdays(["5", "1", "1", "9", "x"]), [1, 5]);
eq("no valid weekday", cleanWeekdays(["7"]), null);
eq("rhythm labels", [rhythmLabel(DAILY), rhythmLabel(WEEKDAYS), rhythmLabel([2, 4])], ["Diário", "Segunda a sexta", "ter, qui"]);

let n = 0;
const blocks = devotionalBlocks("completo", () => String(++n));
eq("full template has four blocks", blocks.map((b) => b.title), ["Observação", "Reflexão", "Aplicação", "Oração"]);
eq("soap template has three blocks", devotionalBlocks("soap", () => String(++n)).length, 3);
eq("blank blocks are not written", isWritten(blocks), false);
eq("one filled block counts as written", isWritten([{ ...blocks[0], text: "Davi fala em primeira pessoa." }, ...blocks.slice(1)]), true);
eq("valid blocks parse", parseDevotionalBlocks(blocks)?.length, 4);
eq("duplicate ids rejected", parseDevotionalBlocks([blocks[0], blocks[0]]), null);
eq("non-array rejected", parseDevotionalBlocks({}), null);

const T = "2026-10-07";
const d = (id: string, state: "lido" | "hoje" | "futuro" | "pulado", date: string | null) => ({ id, state, date });
eq("today wins, earlier skipped days are counted", pickToday([d("1", "pulado", "2026-10-05"), d("2", "lido", "2026-10-06"), d("3", "hoje", T), d("4", "futuro", "2026-10-08")], T), {
  day: d("3", "hoje", T),
  skipped: 1,
  readToday: false,
});
eq("no day today: oldest skipped one", pickToday([d("1", "pulado", null), d("2", "pulado", "2026-10-06"), d("3", "futuro", "2026-10-09")], T)?.day.id, "1");
eq("today already read and nothing skipped", pickToday([d("1", "lido", "2026-10-06"), d("2", "lido", T), d("3", "futuro", "2026-10-08")], T), { day: d("2", "lido", T), skipped: 0, readToday: true });
eq("today read but a skipped day remains: offer it", pickToday([d("1", "pulado", "2026-10-06"), d("2", "lido", T)], T)?.day.id, "1");
eq("rest day with everything read: nothing", pickToday([d("1", "lido", "2026-10-06"), d("2", "futuro", "2026-10-08")], T), null);

const day = {
  title: "O pastor que não falta",
  seriesTitle: "Salmos de confiança",
  number: 5,
  blocks: [
    { id: "a", title: "Reflexão", text: "O verso 4 promete presença no vale." },
    { id: "b", title: "Aplicação", text: "  " },
    { id: "c", title: "Oração", text: "Pastoreia-me hoje." },
  ],
};
eq(
  "message with verse: headings in bold, blank block left out, prayer as invitation",
  shareText({ ...day, verse: { text: "O SENHOR é o meu pastor.", ref: "Sl 23:1", credit: "Bíblia Livre" } }),
  "*O pastor que não falta*\nSalmos de confiança · dia 5\n\n_“O SENHOR é o meu pastor.”_ (Sl 23:1, Bíblia Livre)\n\n*Reflexão:* O verso 4 promete presença no vale.\n\n*Para orar:* Pastoreia-me hoje.",
);
eq("without verse and with note", shareText({ ...day, blocks: [day.blocks[0]], note: " Ficou comigo. " }), "*O pastor que não falta*\nSalmos de confiança · dia 5\n\nO verso 4 promete presença no vale.\n\n*Minha anotação:* Ficou comigo.");

console.log(fail ? `${fail} FAILED` : "all passed");
process.exit(fail ? 1 : 0);
