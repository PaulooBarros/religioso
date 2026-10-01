"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { currentProfileId } from "@/lib/session";
import type { ActionResult, Note } from "@/lib/types";

const COLUMNS = "id, body, tags, created_at, updated_at, note_passages(book_id, chapter, verse_start, verse_end)";

/** A note is linked to a passage, to a theme (and subtheme), or both. */
type NoteInput = {
  body: string;
  tags: string[];
  bookId?: number | null;
  chapter?: number | null;
  verseStart?: number | null;
  verseEnd?: number | null;
  themeId?: string | null;
  subthemeId?: string | null;
};

function cleanTags(tags: string[]): string[] {
  return [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 12);
}

export async function createNote(input: NoteInput): Promise<ActionResult<Note>> {
  const profileId = await currentProfileId();
  if (!profileId) return { ok: false, error: "Escolha um perfil para salvar notas." };
  const body = input.body.trim();
  if (!body) return { ok: false, error: "A nota está vazia." };
  const hasPassage = Boolean(input.bookId && input.chapter);
  if (!hasPassage && !input.themeId) return { ok: false, error: "A nota precisa de uma passagem ou de um tema." };

  const supabase = await createClient();
  const { data: note, error } = await supabase
    .from("notes")
    .insert({
      profile_id: profileId,
      body,
      tags: cleanTags(input.tags),
      theme_id: input.themeId ?? null,
      subtheme_id: input.subthemeId ?? null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: "Não foi possível salvar a nota." };

  if (hasPassage) {
    const { error: passageError } = await supabase.from("note_passages").insert({
      note_id: note.id,
      book_id: input.bookId,
      chapter: input.chapter,
      verse_start: input.verseStart ?? null,
      verse_end: input.verseEnd && input.verseEnd !== input.verseStart ? input.verseEnd : null,
    });
    if (passageError) {
      await supabase.from("notes").delete().eq("id", note.id);
      return { ok: false, error: "Não foi possível ligar a nota à passagem." };
    }
  }

  const { data } = await supabase.from("notes").select(COLUMNS).eq("id", note.id).single();
  revalidatePath("/", "layout");
  return { ok: true, data: data as Note };
}

export async function updateNote(id: string, body: string, tags: string[]): Promise<ActionResult<Note>> {
  const text = body.trim();
  if (!text) return { ok: false, error: "A nota está vazia." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .update({ body: text, tags: cleanTags(tags) })
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) return { ok: false, error: "Não foi possível salvar a nota." };
  revalidatePath("/", "layout");
  return { ok: true, data: data as Note };
}

export async function deleteNote(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) return { ok: false, error: "Não foi possível apagar a nota." };
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}
