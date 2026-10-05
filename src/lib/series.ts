import "server-only";
import { createClient } from "@/lib/supabase/server";
import { parseBlocks, type TemplateId } from "@/lib/message-templates";
import { passagesOverlap, type PassageRange } from "@/lib/passage";

export type Series = {
  id: string;
  title: string;
  about: string | null;
  template: TemplateId;
  duration_min: number;
  audience: string | null;
  updated_at: string;
};

export type SeriesSummary = Series & { weeks: number; taught: number };

export type WeekStatus = "a-preparar" | "em-preparo" | "pronta" | "ensinada";

export type Week = PassageRange & {
  id: string;
  title: string;
  status: WeekStatus;
  taught_on: string | null;
};

/** A message already taught to the group. */
export type Taught = PassageRange & { id: string; title: string; taught_on: string };

const SERIES_COLUMNS = "id, title, about, template, duration_min, audience, updated_at";

export async function getSeriesList(profileId: string): Promise<SeriesSummary[]> {
  const supabase = await createClient();
  const [{ data: series }, { data: weeks }] = await Promise.all([
    supabase.from("series").select(SERIES_COLUMNS).eq("profile_id", profileId).order("updated_at", { ascending: false }),
    supabase.from("messages").select("series_id, taught_on").eq("profile_id", profileId).not("series_id", "is", null),
  ]);
  return ((series ?? []) as Series[]).map((s) => {
    const own = (weeks ?? []).filter((w) => w.series_id === s.id);
    return { ...s, weeks: own.length, taught: own.filter((w) => w.taught_on).length };
  });
}

export async function getSeries(profileId: string, id: string): Promise<{ series: Series; weeks: Week[] } | null> {
  const supabase = await createClient();
  const [{ data: series }, { data: rows }] = await Promise.all([
    supabase.from("series").select(SERIES_COLUMNS).eq("id", id).eq("profile_id", profileId).maybeSingle(),
    supabase
      .from("messages")
      .select("id, title, book_id, chapter, verse_start, verse_end, taught_on, ready_at, blocks")
      .eq("profile_id", profileId)
      .eq("series_id", id)
      .order("series_position")
      .order("created_at"),
  ]);
  if (!series) return null;
  const weeks = (rows ?? []).map(({ blocks, ready_at, ...w }) => {
    const started = (parseBlocks(blocks) ?? []).some((b) => b.text.trim());
    const status: WeekStatus = w.taught_on ? "ensinada" : ready_at ? "pronta" : started ? "em-preparo" : "a-preparar";
    return { ...w, status } as Week;
  });
  return { series: series as Series, weeks };
}

/** Title and week number of the series a message belongs to. */
export async function getSeriesOf(seriesId: string, messageId: string): Promise<{ id: string; title: string; week: number } | null> {
  const supabase = await createClient();
  const [{ data: series }, { data: rows }] = await Promise.all([
    supabase.from("series").select("id, title").eq("id", seriesId).maybeSingle(),
    supabase.from("messages").select("id").eq("series_id", seriesId).order("series_position").order("created_at"),
  ]);
  if (!series) return null;
  return { id: series.id, title: series.title, week: (rows ?? []).findIndex((r) => r.id === messageId) + 1 };
}

/** Everything already taught, newest first: the group's history. */
export async function getTaught(profileId: string): Promise<Taught[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("id, title, book_id, chapter, verse_start, verse_end, taught_on")
    .eq("profile_id", profileId)
    .not("taught_on", "is", null)
    .order("taught_on", { ascending: false });
  return (data ?? []) as Taught[];
}

/** Taught messages that share verses with the passage, other than the message itself. */
export function taughtBefore(taught: Taught[], passage: PassageRange, exceptId?: string): Taught[] {
  return taught.filter((t) => t.id !== exceptId && passagesOverlap(t, passage));
}
