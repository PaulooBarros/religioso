// Imports a batch of study items (JSON "lote") as DRAFTS for one profile.
// - Maps theme/level/type to the app model and keeps the original subtopic.
// - Validates Bible references against the imported text.
// - Checks every source link (principle 1) and stores the result.
// - Idempotent: re-importing the same batch updates items by their batch id
//   and sends them back to draft, since the content may have changed.
//
// Usage:
//   npm run import:items -- lote1questoes.json [--profile "Nome"] [--dry-run]
//
// Owner-reviewed batches (only when the owner says so):
//   --approve          items go straight to the study bank instead of drafts
//   --skip-link-check  links are not checked (stored as "not checked", never as verified)
import { readFileSync } from "node:fs";
import pg from "pg";
import { validateRefsIn, type BibleText } from "../src/lib/bible/validate.ts";
import { linkOpens } from "../src/lib/link-check.ts";

type RawItem = {
  id: string;
  tipo: "card" | "multipla_escolha";
  nivel: "basico" | "intermediario" | "dificil";
  tema: string;
  subtema?: string;
  pergunta: string;
  alternativas: { letra: string; texto: string }[];
  alternativa_correta: string | null;
  resposta: string;
  explicacao?: string;
  referencias_biblicas?: string;
  fonte?: string;
  link_fonte?: string;
  traducao_automatica?: boolean;
  observacao?: string;
};

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
const approve = args.includes("--approve");
const skipLinkCheck = args.includes("--skip-link-check");
const status = approve ? "approved" : "draft";
const profileArg = args.includes("--profile") ? args[args.indexOf("--profile") + 1] : undefined;
if (!file) {
  console.error('Usage: npm run import:items -- <file.json> [--profile "Nome"] [--dry-run]');
  process.exit(1);
}

const LEVEL: Record<string, number> = { basico: 1, intermediario: 2, dificil: 3, avancado: 3 };

// Batch theme labels -> app theme ids. Catechism items are placed by subtopic.
const THEME: Record<string, string> = {
  Escritura: "escritura",
  Deus: "deus",
  "Deus e Trindade": "deus",
  Cristo: "cristo",
  "Espírito Santo": "espirito-santo",
  "Homem e pecado": "homem-e-pecado",
  Salvação: "salvacao",
  Igreja: "igreja",
  "Últimas coisas": "ultimas-coisas",
  "Fé batista: igreja e ordenanças": "igreja",
};
const BY_SUBTOPIC: Record<string, string> = {
  Pecado: "homem-e-pecado",
  Cristo: "cristo",
  Justificação: "salvacao",
  "Meios da graça": "igreja",
};

function themeFor(item: RawItem): string | null {
  if (THEME[item.tema]) return THEME[item.tema];
  if (item.tema.startsWith("Cristo")) return "cristo";
  if (item.tema.startsWith("Panorama bíblico")) return "panorama-biblico";
  if (item.subtema && BY_SUBTOPIC[item.subtema]) return BY_SUBTOPIC[item.subtema];
  return null;
}

function subtopicFor(item: RawItem): string | null {
  if (item.tema.startsWith("Panorama bíblico")) return item.subtema || null;
  const direct = THEME[item.tema] && THEME[item.tema] !== "igreja" ? null : item.tema;
  const parts = [direct ?? (item.tema.startsWith("Cristo") ? item.tema : null), item.subtema].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

// reformedbaptist.org refuses automated access (HTTP 403), so its link can't
// be verified. The 1689 Confession items cite the chapter ("1689, cap. 11");
// point them at that chapter's page on CCEL, which serves the same
// public-domain text one chapter per page.
function fixSourceUrl(item: RawItem): string | null {
  const url = item.link_fonte?.trim() || null;
  const chapter = /1689, cap\. (\d+)/.exec(item.fonte ?? "")?.[1];
  if (url?.includes("reformedbaptist.org") && chapter) {
    return `https://www.ccel.org/creeds/bcf/bcfc${chapter.padStart(2, "0")}.htm`;
  }
  return url;
}

const batch = JSON.parse(readFileSync(file, "utf8")) as { itens: RawItem[] };
const bible = (JSON.parse(readFileSync("data/bible/blivre.json", "utf8")) as { books: BibleText }).books;

// ---- Convert and validate ----
const problems: string[] = [];
const rows = batch.itens.map((it) => {
  const isMcq = it.tipo === "multipla_escolha";
  const options = isMcq ? it.alternativas.map((a) => a.texto.trim()) : null;
  const correct = isMcq ? it.alternativas.findIndex((a) => a.letra === it.alternativa_correta) : null;
  if (isMcq && (correct === null || correct < 0)) problems.push(`${it.id}: alternativa correta não encontrada`);
  if (!isMcq && !it.resposta?.trim()) problems.push(`${it.id}: card sem resposta`);
  if (!(it.nivel in LEVEL)) problems.push(`${it.id}: nível desconhecido "${it.nivel}"`);

  const refs = validateRefsIn(bible, it.referencias_biblicas ?? "");
  if ("error" in refs) problems.push(`${it.id}: ${refs.error}`);

  return {
    external_id: it.id,
    kind: isMcq ? "mcq" : "card",
    prompt: it.pergunta.trim(),
    answer: isMcq ? null : it.resposta.trim(),
    options,
    correct_option: correct,
    explanation: it.explicacao?.trim() || null,
    theme_id: themeFor(it),
    subtopic: subtopicFor(it),
    level: LEVEL[it.nivel] ?? 2,
    source_title: it.fonte?.trim() || null,
    source_url: fixSourceUrl(it),
    bible_refs: "error" in refs ? [] : refs.refs,
    machine_translated: Boolean(it.traducao_automatica),
    review_note: it.observacao?.trim() || null,
    source_ok: null as boolean | null,
  };
});

if (problems.length) {
  console.log("Problemas encontrados (o lote não foi gravado):");
  for (const p of problems) console.log(" -", p);
  process.exit(1);
}

// ---- Check links ----
const urls = skipLinkCheck ? [] : [...new Set(rows.map((r) => r.source_url).filter((u): u is string => Boolean(u)))];
if (skipLinkCheck) console.log("Links não verificados (--skip-link-check): ficam como “não verificados”.");
else console.log(`Verificando ${urls.length} links…`);
const linkStatus = new Map<string, boolean>();
const queue = [...urls];
await Promise.all(
  Array.from({ length: 6 }, async () => {
    for (let u = queue.shift(); u; u = queue.shift()) linkStatus.set(u, await linkOpens(u));
  }),
);
if (!skipLinkCheck) for (const r of rows) r.source_ok = r.source_url ? (linkStatus.get(r.source_url) ?? false) : null;
const broken = urls.filter((u) => !linkStatus.get(u));

const themeCount = rows.reduce<Record<string, number>>((m, r) => {
  const k = r.theme_id ?? "(sem tema)";
  m[k] = (m[k] ?? 0) + 1;
  return m;
}, {});
console.log(`Itens: ${rows.length} (${rows.filter((r) => r.kind === "card").length} cards, ${rows.filter((r) => r.kind === "mcq").length} múltipla escolha)`);
console.log("Por tema:", themeCount);
if (!skipLinkCheck) console.log(`Links que abriram: ${urls.length - broken.length} de ${urls.length}`);
console.log(`Situação ao gravar: ${approve ? "aprovados" : "rascunho"}`);
for (const u of broken) console.log("  não abriu:", u, "→", rows.filter((r) => r.source_url === u).map((r) => r.external_id).join(", "));

if (dryRun) {
  console.log("\n--dry-run: nada foi gravado.");
  process.exit(0);
}

// ---- Write ----
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Missing DATABASE_URL in .env.local");
  process.exit(1);
}
const db = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await db.connect();
try {
  const { rows: profiles } = await db.query<{ id: string; name: string }>("select id, name from public.profiles order by created_at");
  const profile = profileArg ? profiles.find((p) => p.name === profileArg || p.id === profileArg) : profiles.length === 1 ? profiles[0] : undefined;
  if (!profile) {
    console.error(`Escolha o perfil com --profile. Perfis: ${profiles.map((p) => p.name).join(", ")}`);
    process.exit(1);
  }

  await db.query("begin");
  const checkedAt = new Date().toISOString();
  for (const r of rows) {
    await db.query(
      `insert into public.study_items
         (profile_id, external_id, kind, prompt, answer, options, correct_option, explanation, theme_id, subtopic,
          level, source_title, source_url, bible_refs, machine_translated, review_note, source_ok, source_checked_at,
          origin, status)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'ia',$19)
       on conflict (profile_id, external_id) where external_id is not null do update set
         kind = excluded.kind, prompt = excluded.prompt, answer = excluded.answer, options = excluded.options,
         correct_option = excluded.correct_option, explanation = excluded.explanation, theme_id = excluded.theme_id,
         subtopic = excluded.subtopic, level = excluded.level, source_title = excluded.source_title,
         source_url = excluded.source_url, bible_refs = excluded.bible_refs,
         machine_translated = excluded.machine_translated, review_note = excluded.review_note,
         source_ok = excluded.source_ok, source_checked_at = excluded.source_checked_at,
         origin = 'ia', status = excluded.status`,
      [
        profile.id,
        r.external_id,
        r.kind,
        r.prompt,
        r.answer,
        r.options,
        r.correct_option,
        r.explanation,
        r.theme_id,
        r.subtopic,
        r.level,
        r.source_title,
        r.source_url,
        r.bible_refs,
        r.machine_translated,
        r.review_note,
        r.source_ok,
        r.source_url && !skipLinkCheck ? checkedAt : null,
        status,
      ],
    );

    // Subtheme = last segment of the subtopic ("… · Batismo" -> "Batismo"); created when missing.
    const subName = r.subtopic?.split("·").pop()?.trim();
    if (r.theme_id && subName) {
      await db.query(
        `insert into public.subthemes (profile_id, theme_id, name, position)
         values ($1, $2, $3, coalesce((select max(position) from public.subthemes where profile_id = $1 and theme_id = $2), 0) + 1)
         on conflict (profile_id, theme_id, name) do nothing`,
        [profile.id, r.theme_id, subName],
      );
      await db.query(
        `update public.study_items set subtheme_id =
           (select id from public.subthemes where profile_id = $1 and theme_id = $2 and name = $3)
         where profile_id = $1 and external_id = $4`,
        [profile.id, r.theme_id, subName, r.external_id],
      );
    }
  }
  await db.query("commit");
  console.log(`\n${rows.length} itens gravados como ${approve ? "aprovados" : "rascunho"} no perfil "${profile.name}".`);
} catch (e) {
  await db.query("rollback");
  throw e;
} finally {
  await db.end();
}
