"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentProfileId } from "@/lib/session";
import { bookById } from "@/lib/bible/books";
import { verseCounts } from "@/lib/bible/text";
import { MAX_PLAN_DAYS, PLAN_PRESETS, planChapters, planProgress, realignedStart } from "@/lib/reading-plan";
import { dayKey } from "@/lib/srs";
import type { ActionResult } from "@/lib/types";

export type PlanFormState = { error?: string };

const BASE = "/biblia/plano";

function refresh(id?: string) {
  revalidatePath(BASE);
  if (id) revalidatePath(`${BASE}/${id}`);
  revalidatePath("/hoje");
}

/** Creates a plan from a preset, or from a custom book range and number of days. */
export async function createReadingPlan(_prev: PlanFormState, form: FormData): Promise<PlanFormState> {
  const profileId = await currentProfileId();
  if (!profileId) return { error: "Escolha um perfil." };

  const preset = PLAN_PRESETS.find((p) => p.id === String(form.get("preset") ?? ""));
  const bookStart = preset?.bookStart ?? Number(form.get("book_start"));
  const bookEnd = preset?.bookEnd ?? Number(form.get("book_end"));
  const first = bookById(bookStart);
  const last = bookById(bookEnd);
  if (!first || !last) return { error: "Escolha os livros." };
  if (bookEnd < bookStart) return { error: "O livro final vem antes do inicial." };

  const chapters = planChapters(await verseCounts(), bookStart, bookEnd).length;
  const typedDays = preset?.days ?? Number(form.get("days"));
  if (!Number.isInteger(typedDays) || typedDays < 1 || typedDays > MAX_PLAN_DAYS) {
    return { error: `O plano tem de 1 a ${MAX_PLAN_DAYS} dias.` };
  }
  // Chapters are never split: at most one day per chapter.
  const days = Math.min(typedDays, chapters);

  const today = dayKey(new Date());
  const start = String(form.get("start_date") ?? "");
  const startDate = /^\d{4}-\d{2}-\d{2}$/.test(start) ? start : today;
  const title =
    String(form.get("title") ?? "").trim().slice(0, 200) ||
    preset?.title ||
    `${first.id === last.id ? first.name : `${first.name} a ${last.name}`} em ${days} ${days === 1 ? "dia" : "dias"}`;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reading_plans")
    .insert({ profile_id: profileId, title, book_start: bookStart, book_end: bookEnd, days, start_date: startDate })
    .select("id")
    .single();
  if (error || !data) return { error: "Não foi possível criar o plano." };
  refresh();
  redirect(`${BASE}/${data.id}`);
}

export async function setPlanDayRead(planId: string, day: number, read: boolean): Promise<ActionResult> {
  if (!Number.isInteger(day) || day < 1) return { ok: false, error: "Dia inválido." };
  const supabase = await createClient();
  const { data: plan } = await supabase.from("reading_plans").select("days").eq("id", planId).maybeSingle();
  if (!plan || day > plan.days) return { ok: false, error: "Dia inválido." };
  const { error } = read
    ? await supabase.from("reading_plan_days").upsert({ plan_id: planId, day }, { onConflict: "plan_id,day", ignoreDuplicates: true })
    : await supabase.from("reading_plan_days").delete().eq("plan_id", planId).eq("day", day);
  if (error) return { ok: false, error: "Não foi possível atualizar." };
  refresh(planId);
  return { ok: true, data: undefined };
}

/** Moves the start date so the first unread day falls on today. */
export async function realignPlan(planId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const [{ data: plan }, { data: rows }] = await Promise.all([
    supabase.from("reading_plans").select("days, start_date").eq("id", planId).maybeSingle(),
    supabase.from("reading_plan_days").select("day").eq("plan_id", planId),
  ]);
  if (!plan) return { ok: false, error: "Plano não encontrado." };
  const today = dayKey(new Date());
  const progress = planProgress(plan.days, (rows ?? []).map((r) => r.day as number), plan.start_date, today);
  if (progress.next === null) return { ok: false, error: "O plano já está concluído." };
  const { error } = await supabase.from("reading_plans").update({ start_date: realignedStart(progress.next, today) }).eq("id", planId);
  if (error) return { ok: false, error: "Não foi possível reajustar as datas." };
  refresh(planId);
  return { ok: true, data: undefined };
}

export async function setPlanArchived(planId: string, archived: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("reading_plans")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", planId);
  if (error) return { ok: false, error: "Não foi possível atualizar o plano." };
  refresh(planId);
  return { ok: true, data: undefined };
}

export async function deleteReadingPlan(planId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("reading_plans").delete().eq("id", planId);
  if (error) return { ok: false, error: "Não foi possível excluir o plano." };
  refresh();
  return { ok: true, data: undefined };
}
