"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { currentProfileId } from "@/lib/session";
import { validateRefs } from "@/lib/bible/text";
import type { ActionResult } from "@/lib/types";

function cleanName(name: string): string | null {
  const t = name.trim().replace(/\s+/g, " ");
  return t && t.length <= 120 ? t : null;
}

export async function createSubtheme(themeId: string, name: string): Promise<ActionResult> {
  const profileId = await currentProfileId();
  if (!profileId) return { ok: false, error: "Escolha um perfil." };
  const clean = cleanName(name);
  if (!clean) return { ok: false, error: "Digite um nome de até 120 caracteres." };
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("subthemes")
    .select("position")
    .eq("profile_id", profileId)
    .eq("theme_id", themeId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase
    .from("subthemes")
    .insert({ profile_id: profileId, theme_id: themeId, name: clean, position: (last?.position ?? 0) + 1 });
  if (error) return { ok: false, error: error.code === "23505" ? "Já existe um subtema com esse nome." : "Não foi possível criar." };
  revalidatePath(`/trilha/${themeId}`);
  return { ok: true, data: undefined };
}

export async function renameSubtheme(id: string, themeId: string, name: string): Promise<ActionResult> {
  const clean = cleanName(name);
  if (!clean) return { ok: false, error: "Digite um nome de até 120 caracteres." };
  const supabase = await createClient();
  const { error } = await supabase.from("subthemes").update({ name: clean }).eq("id", id);
  if (error) return { ok: false, error: error.code === "23505" ? "Já existe um subtema com esse nome." : "Não foi possível renomear." };
  revalidatePath(`/trilha/${themeId}`);
  return { ok: true, data: undefined };
}

/** Items of the subtheme stay in the theme, without subtheme. Its readings go away. */
export async function deleteSubtheme(id: string, themeId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("subthemes").delete().eq("id", id);
  if (error) return { ok: false, error: "Não foi possível apagar." };
  revalidatePath(`/trilha/${themeId}`);
  return { ok: true, data: undefined };
}

export async function addReading(input: {
  themeId: string;
  subthemeId: string | null;
  title: string;
  url: string;
  bibleRef: string;
}): Promise<ActionResult> {
  const profileId = await currentProfileId();
  if (!profileId) return { ok: false, error: "Escolha um perfil." };
  const title = input.title.trim();
  const url = input.url.trim() || null;
  if (!title && !input.bibleRef.trim()) return { ok: false, error: "Dê um título ou uma referência bíblica." };
  if (url && !/^https?:\/\/\S+$/i.test(url)) return { ok: false, error: "O link precisa começar com http:// ou https://." };

  let bibleRef: string | null = null;
  if (input.bibleRef.trim()) {
    const refs = await validateRefs(input.bibleRef);
    if ("error" in refs) return { ok: false, error: refs.error };
    bibleRef = refs.refs.join("; ");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("readings").insert({
    profile_id: profileId,
    theme_id: input.themeId,
    subtheme_id: input.subthemeId,
    title: (title || bibleRef!).slice(0, 300),
    url,
    bible_ref: bibleRef,
  });
  if (error) return { ok: false, error: "Não foi possível salvar a leitura." };
  revalidatePath(`/trilha/${input.themeId}`);
  return { ok: true, data: undefined };
}

export async function setReadingDone(id: string, themeId: string, done: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("readings")
    .update({ read_at: done ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { ok: false, error: "Não foi possível atualizar." };
  revalidatePath(`/trilha/${themeId}`);
  return { ok: true, data: undefined };
}

export async function deleteReading(id: string, themeId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("readings").delete().eq("id", id);
  if (error) return { ok: false, error: "Não foi possível apagar." };
  revalidatePath(`/trilha/${themeId}`);
  return { ok: true, data: undefined };
}
