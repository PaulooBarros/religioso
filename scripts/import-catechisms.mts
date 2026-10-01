// Imports the catechisms (original text + labelled machine translation) with
// their sources and licenses. Idempotent. Usage: npm run import:catechisms
import { readFileSync } from "node:fs";
import pg from "pg";
import { linkOpens } from "../src/lib/link-check.ts";

const VERIFIED = "2026-10-01";
const TRANSLATION_NOTE =
  "Tradução automática do original, feita por IA (Claude) em 1º de outubro de 2026. Não é uma tradução oficial nem revisada; o texto original está guardado ao lado de cada pergunta.";

const CATECHISMS = [
  {
    id: "westminster-breve",
    name: "Breve Catecismo de Westminster",
    year: "1647",
    original_lang: "inglês",
    source_url: "https://ccel.org/creeds/westminster-shorter-cat.html",
    position: 1,
    source: {
      slug: "westminster-shorter-catechism-1647",
      name: "Breve Catecismo de Westminster (1647), texto original em inglês",
      author: "Assembleia de Westminster",
      year: "1647",
      license: "Domínio público",
      license_url: null,
      url: "https://github.com/NonlinearFruit/Creeds.json/blob/master/creeds/westminster_shorter_catechism.json",
      required_credit: null,
      notes:
        "Texto de 1647 obtido da transcrição do projeto Creeds.json (arquivo westminster_shorter_catechism.json, marcado como domínio público; o restante do repositório está sob Unlicense). Sem os textos de prova. Leitura do original: https://ccel.org/creeds/westminster-shorter-cat.html. A versão em português exibida no app é tradução automática rotulada.",
    },
  },
  {
    id: "heidelberg",
    name: "Catecismo de Heidelberg",
    year: "1563",
    original_lang: "alemão",
    source_url: "https://www.ccel.org/ccel/schaff/creeds3.iv.vi.html",
    position: 2,
    source: {
      slug: "heidelberg-catechism-schaff-1877",
      name: "Catecismo de Heidelberg (1563), original alemão e tradução inglesa de 1863",
      author: "Zacarias Ursino e Gaspar Oleviano; edição de Philip Schaff",
      year: "1563 (edição de 1877)",
      license: "Domínio público",
      license_url: null,
      url: "https://www.ccel.org/ccel/schaff/creeds3.iv.vi.html",
      required_credit: null,
      notes:
        "Texto alemão e tradução inglesa de 1863 como impressos em Philip Schaff, The Creeds of Christendom, vol. 3 (1877), sem as notas de rodapé do editor e sem as referências bíblicas. A tradução inglesa moderna que circula em vários sites tem direitos autorais e não foi usada. A versão em português exibida no app é tradução automática do alemão, rotulada.",
    },
  },
];

type Original = { number: number; question: string; answer: string; question_en?: string; answer_en?: string; refs: string[] };
type Translated = { n: number; q: string; a: string };

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Missing DATABASE_URL in .env.local");
  process.exit(1);
}

// Principle 1: only store links that open.
for (const c of CATECHISMS) {
  for (const link of [c.source_url, c.source.url]) {
    if (!(await linkOpens(link))) {
      console.error(`Link não abriu: ${link}`);
      process.exit(1);
    }
  }
}

const db = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await db.connect();
try {
  await db.query("begin");
  for (const c of CATECHISMS) {
    const original = JSON.parse(readFileSync(`data/catechisms/${c.id}.json`, "utf8")) as Original[];
    const pt = JSON.parse(readFileSync(`data/catechisms/${c.id}.pt.json`, "utf8")) as Translated[];
    if (original.length !== pt.length || original.some((q, i) => q.number !== pt[i].n))
      throw new Error(`${c.id}: original e tradução não batem`);

    const s = c.source;
    const {
      rows: [source],
    } = await db.query<{ id: string }>(
      `insert into public.sources (slug, name, author, year, license, license_url, url, verified_at, required_credit, notes)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       on conflict (slug) do update set name = excluded.name, author = excluded.author, year = excluded.year,
         license = excluded.license, license_url = excluded.license_url, url = excluded.url,
         verified_at = excluded.verified_at, required_credit = excluded.required_credit, notes = excluded.notes
       returning id`,
      [s.slug, s.name, s.author, s.year, s.license, s.license_url, s.url, VERIFIED, s.required_credit, s.notes],
    );

    await db.query(
      `insert into public.catechisms (id, name, year, original_lang, source_id, source_url, translation_note, position)
       values ($1,$2,$3,$4,$5,$6,$7,$8)
       on conflict (id) do update set name = excluded.name, year = excluded.year, original_lang = excluded.original_lang,
         source_id = excluded.source_id, source_url = excluded.source_url,
         translation_note = excluded.translation_note, position = excluded.position`,
      [c.id, c.name, c.year, c.original_lang, source.id, c.source_url, TRANSLATION_NOTE, c.position],
    );

    for (let i = 0; i < original.length; i++) {
      const o = original[i];
      await db.query(
        `insert into public.catechism_questions
           (catechism_id, number, question_original, answer_original, question_en, answer_en, question_pt, answer_pt, bible_refs)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         on conflict (catechism_id, number) do update set
           question_original = excluded.question_original, answer_original = excluded.answer_original,
           question_en = excluded.question_en, answer_en = excluded.answer_en,
           question_pt = excluded.question_pt, answer_pt = excluded.answer_pt, bible_refs = excluded.bible_refs`,
        [c.id, o.number, o.question, o.answer, o.question_en ?? null, o.answer_en ?? null, pt[i].q, pt[i].a, o.refs],
      );
    }
    console.log(`${c.name}: ${original.length} perguntas`);
  }
  await db.query("commit");
  console.log("Done.");
} catch (e) {
  await db.query("rollback");
  throw e;
} finally {
  await db.end();
}
