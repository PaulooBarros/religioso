import "server-only";
import { createClient } from "@/lib/supabase/server";
import { dayKey, endOfDay, lastDays, NEW_PER_DAY, startOfDay, streak, type ReviewState } from "@/lib/srs";
import { STUDY_ITEM_COLUMNS, type StudyItem } from "@/lib/study";

export type ReviewMode = "dia" | "erros" | "tema";

/** Focus of a "tema" session: a theme, optionally narrowed to one subtheme. */
export type ReviewFocus = { themeId: string; subthemeId?: string | null };

export type SessionItem = StudyItem & {
  review: (ReviewState & { last_grade: number | null }) | null;
  theme_name: string | null;
};

type Row = StudyItem & {
  review_states: SessionItem["review"] | SessionItem["review"][] | null;
  themes: { name: string } | { name: string }[] | null;
};

const first = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

export async function approvedItems(profileId: string): Promise<SessionItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("study_items")
    .select(
      `${STUDY_ITEM_COLUMNS}, review_states(state, ease, interval_days, reps, lapses, due_at, last_grade), themes(name)`,
    )
    .eq("profile_id", profileId)
    .eq("status", "approved")
    .order("created_at");
  return ((data ?? []) as unknown as Row[]).map(({ review_states, themes, ...item }) => ({
    ...item,
    review: first(review_states),
    theme_name: first(themes)?.name ?? null,
  }));
}

/** New items already introduced today (first answer happened today). */
async function newIntroducedToday(profileId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("review_logs")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .is("prev_state", null)
    .gte("reviewed_at", startOfDay());
  return count ?? 0;
}

function split(items: SessionItem[], newLeft: number) {
  const limit = endOfDay();
  const due = items
    .filter((i) => i.review && i.review.due_at <= limit)
    .sort((a, b) => {
      // Learning steps first, then by due time.
      const la = a.review!.state === "review" ? 1 : 0;
      const lb = b.review!.state === "review" ? 1 : 0;
      return la - lb || a.review!.due_at.localeCompare(b.review!.due_at);
    });
  const fresh = items.filter((i) => !i.review).slice(0, Math.max(0, newLeft));
  return { due, fresh };
}

export async function getQueue(profileId: string, mode: ReviewMode, focus?: ReviewFocus): Promise<SessionItem[]> {
  const items = await approvedItems(profileId);
  if (mode === "tema") {
    if (!focus) return [];
    // Every item of the theme: overdue first, then new, then the rest by due date.
    const inFocus = items.filter(
      (i) => i.theme_id === focus.themeId && (!focus.subthemeId || i.subtheme_id === focus.subthemeId),
    );
    const now = new Date().toISOString();
    const rank = (i: SessionItem) => (!i.review ? 1 : i.review.due_at <= now ? 0 : 2);
    return inFocus.sort(
      (a, b) => rank(a) - rank(b) || (a.review?.due_at ?? "").localeCompare(b.review?.due_at ?? ""),
    );
  }
  if (mode === "erros") {
    return items
      .filter((i) => i.review?.last_grade === 1)
      .sort((a, b) => a.review!.due_at.localeCompare(b.review!.due_at));
  }
  const { due, fresh } = split(items, NEW_PER_DAY - (await newIntroducedToday(profileId)));
  return [...due, ...fresh];
}

export type ReviewOverview = {
  due: number;
  fresh: number;
  cards: number;
  mcq: number;
  errors: number;
  approved: number;
  drafts: number;
  streak: { count: number; todayDone: boolean };
  last14: { day: string; done: boolean }[];
};

export async function getOverview(profileId: string): Promise<ReviewOverview> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 400 * 86_400_000).toISOString();
  const [items, introduced, logs, drafts] = await Promise.all([
    approvedItems(profileId),
    newIntroducedToday(profileId),
    supabase
      .from("review_logs")
      .select("reviewed_at")
      .eq("profile_id", profileId)
      .gte("reviewed_at", since)
      .order("reviewed_at", { ascending: false })
      .limit(10000),
    supabase
      .from("study_items")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profileId)
      .eq("status", "draft"),
  ]);
  const { due, fresh } = split(items, NEW_PER_DAY - introduced);
  const queue = [...due, ...fresh];
  const days = new Set((logs.data ?? []).map((l) => dayKey(new Date(l.reviewed_at as string))));
  return {
    due: due.length,
    fresh: fresh.length,
    cards: queue.filter((i) => i.kind === "card").length,
    mcq: queue.filter((i) => i.kind === "mcq").length,
    errors: items.filter((i) => i.review?.last_grade === 1).length,
    approved: items.length,
    drafts: drafts.count ?? 0,
    streak: streak(days),
    last14: lastDays(14).map((day) => ({ day, done: days.has(day) })),
  };
}
