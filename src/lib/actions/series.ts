"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentProfileId } from "@/lib/session";
import { formatRef, type Reference } from "@/lib/bible/reference";
import { cleanDuration, optional, passageColumns, readPassage } from "@/lib/message-input";
import { blocksFor, isTemplateId, type TemplateId } from "@/lib/message-templates";
import { MAX_WEEKS, splitWeekLine } from "@/lib/passage";
import type { ActionResult } from "@/lib/types";

export type SeriesFormState = { error?: string };

type SeriesDefaults = { template: TemplateId; duration_min: number; audience: string | null; about: string | null };

function weekRow(profileId: string, seriesId: string, position: number, ref: Reference, title: string, d: SeriesDefaults) {
  return {
    profile_id: profileId,
    series_id: seriesId,
    series_position: position,
    title: (title || formatRef(ref.book.id, ref.chapter, ref.verse, ref.verseEnd, true)).slice(0, 200),
    ...passageColumns(ref),
    template: d.template,
    duration_min: d.duration_min,
    audience: d.audience,
    topic: d.about,
    blocks: blocksFor(d.template, randomUUID),
  };
}

export async function createSeries(_prev: SeriesFormState, form: FormData): Promise<SeriesFormState> {
  const profileId = await currentProfileId();
  if (!profileId) return { error: "Escolha um perfil." };

  const title = String(form.get("title") ?? "").trim();
  if (!title || title.length > 200) return { error: "Dê um título de até 200 caracteres." };
  const template = String(form.get("template") ?? "");
  if (!isTemplateId(template)) return { error: "Escolha um modelo." };
  const duration = cleanDuration(form.get("duration"));
  if (!duration) return { error: "O tempo fica entre 5 e 90 minutos." };

  const lines = String(form.get("weeks") ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { error: "Escreva ao menos uma semana, uma por linha." };
  if (lines.length > MAX_WEEKS) return { error: `Uma série tem no máximo ${MAX_WEEKS} semanas.` };
  const weeks: { ref: Reference; title: string }[] = [];
  for (const [i, line] of lines.entries()) {
    const { passage, title: weekTitle } = splitWeekLine(line);
    const read = await readPassage(passage);
    if ("error" in read) return { error: `Semana ${i + 1} (“${passage}”): ${read.error}` };
    weeks.push({ ref: read.ref, title: weekTitle });
  }

  const defaults: SeriesDefaults = {
    template,
    duration_min: duration,
    audience: optional(form.get("audience"), 300),
    about: optional(form.get("about"), 200),
  };
  const supabase = await createClient();
  const { data: series, error } = await supabase
    .from("series")
    .insert({ profile_id: profileId, title, about: defaults.about, template, duration_min: duration, audience: defaults.audience })
    .select("id")
    .single();
  if (error || !series) return { error: "Não foi possível criar a série." };

  const { error: weeksError } = await supabase
    .from("messages")
    .insert(weeks.map((w, i) => weekRow(profileId, series.id, i + 1, w.ref, w.title, defaults)));
  if (weeksError) {
    await supabase.from("series").delete().eq("id", series.id);
    return { error: "Não foi possível criar as semanas da série." };
  }
  revalidatePath("/celula");
  redirect(`/celula/series/${series.id}`);
}

export async function addWeek(seriesId: string, passage: string, title: string): Promise<ActionResult> {
  const profileId = await currentProfileId();
  if (!profileId) return { ok: false, error: "Escolha um perfil." };
  const read = await readPassage(passage);
  if ("error" in read) return { ok: false, error: read.error };

  const supabase = await createClient();
  const [{ data: series }, { data: rows }] = await Promise.all([
    supabase.from("series").select("template, duration_min, audience, about").eq("id", seriesId).eq("profile_id", profileId).maybeSingle(),
    supabase.from("messages").select("series_position").eq("series_id", seriesId),
  ]);
  if (!series) return { ok: false, error: "Série não encontrada." };
  if ((rows ?? []).length >= MAX_WEEKS) return { ok: false, error: `Uma série tem no máximo ${MAX_WEEKS} semanas.` };
  const last = Math.max(0, ...(rows ?? []).map((r) => r.series_position ?? 0));
  const { error } = await supabase
    .from("messages")
    .insert(weekRow(profileId, seriesId, last + 1, read.ref, title.trim(), series as SeriesDefaults));
  if (error) return { ok: false, error: "Não foi possível adicionar a semana." };
  revalidatePath(`/celula/series/${seriesId}`);
  revalidatePath("/celula");
  return { ok: true, data: undefined };
}

/** Moves a week up (-1) or down (+1) and renumbers the whole series. */
export async function moveWeek(seriesId: string, messageId: string, delta: -1 | 1): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("messages")
    .select("id")
    .eq("series_id", seriesId)
    .order("series_position")
    .order("created_at");
  const ids = (rows ?? []).map((r) => r.id as string);
  const from = ids.indexOf(messageId);
  const to = from + delta;
  if (from === -1 || to < 0 || to >= ids.length) return { ok: false, error: "Não dá para mover essa semana." };
  [ids[from], ids[to]] = [ids[to], ids[from]];
  const results = await Promise.all(
    ids.map((id, i) => supabase.from("messages").update({ series_position: i + 1 }).eq("id", id).eq("series_id", seriesId)),
  );
  if (results.some((r) => r.error)) return { ok: false, error: "Não foi possível reordenar." };
  revalidatePath(`/celula/series/${seriesId}`);
  return { ok: true, data: undefined };
}

/** Takes a week out of the series. The message stays, as a standalone one. */
export async function removeWeek(seriesId: string, messageId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("messages")
    .update({ series_id: null, series_position: null })
    .eq("id", messageId)
    .eq("series_id", seriesId);
  if (error) return { ok: false, error: "Não foi possível tirar a semana da série." };
  revalidatePath(`/celula/series/${seriesId}`);
  revalidatePath("/celula");
  return { ok: true, data: undefined };
}

export async function updateSeries(id: string, input: { title: string; about: string }): Promise<ActionResult> {
  const title = input.title.trim();
  if (!title || title.length > 200) return { ok: false, error: "O título precisa ter de 1 a 200 caracteres." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("series")
    .update({ title, about: optional(input.about, 200) })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return { ok: false, error: "Não foi possível salvar." };
  revalidatePath(`/celula/series/${id}`);
  revalidatePath("/celula");
  return { ok: true, data: undefined };
}

/** Deletes the series only. Its messages stay, as standalone ones. */
export async function deleteSeries(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("series").delete().eq("id", id);
  if (error) return { ok: false, error: "Não foi possível apagar a série." };
  revalidatePath("/celula");
  return { ok: true, data: undefined };
}
