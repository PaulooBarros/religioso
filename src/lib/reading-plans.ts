import "server-only";
import { createClient } from "@/lib/supabase/server";
import { bookById } from "@/lib/bible/books";
import { verseCounts } from "@/lib/bible/text";
import { addDays, buildPlan, dayLabel, planProgress, type PlanChapter, type PlanProgress } from "@/lib/reading-plan";
import { dayKey } from "@/lib/srs";

export type ReadingPlan = {
  id: string;
  title: string;
  book_start: number;
  book_end: number;
  days: number;
  start_date: string;
  archived_at: string | null;
};

export type PlanDay = { number: number; date: string; label: string; chapters: PlanChapter[]; read: boolean };

export type PlanView = { plan: ReadingPlan; days: PlanDay[]; progress: PlanProgress };

const PLAN_COLUMNS = "id, title, book_start, book_end, days, start_date, archived_at";

const abbrev = (bookId: number) => bookById(bookId)?.abbrev ?? "?";

async function view(plan: ReadingPlan, done: number[]): Promise<PlanView> {
  const schedule = buildPlan(await verseCounts(), plan.book_start, plan.book_end, plan.days);
  const read = new Set(done);
  const days = schedule.map((chapters, i) => ({
    number: i + 1,
    date: addDays(plan.start_date, i),
    label: dayLabel(chapters, abbrev),
    chapters,
    read: read.has(i + 1),
  }));
  return { plan, days, progress: planProgress(days.length, done, plan.start_date, dayKey(new Date())) };
}

/** Every plan of the profile with its days and progress, newest first. */
export async function getReadingPlans(profileId: string): Promise<PlanView[]> {
  const supabase = await createClient();
  const { data: plans } = await supabase
    .from("reading_plans")
    .select(PLAN_COLUMNS)
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
  if (!plans?.length) return [];
  const { data: rows } = await supabase
    .from("reading_plan_days")
    .select("plan_id, day")
    .in("plan_id", plans.map((p) => p.id));
  return Promise.all(
    (plans as ReadingPlan[]).map((p) => view(p, (rows ?? []).filter((r) => r.plan_id === p.id).map((r) => r.day as number))),
  );
}

export async function getReadingPlan(profileId: string, id: string): Promise<PlanView | null> {
  const supabase = await createClient();
  const [{ data: plan }, { data: rows }] = await Promise.all([
    supabase.from("reading_plans").select(PLAN_COLUMNS).eq("id", id).eq("profile_id", profileId).maybeSingle(),
    supabase.from("reading_plan_days").select("day").eq("plan_id", id),
  ]);
  if (!plan) return null;
  return view(plan as ReadingPlan, (rows ?? []).map((r) => r.day as number));
}
