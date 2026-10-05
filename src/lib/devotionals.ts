import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  dayState,
  isWritten,
  parseDevotionalBlocks,
  scheduleDates,
  type DayState,
  type DevotionalBlock,
  type DevotionalTemplateId,
  type SeriesStatus,
} from "@/lib/devotional-plan";
import { dayKey } from "@/lib/srs";

export type DevotionalSeries = {
  id: string;
  title: string;
  about: string | null;
  description: string | null;
  template: DevotionalTemplateId;
  weekdays: number[];
  status: SeriesStatus;
  anchor_position: number | null;
  anchor_date: string | null;
  updated_at: string;
};

export type DevotionalSeriesSummary = DevotionalSeries & { days: number; read: number; written: number };

export type Devotional = {
  id: string;
  series_id: string;
  position: number;
  title: string;
  book_id: number;
  chapter: number;
  verse_start: number | null;
  verse_end: number | null;
  blocks: DevotionalBlock[];
  read_at: string | null;
  note: string | null;
};

/** A day placed in the calendar of its series. */
export type ScheduledDay = Devotional & { number: number; date: string | null; state: DayState; written: boolean };

const SERIES_COLUMNS = "id, title, about, description, template, weekdays, status, anchor_position, anchor_date, updated_at";
const DAY_COLUMNS = "id, series_id, position, title, book_id, chapter, verse_start, verse_end, blocks, read_at, note";

type DayRow = Omit<Devotional, "blocks"> & { blocks: unknown };

const toDay = (row: DayRow): Devotional => ({ ...row, blocks: parseDevotionalBlocks(row.blocks) ?? [] });

export async function getDevotionalSeriesList(profileId: string): Promise<DevotionalSeriesSummary[]> {
  const supabase = await createClient();
  const [{ data: series }, { data: days }] = await Promise.all([
    supabase.from("devotional_series").select(SERIES_COLUMNS).eq("profile_id", profileId).order("updated_at", { ascending: false }),
    supabase.from("devotionals").select("series_id, read_at, blocks").eq("profile_id", profileId),
  ]);
  return ((series ?? []) as DevotionalSeries[]).map((s) => {
    const own = (days ?? []).filter((d) => d.series_id === s.id);
    return {
      ...s,
      days: own.length,
      read: own.filter((d) => d.read_at).length,
      written: own.filter((d) => isWritten(parseDevotionalBlocks(d.blocks) ?? [])).length,
    };
  });
}

/** Places the days of a series in its calendar. Only active series have live dates. */
export function scheduleDays(series: DevotionalSeries, days: Devotional[], today = dayKey(new Date())): ScheduledDay[] {
  const scheduled = Boolean(series.anchor_date && series.anchor_position) && series.status !== "draft";
  const dates = scheduled ? scheduleDates(days.length, series.anchor_position!, series.anchor_date!, series.weekdays) : [];
  return days.map((d, i) => {
    const date = scheduled ? dates[i] : null;
    // A paused or archived series has no "today": its dates only come back when it is resumed.
    const live = scheduled && series.status === "active";
    const state = d.read_at ? "lido" : live ? dayState(false, date, true, today) : scheduled && i + 1 < series.anchor_position! ? "pulado" : "sem-data";
    return { ...d, number: i + 1, date: live ? date : null, state, written: isWritten(d.blocks) };
  });
}

export async function getDevotionalSeries(profileId: string, id: string): Promise<{ series: DevotionalSeries; days: ScheduledDay[] } | null> {
  const supabase = await createClient();
  const [{ data: series }, { data: rows }] = await Promise.all([
    supabase.from("devotional_series").select(SERIES_COLUMNS).eq("id", id).eq("profile_id", profileId).maybeSingle(),
    supabase.from("devotionals").select(DAY_COLUMNS).eq("series_id", id).eq("profile_id", profileId).order("position").order("created_at"),
  ]);
  if (!series) return null;
  const s = series as DevotionalSeries;
  return { series: s, days: scheduleDays(s, ((rows ?? []) as DayRow[]).map(toDay)) };
}
