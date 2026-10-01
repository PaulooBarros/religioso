"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { currentProfileId } from "@/lib/session";
import type { ActionResult } from "@/lib/types";

function refresh(id: string) {
  revalidatePath("/catecismos");
  revalidatePath(`/catecismos/${id}`);
  revalidatePath("/hoje");
}

/** Starts (or resumes) a catechism at the given pace; new questions arrive daily. */
export async function enrollCatechism(catechismId: string, perDay: number): Promise<ActionResult> {
  const profileId = await currentProfileId();
  if (!profileId) return { ok: false, error: "Escolha um perfil." };
  const pace = Math.round(perDay);
  if (!(pace >= 1 && pace <= 20)) return { ok: false, error: "Escolha de 1 a 20 perguntas por dia." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("catechism_enrollments")
    .upsert({ profile_id: profileId, catechism_id: catechismId, per_day: pace, state: "active" });
  if (error) return { ok: false, error: "Não foi possível ativar o catecismo." };
  refresh(catechismId);
  return { ok: true, data: undefined };
}

/** Pausing stops new questions; the ones already released stay in the review. */
export async function pauseCatechism(catechismId: string): Promise<ActionResult> {
  const profileId = await currentProfileId();
  if (!profileId) return { ok: false, error: "Escolha um perfil." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("catechism_enrollments")
    .update({ state: "paused" })
    .eq("profile_id", profileId)
    .eq("catechism_id", catechismId);
  if (error) return { ok: false, error: "Não foi possível pausar." };
  refresh(catechismId);
  return { ok: true, data: undefined };
}
