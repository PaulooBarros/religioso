import "server-only";
import { createClient } from "@/lib/supabase/server";
import { approvedItems, type SessionItem } from "@/lib/review";
import { itemStatus, masteryOf } from "@/lib/srs";
import type { Subtheme, Theme } from "@/lib/study";
import type { Note } from "@/lib/types";

export type Progress = {
  total: number;
  mastered: number;
  /** Items reviewed at least once. 0 = "Não iniciado". */
  started: number;
  dueThisWeek: number;
  /** 0..100, average progress towards mastery. */
  percent: number;
};

export function progressOf(items: SessionItem[], now = Date.now()): Progress {
  const week = new Date(now + 7 * 86_400_000).toISOString();
  const total = items.length;
  const sum = items.reduce((s, i) => s + masteryOf(i.review), 0);
  return {
    total,
    mastered: items.filter((i) => itemStatus(i.review) === "dominada").length,
    started: items.filter((i) => i.review).length,
    dueThisWeek: items.filter((i) => i.review && i.review.due_at <= week).length,
    percent: total ? Math.round((sum / total) * 100) : 0,
  };
}

export type ThemeSummary = Theme & { position: number; progress: Progress };

export async function getTrail(profileId: string, preloaded?: SessionItem[]): Promise<ThemeSummary[]> {
  const supabase = await createClient();
  const [{ data: themes }, items] = await Promise.all([
    supabase.from("themes").select("id, name, position").is("parent_id", null).order("position"),
    preloaded ?? approvedItems(profileId),
  ]);
  return ((themes ?? []) as (Theme & { position: number })[]).map((t) => ({
    ...t,
    progress: progressOf(items.filter((i) => i.theme_id === t.id)),
  }));
}

export type Reading = {
  id: string;
  subtheme_id: string | null;
  title: string;
  url: string | null;
  bible_ref: string | null;
  read_at: string | null;
};

export type SubthemeSummary = Subtheme & { progress: Progress };

export type ThemePage = {
  trail: ThemeSummary[];
  theme: ThemeSummary;
  subthemes: SubthemeSummary[];
  /** Items of the theme (all subthemes), for the selected-subtheme list. */
  items: SessionItem[];
  readings: Reading[];
  notes: Note[];
  drafts: number;
};

export async function getThemePage(profileId: string, themeId: string): Promise<ThemePage | null> {
  const supabase = await createClient();
  const all = await approvedItems(profileId);
  const [trail, subthemes, readings, notes, drafts] = await Promise.all([
    getTrail(profileId, all),
    supabase
      .from("subthemes")
      .select("id, theme_id, name, position")
      .eq("profile_id", profileId)
      .eq("theme_id", themeId)
      .order("position")
      .order("name"),
    supabase
      .from("readings")
      .select("id, subtheme_id, title, url, bible_ref, read_at")
      .eq("profile_id", profileId)
      .eq("theme_id", themeId)
      .order("position")
      .order("created_at"),
    supabase
      .from("notes")
      .select("id, body, tags, created_at, updated_at, theme_id, subtheme_id, note_passages(book_id, chapter, verse_start, verse_end)")
      .eq("profile_id", profileId)
      .eq("theme_id", themeId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("study_items")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profileId)
      .eq("theme_id", themeId)
      .eq("status", "draft"),
  ]);
  const theme = trail.find((t) => t.id === themeId);
  if (!theme) return null;

  const items = all.filter((i) => i.theme_id === themeId);
  return {
    trail,
    theme,
    subthemes: ((subthemes.data ?? []) as Subtheme[]).map((s) => ({
      ...s,
      progress: progressOf(items.filter((i) => i.subtheme_id === s.id)),
    })),
    items,
    readings: (readings.data ?? []) as Reading[],
    notes: (notes.data ?? []) as Note[],
    drafts: drafts.count ?? 0,
  };
}

export async function getSubthemes(profileId: string): Promise<Subtheme[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subthemes")
    .select("id, theme_id, name, position")
    .eq("profile_id", profileId)
    .order("position")
    .order("name");
  return (data ?? []) as Subtheme[];
}
