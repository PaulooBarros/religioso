import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ChapterHighlights } from "@/lib/highlights";
import { STUDY_ITEM_COLUMNS, type StudyItem, type Theme } from "@/lib/study";
import type { Bookmark, Note } from "@/lib/types";

const BOOKMARK_COLUMNS = "id, book_id, chapter, verse, name, tag, is_last_read, updated_at";

export async function getBookmarks(profileId: string): Promise<Bookmark[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bookmarks")
    .select(BOOKMARK_COLUMNS)
    .eq("profile_id", profileId)
    .order("is_last_read", { ascending: false })
    .order("updated_at", { ascending: false });
  return (data ?? []) as Bookmark[];
}

export async function getChapterBookmarks(profileId: string, bookId: number, chapter: number): Promise<Bookmark[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bookmarks")
    .select(BOOKMARK_COLUMNS)
    .eq("profile_id", profileId)
    .eq("book_id", bookId)
    .eq("chapter", chapter);
  return (data ?? []) as Bookmark[];
}

export async function getLastRead(profileId: string): Promise<Bookmark | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bookmarks")
    .select(BOOKMARK_COLUMNS)
    .eq("profile_id", profileId)
    .eq("is_last_read", true)
    .maybeSingle();
  return (data as Bookmark | null) ?? null;
}

export async function getChapterNotes(profileId: string, bookId: number, chapter: number): Promise<Note[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notes")
    .select("id, body, tags, created_at, updated_at, note_passages!inner(book_id, chapter, verse_start, verse_end)")
    .eq("profile_id", profileId)
    .eq("note_passages.book_id", bookId)
    .eq("note_passages.chapter", chapter)
    .order("created_at");
  return (data ?? []) as Note[];
}

export async function getNotes(profileId: string): Promise<Note[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notes")
    .select("id, body, tags, created_at, updated_at, theme_id, subtheme_id, note_passages(book_id, chapter, verse_start, verse_end)")
    .eq("profile_id", profileId)
    .order("updated_at", { ascending: false });
  return (data ?? []) as Note[];
}

export async function getChapterHighlights(
  profileId: string,
  bookId: number,
  chapter: number,
): Promise<ChapterHighlights> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("highlights")
    .select("verse, color")
    .eq("profile_id", profileId)
    .eq("book_id", bookId)
    .eq("chapter", chapter);
  return Object.fromEntries((data ?? []).map((h) => [h.verse, h.color])) as ChapterHighlights;
}

export async function getThemes(): Promise<Theme[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("themes").select("id, name").is("parent_id", null).order("position");
  return (data ?? []) as Theme[];
}

export async function getStudyItems(profileId: string): Promise<StudyItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("study_items")
    .select(STUDY_ITEM_COLUMNS)
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
  return (data ?? []) as StudyItem[];
}

export async function getStudyItem(profileId: string, id: string): Promise<StudyItem | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("study_items")
    .select(STUDY_ITEM_COLUMNS)
    .eq("profile_id", profileId)
    .eq("id", id)
    .maybeSingle();
  return (data as StudyItem | null) ?? null;
}

export async function getSources() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sources")
    .select("slug, name, author, year, license, license_url, url, verified_at, required_credit, notes")
    .order("name");
  return data ?? [];
}
