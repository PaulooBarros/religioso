"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentProfileId } from "@/lib/session";
import { schedule, startOfDay, type ReviewState } from "@/lib/srs";
import type { ActionResult } from "@/lib/types";

export type ExamFormState = { error?: string };

const TIME_LIMITS = [0, 15, 30, 60];

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Draws the questions and opens the exam. */
export async function startExam(_prev: ExamFormState, form: FormData): Promise<ExamFormState> {
  const profileId = await currentProfileId();
  if (!profileId) return { error: "Escolha um perfil." };

  const themeIds = form.getAll("theme").map(String).filter(Boolean);
  const wanted = Math.round(Number(form.get("count")) || 10);
  const limit = Number(form.get("time")) || 0;
  if (!TIME_LIMITS.includes(limit)) return { error: "Tempo inválido." };
  if (wanted < 1 || wanted > 100) return { error: "Número de questões inválido." };

  const supabase = await createClient();
  let query = supabase
    .from("study_items")
    .select("id, theme_id, prompt, options, correct_option, explanation, source_title, source_url")
    .eq("profile_id", profileId)
    .eq("kind", "mcq")
    .eq("status", "approved");
  if (themeIds.length) query = query.in("theme_id", themeIds);
  const { data: pool } = await query;
  if (!pool?.length) return { error: "Não há questões de múltipla escolha aprovadas nesses temas." };

  const picked = shuffle(pool).slice(0, wanted);
  const { data: exam, error } = await supabase
    .from("exams")
    .insert({ profile_id: profileId, theme_ids: themeIds, time_limit_min: limit || null, total: picked.length })
    .select("id")
    .single();
  if (error) return { error: "Não foi possível criar o simulado." };

  const { error: answersError } = await supabase.from("exam_answers").insert(
    picked.map((item, i) => ({
      exam_id: exam.id,
      position: i + 1,
      item_id: item.id,
      theme_id: item.theme_id,
      prompt: item.prompt,
      options: item.options,
      correct_option: item.correct_option,
      explanation: item.explanation,
      source_title: item.source_title,
      source_url: item.source_url,
    })),
  );
  if (answersError) {
    await supabase.from("exams").delete().eq("id", exam.id);
    return { error: "Não foi possível montar as questões." };
  }
  redirect(`/simulado/${exam.id}`);
}

/** Saves one answer as soon as it is chosen, so nothing is lost if the tab closes. */
export async function saveExamAnswer(
  examId: string,
  position: number,
  chosen: number | null,
  flagged: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: exam } = await supabase.from("exams").select("status").eq("id", examId).maybeSingle();
  if (exam?.status !== "running") return { ok: false, error: "Este simulado já foi encerrado." };
  const { error } = await supabase
    .from("exam_answers")
    .update({ chosen, flagged })
    .eq("exam_id", examId)
    .eq("position", position);
  if (error) return { ok: false, error: "Não foi possível salvar a resposta." };
  return { ok: true, data: undefined };
}

/** Grades the exam. Wrong questions go back to the daily review from tomorrow. */
export async function finishExam(examId: string): Promise<ActionResult> {
  const profileId = await currentProfileId();
  if (!profileId) return { ok: false, error: "Escolha um perfil." };
  const supabase = await createClient();
  const { data: exam } = await supabase
    .from("exams")
    .select("id, status")
    .eq("id", examId)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (!exam) return { ok: false, error: "Simulado não encontrado." };
  if (exam.status !== "running") return { ok: true, data: undefined };

  const { data: answers } = await supabase
    .from("exam_answers")
    .select("position, item_id, chosen, correct_option")
    .eq("exam_id", examId);
  const rows = answers ?? [];
  const right = rows.filter((a) => a.chosen !== null && a.chosen === a.correct_option);
  const wrong = rows.filter((a) => !(a.chosen !== null && a.chosen === a.correct_option));

  if (right.length)
    await supabase.from("exam_answers").update({ is_correct: true }).eq("exam_id", examId).in("position", right.map((a) => a.position));
  if (wrong.length)
    await supabase.from("exam_answers").update({ is_correct: false }).eq("exam_id", examId).in("position", wrong.map((a) => a.position));

  const now = new Date();
  const { error } = await supabase
    .from("exams")
    .update({ status: "finished", score: right.length, finished_at: now.toISOString() })
    .eq("id", examId);
  if (error) return { ok: false, error: "Não foi possível entregar o simulado." };

  // Wrong items: record "Errei" and bring them back from tomorrow.
  const tomorrow = startOfDay(new Date(now.getTime() + 86_400_000));
  const wrongIds = [...new Set(wrong.map((a) => a.item_id).filter((id): id is string => Boolean(id)))];
  if (wrongIds.length) {
    const [{ data: items }, { data: states }] = await Promise.all([
      supabase.from("study_items").select("id").in("id", wrongIds).eq("profile_id", profileId).eq("status", "approved"),
      supabase.from("review_states").select("item_id, state, ease, interval_days, reps, lapses, due_at").in("item_id", wrongIds),
    ]);
    for (const { id } of items ?? []) {
      const found = (states ?? []).find((s) => s.item_id === id);
      const prev: ReviewState | null = found
        ? { state: found.state, ease: found.ease, interval_days: found.interval_days, reps: found.reps, lapses: found.lapses, due_at: found.due_at }
        : null;
      const next = { ...schedule(prev, 1, now), due_at: tomorrow };
      await supabase.from("review_states").upsert({
        item_id: id,
        profile_id: profileId,
        ...next,
        last_grade: 1,
        last_reviewed_at: now.toISOString(),
      });
      await supabase.from("review_logs").insert({
        profile_id: profileId,
        item_id: id,
        grade: 1,
        mode: "simulado",
        reviewed_at: now.toISOString(),
        prev_state: prev,
        next_due_at: tomorrow,
      });
    }
  }

  revalidatePath("/simulados");
  revalidatePath("/hoje");
  revalidatePath(`/simulado/${examId}`);
  return { ok: true, data: undefined };
}

export async function abandonExam(examId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("exams").update({ status: "abandoned" }).eq("id", examId).eq("status", "running");
  if (error) return { ok: false, error: "Não foi possível sair do simulado." };
  revalidatePath("/simulados");
  return { ok: true, data: undefined };
}
