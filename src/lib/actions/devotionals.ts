"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentProfileId } from "@/lib/session";
import { formatRef, type Reference } from "@/lib/bible/reference";
import {
  cleanWeekdays,
  devotionalBlocks,
  isDevotionalTemplate,
  MAX_DAYS,
  nextRhythmDay,
  parseDevotionalBlocks,
  type DevotionalBlock,
  type DevotionalTemplateId,
} from "@/lib/devotional-plan";
import { optional, passageColumns, readPassage } from "@/lib/message-input";
import { splitWeekLine } from "@/lib/passage";
import { dayKey } from "@/lib/srs";
import type { ActionResult } from "@/lib/types";

export type DevotionalFormState = { error?: string };

const BASE = "/biblia/devocionais";

function dayRow(profileId: string, seriesId: string, position: number, ref: Reference, title: string, template: DevotionalTemplateId) {
  return {
    profile_id: profileId,
    series_id: seriesId,
    position,
    title: (title || formatRef(ref.book.id, ref.chapter, ref.verse, ref.verseEnd, true)).slice(0, 200),
    ...passageColumns(ref),
    blocks: devotionalBlocks(template, randomUUID),
  };
}

export async function createDevotionalSeries(_prev: DevotionalFormState, form: FormData): Promise<DevotionalFormState> {
  const profileId = await currentProfileId();
  if (!profileId) return { error: "Escolha um perfil." };

  const title = String(form.get("title") ?? "").trim();
  if (!title || title.length > 200) return { error: "Dê um título de até 200 caracteres." };
  const template = String(form.get("template") ?? "");
  if (!isDevotionalTemplate(template)) return { error: "Escolha um modelo." };
  const weekdays = cleanWeekdays(form.getAll("weekday"));
  if (!weekdays) return { error: "Escolha ao menos um dia da semana." };

  const lines = String(form.get("days") ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { error: "Escreva ao menos um dia, um por linha." };
  if (lines.length > MAX_DAYS) return { error: `Uma série tem no máximo ${MAX_DAYS} dias.` };
  const days: { ref: Reference; title: string }[] = [];
  for (const [i, line] of lines.entries()) {
    const { passage, title: dayTitle } = splitWeekLine(line);
    const read = await readPassage(passage);
    if ("error" in read) return { error: `Dia ${i + 1} (“${passage}”): ${read.error}` };
    days.push({ ref: read.ref, title: dayTitle });
  }

  const supabase = await createClient();
  const { data: series, error } = await supabase
    .from("devotional_series")
    .insert({
      profile_id: profileId,
      title,
      about: optional(form.get("about"), 200),
      description: optional(form.get("description"), 1000),
      template,
      weekdays,
    })
    .select("id")
    .single();
  if (error || !series) return { error: "Não foi possível criar a série." };

  const { error: daysError } = await supabase
    .from("devotionals")
    .insert(days.map((d, i) => dayRow(profileId, series.id, i + 1, d.ref, d.title, template)));
  if (daysError) {
    await supabase.from("devotional_series").delete().eq("id", series.id);
    return { error: "Não foi possível criar os dias da série." };
  }
  revalidatePath(BASE);
  redirect(`${BASE}/${series.id}`);
}

export async function updateDevotionalSeries(id: string, input: { title: string; about: string; description: string }): Promise<ActionResult> {
  const title = input.title.trim();
  if (!title || title.length > 200) return { ok: false, error: "O título precisa ter de 1 a 200 caracteres." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("devotional_series")
    .update({ title, about: optional(input.about, 200), description: optional(input.description, 1000) })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return { ok: false, error: "Não foi possível salvar." };
  revalidatePath(BASE, "layout");
  return { ok: true, data: undefined };
}

export type SeriesMove = "activate" | "pause" | "resume" | "restart" | "archive" | "restore";

/** Changes the state of a series. `startDate` (YYYY-MM-DD) is used when activating. */
export async function moveDevotionalSeries(id: string, move: SeriesMove, startDate?: string): Promise<ActionResult> {
  const supabase = await createClient();
  const [{ data: series }, { data: days }] = await Promise.all([
    supabase.from("devotional_series").select("status, weekdays, anchor_date").eq("id", id).maybeSingle(),
    supabase.from("devotionals").select("id, read_at").eq("series_id", id).order("position").order("created_at"),
  ]);
  if (!series) return { ok: false, error: "Série não encontrada." };
  const today = dayKey(new Date());
  const weekdays = series.weekdays as number[];
  const list = days ?? [];
  let patch: Record<string, unknown>;

  if (move === "activate" || move === "restart") {
    if (list.length === 0) return { ok: false, error: "A série ainda não tem dias." };
    const start = move === "activate" && startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate) && startDate >= today ? startDate : today;
    if (move === "restart") {
      const { error } = await supabase.from("devotionals").update({ read_at: null }).eq("series_id", id);
      if (error) return { ok: false, error: "Não foi possível recomeçar." };
    }
    patch = { status: "active", anchor_position: 1, anchor_date: nextRhythmDay(start, weekdays) };
  } else if (move === "pause") {
    patch = { status: "paused" };
  } else if (move === "resume") {
    // The first unread day lands on the next day of the rhythm, so nothing is skipped by the pause.
    const next = list.findIndex((d) => !d.read_at);
    patch = next === -1 ? { status: "done" } : { status: "active", anchor_position: next + 1, anchor_date: nextRhythmDay(today, weekdays) };
  } else if (move === "archive") {
    patch = { status: "archived" };
  } else {
    patch = { status: series.anchor_date ? "paused" : "draft" };
  }

  const { error } = await supabase.from("devotional_series").update(patch).eq("id", id);
  if (error) return { ok: false, error: "Não foi possível atualizar a série." };
  revalidatePath(BASE, "layout");
  return { ok: true, data: undefined };
}

export async function deleteDevotionalSeries(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("devotional_series").delete().eq("id", id);
  if (error) return { ok: false, error: "Não foi possível excluir a série." };
  revalidatePath(BASE);
  return { ok: true, data: undefined };
}

async function orderedDayIds(seriesId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("devotionals").select("id").eq("series_id", seriesId).order("position").order("created_at");
  return (data ?? []).map((r) => r.id as string);
}

async function renumber(seriesId: string, ids: string[]): Promise<boolean> {
  const supabase = await createClient();
  const results = await Promise.all(
    ids.map((id, i) => supabase.from("devotionals").update({ position: i + 1 }).eq("id", id).eq("series_id", seriesId)),
  );
  return results.every((r) => !r.error);
}

export async function addDevotional(seriesId: string, passage: string, title: string): Promise<ActionResult> {
  const profileId = await currentProfileId();
  if (!profileId) return { ok: false, error: "Escolha um perfil." };
  const read = await readPassage(passage);
  if ("error" in read) return { ok: false, error: read.error };
  const supabase = await createClient();
  const { data: series } = await supabase.from("devotional_series").select("template").eq("id", seriesId).eq("profile_id", profileId).maybeSingle();
  if (!series) return { ok: false, error: "Série não encontrada." };
  const ids = await orderedDayIds(seriesId);
  if (ids.length >= MAX_DAYS) return { ok: false, error: `Uma série tem no máximo ${MAX_DAYS} dias.` };
  const { error } = await supabase
    .from("devotionals")
    .insert(dayRow(profileId, seriesId, ids.length + 1, read.ref, title.trim(), series.template as DevotionalTemplateId));
  if (error) return { ok: false, error: "Não foi possível acrescentar o dia." };
  revalidatePath(BASE, "layout");
  return { ok: true, data: undefined };
}

export async function moveDevotional(seriesId: string, dayId: string, delta: -1 | 1): Promise<ActionResult> {
  const ids = await orderedDayIds(seriesId);
  const from = ids.indexOf(dayId);
  const to = from + delta;
  if (from === -1 || to < 0 || to >= ids.length) return { ok: false, error: "Não dá para mover esse dia." };
  [ids[from], ids[to]] = [ids[to], ids[from]];
  if (!(await renumber(seriesId, ids))) return { ok: false, error: "Não foi possível reordenar." };
  revalidatePath(BASE, "layout");
  return { ok: true, data: undefined };
}

export async function deleteDevotional(seriesId: string, dayId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("devotionals").delete().eq("id", dayId).eq("series_id", seriesId);
  if (error) return { ok: false, error: "Não foi possível excluir o dia." };
  await renumber(seriesId, await orderedDayIds(seriesId));
  revalidatePath(BASE, "layout");
  return { ok: true, data: undefined };
}

export async function saveDevotional(
  dayId: string,
  input: { title: string; passage: string; blocks: DevotionalBlock[] },
): Promise<ActionResult> {
  const title = input.title.trim();
  if (!title || title.length > 200) return { ok: false, error: "O título precisa ter de 1 a 200 caracteres." };
  const blocks = parseDevotionalBlocks(input.blocks);
  if (!blocks) return { ok: false, error: "Há um bloco inválido ou longo demais." };
  const read = await readPassage(input.passage);
  if ("error" in read) return { ok: false, error: read.error };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("devotionals")
    .update({ title, blocks, ...passageColumns(read.ref) })
    .eq("id", dayId)
    .select("id");
  if (error || !data?.length) return { ok: false, error: "Não foi possível salvar." };
  revalidatePath(BASE, "layout");
  return { ok: true, data: undefined };
}
