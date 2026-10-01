"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { currentProfileId } from "@/lib/session";
import { schedule, type Grade, type ReviewState } from "@/lib/srs";
import type { ActionResult } from "@/lib/types";

const STATE_COLUMNS = "state, ease, interval_days, reps, lapses, due_at";

/** Records an answer and schedules the item. The server owns the clock. */
export async function gradeItem(
  itemId: string,
  grade: Grade,
  mode: "dia" | "erros" | "tema",
): Promise<ActionResult<{ logId: string; review: ReviewState & { last_grade: number } }>> {
  if (![1, 2, 3, 4].includes(grade)) return { ok: false, error: "Avaliação inválida." };
  if (!["dia", "erros", "tema"].includes(mode)) return { ok: false, error: "Modo inválido." };
  const profileId = await currentProfileId();
  if (!profileId) return { ok: false, error: "Escolha um perfil." };
  const supabase = await createClient();

  const { data: item } = await supabase
    .from("study_items")
    .select("id, status")
    .eq("id", itemId)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (!item || item.status !== "approved") return { ok: false, error: "Item indisponível para revisão." };

  const { data: prev } = await supabase.from("review_states").select(STATE_COLUMNS).eq("item_id", itemId).maybeSingle();
  const now = new Date();
  const next = schedule((prev as ReviewState | null) ?? null, grade, now);

  const { error: stateError } = await supabase.from("review_states").upsert({
    item_id: itemId,
    profile_id: profileId,
    ...next,
    last_grade: grade,
    last_reviewed_at: now.toISOString(),
  });
  if (stateError) return { ok: false, error: "Não foi possível salvar a revisão." };

  const { data: log, error: logError } = await supabase
    .from("review_logs")
    .insert({
      profile_id: profileId,
      item_id: itemId,
      grade,
      mode,
      reviewed_at: now.toISOString(),
      prev_state: prev ?? null,
      next_due_at: next.due_at,
    })
    .select("id")
    .single();
  if (logError) return { ok: false, error: "Não foi possível registrar a revisão." };

  revalidatePath("/hoje");
  return { ok: true, data: { logId: log.id, review: { ...next, last_grade: grade } } };
}

/** Undoes an answer: restores the previous schedule and removes the log entry. */
export async function undoGrade(logId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: log } = await supabase
    .from("review_logs")
    .select("id, item_id, profile_id, prev_state")
    .eq("id", logId)
    .maybeSingle();
  if (!log) return { ok: false, error: "Nada para desfazer." };

  const prev = log.prev_state as (ReviewState & { last_grade?: number }) | null;
  const { data: earlier } = await supabase
    .from("review_logs")
    .select("grade, reviewed_at")
    .eq("item_id", log.item_id)
    .neq("id", log.id)
    .order("reviewed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const restore = prev
    ? await supabase
        .from("review_states")
        .update({
          ...prev,
          last_grade: earlier?.grade ?? null,
          last_reviewed_at: earlier?.reviewed_at ?? null,
        })
        .eq("item_id", log.item_id)
    : await supabase.from("review_states").delete().eq("item_id", log.item_id);
  if (restore.error) return { ok: false, error: "Não foi possível desfazer." };

  await supabase.from("review_logs").delete().eq("id", log.id);
  revalidatePath("/hoje");
  return { ok: true, data: undefined };
}
