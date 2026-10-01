"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentProfileId } from "@/lib/session";
import { validateRefs } from "@/lib/bible/text";
import { linkOpens } from "@/lib/link-check";
import { approvalBlocker, MAX_OPTIONS, type ItemKind, type StudyItem } from "@/lib/study";
import type { ActionResult } from "@/lib/types";

export type ItemFormState = { error?: string };

function text(form: FormData, key: string, max = 4000): string | null {
  const v = String(form.get(key) ?? "").trim();
  return v ? v.slice(0, max) : null;
}

export async function saveStudyItem(_prev: ItemFormState, form: FormData): Promise<ItemFormState> {
  const profileId = await currentProfileId();
  if (!profileId) return { error: "Escolha um perfil antes de cadastrar itens." };

  const id = text(form, "id");
  const kind = form.get("kind") === "mcq" ? "mcq" : ("card" as ItemKind);
  const prompt = text(form, "prompt");
  if (!prompt) return { error: "Escreva a pergunta." };

  let answer: string | null = null;
  let options: string[] | null = null;
  let correct: number | null = null;

  if (kind === "card") {
    answer = text(form, "answer");
    if (!answer) return { error: "Escreva a resposta." };
  } else {
    const raw = form.getAll("option").map((o) => String(o).trim().slice(0, 500));
    const chosen = Number(form.get("correct"));
    if (!raw[chosen]) return { error: "Marque qual alternativa é a correta (e preencha o texto dela)." };
    options = [];
    raw.forEach((o, i) => {
      if (!o) return;
      if (i === chosen) correct = options!.length;
      options!.push(o);
    });
    if (options.length < 2) return { error: "Uma questão de múltipla escolha precisa de pelo menos 2 alternativas." };
    if (options.length > MAX_OPTIONS) return { error: `Use no máximo ${MAX_OPTIONS} alternativas.` };
    if (new Set(options.map((o) => o.toLowerCase())).size !== options.length)
      return { error: "Há alternativas repetidas." };
  }

  const sourceUrl = text(form, "source_url", 1000);
  if (sourceUrl && !/^https?:\/\/\S+$/i.test(sourceUrl)) return { error: "O link da fonte precisa começar com http:// ou https://." };

  const refsInput = text(form, "bible_refs", 1000) ?? "";
  const refs = await validateRefs(refsInput);
  if ("error" in refs) return { error: refs.error };

  const level = Math.min(3, Math.max(1, Number(form.get("level")) || 1));
  const supabase = await createClient();

  // Verify the source link when it is new or changed (principle 1).
  let linkCheck: { source_ok: boolean | null; source_checked_at: string | null } | undefined;
  const previous = id
    ? (await supabase.from("study_items").select("source_url, source_ok").eq("id", id).maybeSingle()).data
    : null;
  if (!sourceUrl) linkCheck = { source_ok: null, source_checked_at: null };
  else if (!previous || previous.source_url !== sourceUrl || previous.source_ok === null)
    linkCheck = { source_ok: await linkOpens(sourceUrl), source_checked_at: new Date().toISOString() };

  const row = {
    kind,
    prompt,
    answer,
    options,
    correct_option: correct,
    explanation: text(form, "explanation"),
    theme_id: text(form, "theme_id"),
    level,
    source_title: text(form, "source_title", 300),
    source_url: sourceUrl,
    bible_refs: refs.refs,
    ...linkCheck,
  };

  const { error } = id
    ? await supabase.from("study_items").update(row).eq("id", id).eq("profile_id", profileId)
    : await supabase.from("study_items").insert({ ...row, profile_id: profileId });
  if (error) return { error: "Não foi possível salvar o item." };

  revalidatePath("/estudar");
  redirect(form.get("another") === "1" ? `/estudar/novo?salvo=${Date.now()}` : "/estudar");
}

/** Moves a draft into the study bank. AI drafts need a verified source. */
export async function approveStudyItem(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: item } = await supabase
    .from("study_items")
    .select("origin, source_url, source_ok")
    .eq("id", id)
    .maybeSingle();
  if (!item) return { ok: false, error: "Item não encontrado." };
  const blocker = approvalBlocker(item as Pick<StudyItem, "origin" | "source_url" | "source_ok">);
  if (blocker) return { ok: false, error: blocker };
  const { error } = await supabase.from("study_items").update({ status: "approved" }).eq("id", id);
  if (error) return { ok: false, error: "Não foi possível aprovar o item." };
  revalidatePath("/estudar");
  return { ok: true, data: undefined };
}

/** Checks the source link again (e.g. after a temporary failure). */
export async function recheckSource(id: string): Promise<ActionResult<boolean>> {
  const supabase = await createClient();
  const { data: item } = await supabase.from("study_items").select("source_url").eq("id", id).maybeSingle();
  if (!item?.source_url) return { ok: false, error: "Este item não tem link de fonte." };
  const ok = await linkOpens(item.source_url);
  await supabase
    .from("study_items")
    .update({ source_ok: ok, source_checked_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/estudar");
  return { ok: true, data: ok };
}

export async function deleteStudyItem(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("study_items").delete().eq("id", id);
  if (error) return { ok: false, error: "Não foi possível apagar o item." };
  revalidatePath("/estudar");
  return { ok: true, data: undefined };
}
