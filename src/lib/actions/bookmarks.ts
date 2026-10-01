"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { currentProfileId } from "@/lib/session";
import type { ActionResult, Bookmark } from "@/lib/types";

const COLUMNS = "id, book_id, chapter, verse, name, tag, is_last_read, updated_at";

type BookmarkInput = {
  bookId: number;
  chapter: number;
  verse: number | null;
  name?: string | null;
  tag?: string | null;
};

function clean(s: string | null | undefined, max: number): string | null {
  const t = (s ?? "").trim();
  return t ? t.slice(0, max) : null;
}

export async function saveBookmark(input: BookmarkInput): Promise<ActionResult<Bookmark>> {
  const profileId = await currentProfileId();
  if (!profileId) return { ok: false, error: "Escolha um perfil para salvar marcadores." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookmarks")
    .insert({
      profile_id: profileId,
      book_id: input.bookId,
      chapter: input.chapter,
      verse: input.verse,
      name: clean(input.name, 120),
      tag: clean(input.tag, 40)?.toLowerCase() ?? null,
    })
    .select(COLUMNS)
    .single();
  if (error) return { ok: false, error: "Não foi possível salvar o marcador." };
  revalidatePath("/biblia", "layout");
  return { ok: true, data: data as Bookmark };
}

export async function removeBookmark(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("bookmarks").delete().eq("id", id).eq("is_last_read", false);
  if (error) return { ok: false, error: "Não foi possível remover o marcador." };
  revalidatePath("/biblia", "layout");
  return { ok: true, data: undefined };
}

/** Automatic "onde parei" bookmark: one per profile, moved as you read. */
export async function markLastRead(bookId: number, chapter: number, verse: number | null): Promise<void> {
  const profileId = await currentProfileId();
  if (!profileId) return;
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("profile_id", profileId)
    .eq("is_last_read", true)
    .maybeSingle();
  if (existing) {
    await supabase.from("bookmarks").update({ book_id: bookId, chapter, verse }).eq("id", existing.id);
  } else {
    await supabase
      .from("bookmarks")
      .insert({ profile_id: profileId, book_id: bookId, chapter, verse, name: "Onde parei", is_last_read: true });
  }
}
