"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentProfileId } from "@/lib/session";
import { validateRefs } from "@/lib/bible/text";
import { optional } from "@/lib/message-input";
import { isSnippetKind, MAX_SNIPPET_BODY, type SnippetKind } from "@/lib/snippet-text";
import type { ActionResult } from "@/lib/types";

export type SnippetFormState = { error?: string };

/** Creates or updates one item of the bank (the form of the bank page). */
export async function saveSnippet(_prev: SnippetFormState, form: FormData): Promise<SnippetFormState> {
  const profileId = await currentProfileId();
  if (!profileId) return { error: "Escolha um perfil." };

  const kind = String(form.get("kind") ?? "");
  if (!isSnippetKind(kind)) return { error: "Escolha o tipo." };
  const body = String(form.get("body") ?? "").trim();
  if (!body) return { error: "Escreva o texto." };
  if (body.length > MAX_SNIPPET_BODY) return { error: `O texto passa de ${MAX_SNIPPET_BODY} caracteres.` };
  const sourceUrl = optional(form.get("source_url"), 500);
  if (sourceUrl && !/^https?:\/\/\S+$/i.test(sourceUrl)) return { error: "O link precisa começar com http:// ou https://." };
  const sourceTitle = optional(form.get("source_title"), 300);
  if (sourceUrl && !sourceTitle) return { error: "Dê um nome à fonte do link." };

  let bibleRef: string | null = null;
  const typedRef = String(form.get("bible_ref") ?? "").trim();
  if (typedRef) {
    const refs = await validateRefs(typedRef);
    if ("error" in refs) return { error: refs.error };
    bibleRef = refs.refs.join("; ");
  }

  const row = { kind, body, topic: optional(form.get("topic"), 120), bible_ref: bibleRef, source_title: sourceTitle, source_url: sourceUrl };
  const supabase = await createClient();
  const id = String(form.get("id") ?? "");
  if (id) {
    const { data, error } = await supabase.from("snippets").update(row).eq("id", id).select("id");
    if (error || !data?.length) return { error: "Não foi possível salvar." };
  } else {
    const { error } = await supabase.from("snippets").insert({ ...row, profile_id: profileId });
    if (error) return { error: "Não foi possível salvar." };
  }
  revalidatePath("/celula/banco");
  redirect(`/celula/banco?tipo=${kind}`);
}

export async function deleteSnippet(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("snippets").delete().eq("id", id);
  if (error) return { ok: false, error: "Não foi possível apagar." };
  revalidatePath("/celula/banco");
  return { ok: true, data: undefined };
}

/** Saves text written in a message as items of the bank. Returns how many were stored. */
export async function addSnippets(items: { kind: SnippetKind; body: string }[], topic: string): Promise<ActionResult<{ count: number }>> {
  const profileId = await currentProfileId();
  if (!profileId) return { ok: false, error: "Escolha um perfil." };
  if (!Array.isArray(items) || items.length === 0 || items.length > 30) return { ok: false, error: "Nada para guardar." };
  const rows = [];
  for (const item of items) {
    const body = typeof item?.body === "string" ? item.body.trim() : "";
    if (!body || body.length > MAX_SNIPPET_BODY || !isSnippetKind(String(item?.kind))) return { ok: false, error: "Há um texto inválido ou longo demais." };
    rows.push({ profile_id: profileId, kind: item.kind, body, topic: optional(topic, 120) });
  }
  const supabase = await createClient();
  const { error } = await supabase.from("snippets").insert(rows);
  if (error) return { ok: false, error: "Não foi possível guardar no banco." };
  revalidatePath("/celula/banco");
  return { ok: true, data: { count: rows.length } };
}

/** Records that a snippet was inserted into a message. */
export async function recordSnippetUse(snippetId: string, messageId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("snippet_uses")
    .upsert({ snippet_id: snippetId, message_id: messageId }, { onConflict: "snippet_id,message_id", ignoreDuplicates: true });
  if (error) return { ok: false, error: "Não foi possível registrar o uso." };
  revalidatePath("/celula/banco");
  return { ok: true, data: undefined };
}
