"use server";

import { createClient } from "@/lib/supabase/server";
import { currentProfileId } from "@/lib/session";
import { HIGHLIGHT_COLORS, type HighlightColor } from "@/lib/highlights";
import type { ActionResult } from "@/lib/types";

function validVerses(verses: number[]): number[] {
  return [...new Set(verses)].filter((v) => Number.isInteger(v) && v > 0).slice(0, 200);
}

export async function setHighlight(
  bookId: number,
  chapter: number,
  verses: number[],
  color: HighlightColor,
): Promise<ActionResult> {
  const profileId = await currentProfileId();
  if (!profileId) return { ok: false, error: "Escolha um perfil para grifar." };
  if (!HIGHLIGHT_COLORS.some((c) => c.id === color)) return { ok: false, error: "Cor inválida." };
  const supabase = await createClient();
  const { error } = await supabase.from("highlights").upsert(
    validVerses(verses).map((verse) => ({ profile_id: profileId, book_id: bookId, chapter, verse, color })),
    { onConflict: "profile_id,book_id,chapter,verse" },
  );
  if (error) return { ok: false, error: "Não foi possível grifar." };
  return { ok: true, data: undefined };
}

export async function removeHighlight(bookId: number, chapter: number, verses: number[]): Promise<ActionResult> {
  const profileId = await currentProfileId();
  if (!profileId) return { ok: false, error: "Escolha um perfil." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("highlights")
    .delete()
    .eq("profile_id", profileId)
    .eq("book_id", bookId)
    .eq("chapter", chapter)
    .in("verse", validVerses(verses));
  if (error) return { ok: false, error: "Não foi possível remover o grifo." };
  return { ok: true, data: undefined };
}
