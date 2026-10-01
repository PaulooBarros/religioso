import "server-only";
import { createClient } from "@/lib/supabase/server";
import { itemStatus, masteryOf, startOfDay, type ItemStatus, type ReviewState } from "@/lib/srs";

export type Catechism = {
  id: string;
  name: string;
  year: string;
  original_lang: string;
  source_url: string;
  translation_note: string;
};

export type CatechismQuestion = {
  number: number;
  question_original: string;
  answer_original: string;
  question_en: string | null;
  answer_en: string | null;
  question_pt: string;
  answer_pt: string;
  bible_refs: string[];
};

export type Enrollment = { per_day: number; state: "active" | "paused"; started_at: string };

const first = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

/** The original text shown under the translated answer, so it can always be checked. */
function originalBlock(c: Catechism, q: CatechismQuestion): string {
  const lines = [`Original (${c.original_lang}, ${c.year}): ${q.question_original} — ${q.answer_original}`];
  if (q.question_en && q.answer_en) lines.push(`Tradução inglesa de 1863: ${q.question_en} — ${q.answer_en}`);
  return lines.join("\n\n");
}

/**
 * Releases today's new questions of every active enrollment as study items.
 * Safe to call on every page load: it only adds what is still missing today.
 */
export async function releaseCatechismItems(profileId: string): Promise<void> {
  const supabase = await createClient();
  const { data: enrollments } = await supabase
    .from("catechism_enrollments")
    .select("catechism_id, per_day, catechisms(id, name, year, original_lang, source_url, translation_note)")
    .eq("profile_id", profileId)
    .eq("state", "active");
  if (!enrollments?.length) return;

  const today = startOfDay();
  for (const e of enrollments) {
    const catechism = first(e.catechisms as unknown as Catechism | Catechism[] | null);
    if (!catechism) continue;
    const { data: released } = await supabase
      .from("study_items")
      .select("catechism_number, created_at")
      .eq("profile_id", profileId)
      .eq("catechism_id", e.catechism_id);
    const done = new Set((released ?? []).map((r) => r.catechism_number as number));
    const releasedToday = (released ?? []).filter((r) => (r.created_at as string) >= today).length;
    const room = e.per_day - releasedToday;
    if (room <= 0) continue;

    const { data: questions } = await supabase
      .from("catechism_questions")
      .select("number, question_original, answer_original, question_en, answer_en, question_pt, answer_pt, bible_refs")
      .eq("catechism_id", e.catechism_id)
      .order("number");
    const next = ((questions ?? []) as CatechismQuestion[]).filter((q) => !done.has(q.number)).slice(0, room);
    if (!next.length) continue;

    // The unique index (profile, catechism, number) makes concurrent calls harmless.
    await supabase.from("study_items").upsert(
      next.map((q) => ({
        profile_id: profileId,
        kind: "card",
        prompt: q.question_pt,
        answer: q.answer_pt,
        explanation: originalBlock(catechism, q),
        level: 1,
        source_title: `${catechism.name}, pergunta ${q.number}`,
        source_url: catechism.source_url,
        source_ok: true,
        source_checked_at: new Date().toISOString(),
        bible_refs: q.bible_refs,
        machine_translated: true,
        origin: "catecismo",
        status: "approved",
        subtopic: `${catechism.name} · P. ${q.number}`,
        catechism_id: catechism.id,
        catechism_number: q.number,
      })),
      { onConflict: "profile_id,catechism_id,catechism_number", ignoreDuplicates: true },
    );
  }
}

export type CatechismSummary = Catechism & {
  total: number;
  released: number;
  mastered: number;
  /** 0..100 over the whole catechism. */
  percent: number;
  enrollment: Enrollment | null;
};

type ReleasedRow = {
  id: string;
  catechism_id: string;
  catechism_number: number;
  review_states: Pick<ReviewState, "state" | "interval_days"> | Pick<ReviewState, "state" | "interval_days">[] | null;
};

async function releasedItems(profileId: string, catechismId?: string): Promise<ReleasedRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("study_items")
    .select("id, catechism_id, catechism_number, review_states(state, interval_days)")
    .eq("profile_id", profileId)
    .not("catechism_id", "is", null);
  if (catechismId) query = query.eq("catechism_id", catechismId);
  const { data } = await query;
  return (data ?? []) as unknown as ReleasedRow[];
}

export async function getCatechisms(profileId: string): Promise<CatechismSummary[]> {
  await releaseCatechismItems(profileId);
  const supabase = await createClient();
  const [{ data: catechisms }, { data: counts }, { data: enrollments }, released] = await Promise.all([
    supabase.from("catechisms").select("id, name, year, original_lang, source_url, translation_note").order("position"),
    supabase.from("catechism_questions").select("catechism_id"),
    supabase.from("catechism_enrollments").select("catechism_id, per_day, state, started_at").eq("profile_id", profileId),
    releasedItems(profileId),
  ]);
  return ((catechisms ?? []) as Catechism[]).map((c) => {
    const total = (counts ?? []).filter((q) => q.catechism_id === c.id).length;
    const mine = released.filter((r) => r.catechism_id === c.id);
    const mastery = mine.reduce((s, r) => s + masteryOf(first(r.review_states)), 0);
    const e = (enrollments ?? []).find((x) => x.catechism_id === c.id);
    return {
      ...c,
      total,
      released: mine.length,
      mastered: mine.filter((r) => itemStatus(first(r.review_states)) === "dominada").length,
      percent: total ? Math.round((mastery / total) * 100) : 0,
      enrollment: e ? { per_day: e.per_day, state: e.state as Enrollment["state"], started_at: e.started_at } : null,
    };
  });
}

export type QuestionRow = CatechismQuestion & {
  /** null = not released to this profile yet. */
  status: ItemStatus | null;
  itemId: string | null;
};

export async function getCatechism(
  profileId: string,
  id: string,
): Promise<{ catechism: CatechismSummary; questions: QuestionRow[] } | null> {
  const all = await getCatechisms(profileId);
  const catechism = all.find((c) => c.id === id);
  if (!catechism) return null;
  const supabase = await createClient();
  const [{ data: questions }, released] = await Promise.all([
    supabase
      .from("catechism_questions")
      .select("number, question_original, answer_original, question_en, answer_en, question_pt, answer_pt, bible_refs")
      .eq("catechism_id", id)
      .order("number"),
    releasedItems(profileId, id),
  ]);
  const byNumber = new Map(released.map((r) => [r.catechism_number, r]));
  return {
    catechism,
    questions: ((questions ?? []) as CatechismQuestion[]).map((q) => {
      const r = byNumber.get(q.number);
      return { ...q, status: r ? itemStatus(first(r.review_states)) : null, itemId: r?.id ?? null };
    }),
  };
}
