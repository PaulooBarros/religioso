"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentProfileId } from "@/lib/session";
import { validateRefs } from "@/lib/bible/text";
import { MAX_OPTIONS, type ItemKind } from "@/lib/study";
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
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("study_items").update(row).eq("id", id).eq("profile_id", profileId)
    : await supabase.from("study_items").insert({ ...row, profile_id: profileId });
  if (error) return { error: "Não foi possível salvar o item." };

  revalidatePath("/estudar");
  redirect(form.get("another") === "1" ? `/estudar/novo?salvo=${Date.now()}` : "/estudar");
}

export async function deleteStudyItem(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("study_items").delete().eq("id", id);
  if (error) return { ok: false, error: "Não foi possível apagar o item." };
  revalidatePath("/estudar");
  return { ok: true, data: undefined };
}
