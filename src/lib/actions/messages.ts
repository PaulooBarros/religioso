"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentProfileId } from "@/lib/session";
import { cleanDuration, optional, passageColumns, readPassage } from "@/lib/message-input";
import { bookById } from "@/lib/bible/books";
import { getChapter } from "@/lib/bible/text";
import { formatRef } from "@/lib/bible/reference";
import { verseCounts } from "@/lib/bible/text";
import { buildChecklist, liveChecks, MAX_CHECKS } from "@/lib/message-checks";
import { blocksFor, countWords, isTemplateId, parseBlocks, type MessageBlock } from "@/lib/message-templates";
import { dayKey } from "@/lib/srs";
import type { ActionResult } from "@/lib/types";

export type MessageFormState = { error?: string };

export async function createMessage(_prev: MessageFormState, form: FormData): Promise<MessageFormState> {
  const profileId = await currentProfileId();
  if (!profileId) return { error: "Escolha um perfil." };

  const title = String(form.get("title") ?? "").trim();
  if (!title || title.length > 200) return { error: "Dê um título de até 200 caracteres." };
  const template = String(form.get("template") ?? "");
  if (!isTemplateId(template)) return { error: "Escolha um modelo." };
  const duration = cleanDuration(form.get("duration"));
  if (!duration) return { error: "O tempo fica entre 5 e 90 minutos." };
  const passage = await readPassage(String(form.get("passage") ?? ""));
  if ("error" in passage) return { error: passage.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      profile_id: profileId,
      title,
      ...passageColumns(passage.ref),
      template,
      duration_min: duration,
      audience: optional(form.get("audience"), 300),
      topic: optional(form.get("topic"), 200),
      blocks: blocksFor(template, randomUUID),
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Não foi possível criar a mensagem." };
  revalidatePath("/celula");
  redirect(`/celula/${data.id}`);
}

export type MessageContent = {
  title: string;
  template: string;
  duration: number;
  audience: string;
  topic: string;
  blocks: MessageBlock[];
};

type CleanRow = {
  title: string;
  template: string;
  duration_min: number;
  audience: string | null;
  topic: string | null;
  blocks: MessageBlock[];
};

function cleanContent(content: MessageContent): { error: string } | { row: CleanRow } {
  const title = content.title.trim();
  if (!title || title.length > 200) return { error: "O título precisa ter de 1 a 200 caracteres." };
  if (!isTemplateId(content.template)) return { error: "Modelo inválido." };
  const duration = cleanDuration(content.duration);
  if (!duration) return { error: "O tempo fica entre 5 e 90 minutos." };
  const blocks = parseBlocks(content.blocks);
  if (!blocks) return { error: "Há um bloco inválido ou longo demais." };
  return {
    row: {
      title,
      template: content.template,
      duration_min: duration,
      audience: optional(content.audience, 300),
      topic: optional(content.topic, 200),
      blocks,
    },
  };
}

/** Autosave of the working copy. Any change sends the message back to "being prepared". */
export async function saveMessage(id: string, content: MessageContent): Promise<ActionResult> {
  const clean = cleanContent(content);
  if ("error" in clean) return { ok: false, error: clean.error };
  const supabase = await createClient();
  const { data, error } = await supabase.from("messages").update({ ...clean.row, ready_at: null }).eq("id", id).select("id");
  if (error || !data?.length) return { ok: false, error: "Não foi possível salvar." };
  revalidatePath("/celula");
  return { ok: true, data: undefined };
}

/** Saves the working copy, keeps it as a numbered version and starts the next one. */
export async function keepVersion(id: string, content: MessageContent): Promise<ActionResult<{ version: number }>> {
  const clean = cleanContent(content);
  if ("error" in clean) return { ok: false, error: clean.error };
  const supabase = await createClient();
  const { data: current } = await supabase.from("messages").select("version").eq("id", id).maybeSingle();
  if (!current) return { ok: false, error: "Mensagem não encontrada." };

  const { error: snapError } = await supabase.from("message_versions").insert({
    message_id: id,
    version: current.version,
    title: clean.row.title,
    template: clean.row.template,
    blocks: clean.row.blocks,
  });
  if (snapError) return { ok: false, error: "Não foi possível guardar a versão." };
  const next = current.version + 1;
  const { error } = await supabase.from("messages").update({ ...clean.row, version: next }).eq("id", id);
  if (error) return { ok: false, error: "A versão foi guardada, mas a mensagem não foi atualizada." };
  revalidatePath(`/celula/${id}`);
  revalidatePath("/celula");
  return { ok: true, data: { version: next } };
}

/** Brings a saved version back. The working copy is kept as a version first, so nothing is lost. */
export async function restoreVersion(id: string, version: number): Promise<ActionResult> {
  const supabase = await createClient();
  const [{ data: current }, { data: snap }] = await Promise.all([
    supabase.from("messages").select("version, title, template, blocks").eq("id", id).maybeSingle(),
    supabase.from("message_versions").select("title, template, blocks").eq("message_id", id).eq("version", version).maybeSingle(),
  ]);
  if (!current || !snap) return { ok: false, error: "Versão não encontrada." };

  const { error: snapError } = await supabase.from("message_versions").insert({
    message_id: id,
    version: current.version,
    title: current.title,
    template: current.template,
    blocks: current.blocks,
  });
  if (snapError) return { ok: false, error: "Não foi possível guardar a versão atual antes de restaurar." };
  const { error } = await supabase
    .from("messages")
    .update({ title: snap.title, template: snap.template, blocks: snap.blocks, version: current.version + 1, ready_at: null })
    .eq("id", id);
  if (error) return { ok: false, error: "Não foi possível restaurar." };
  revalidatePath(`/celula/${id}`);
  revalidatePath("/celula");
  return { ok: true, data: undefined };
}

export async function setPassage(id: string, input: string): Promise<ActionResult> {
  const passage = await readPassage(input);
  if ("error" in passage) return { ok: false, error: passage.error };
  const supabase = await createClient();
  const { data, error } = await supabase.from("messages").update({ ...passageColumns(passage.ref), ready_at: null }).eq("id", id).select("id");
  if (error || !data?.length) return { ok: false, error: "Não foi possível trocar a passagem." };
  revalidatePath(`/celula/${id}`);
  revalidatePath("/celula");
  return { ok: true, data: undefined };
}

/** Saves which manual checklist items are ticked. */
export async function setChecks(id: string, keys: string[]): Promise<ActionResult> {
  if (!Array.isArray(keys) || keys.length > MAX_CHECKS || keys.some((k) => typeof k !== "string" || !k || k.length > 200)) {
    return { ok: false, error: "Conferência inválida." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .update({ checks: [...new Set(keys)] })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return { ok: false, error: "Não foi possível salvar a conferência." };
  return { ok: true, data: undefined };
}

/** Marks the message as ready. The checklist is run again here, on what is saved. */
export async function setReady(id: string, ready: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  if (ready) {
    const { data: m } = await supabase
      .from("messages")
      .select("book_id, chapter, verse_start, verse_end, duration_min, blocks, checks")
      .eq("id", id)
      .maybeSingle();
    const book = m && bookById(m.book_id);
    const blocks = m && parseBlocks(m.blocks);
    if (!m || !book || !blocks) return { ok: false, error: "Mensagem não encontrada." };
    const [counts, chapter] = await Promise.all([verseCounts(), getChapter(book, m.chapter)]);
    const first = m.verse_start ?? 1;
    const last = m.verse_start ? (m.verse_end ?? m.verse_start) : (chapter?.length ?? 0);
    const list = buildChecklist({
      blocks,
      passage: { bookId: m.book_id, chapter: m.chapter, start: m.verse_start, end: m.verse_end },
      passageLabel: formatRef(m.book_id, m.chapter, m.verse_start, m.verse_end),
      passageWords: (chapter ?? []).slice(first - 1, last).reduce((sum, v) => sum + countWords(v), 0),
      duration: m.duration_min,
      counts,
      checked: m.checks as string[],
    });
    if (!list.complete) return { ok: false, error: "A conferência ainda não está completa." };
    const { error } = await supabase.from("messages").update({ ready_at: new Date().toISOString(), checks: liveChecks(list) }).eq("id", id);
    if (error) return { ok: false, error: "Não foi possível atualizar." };
  } else {
    const { error } = await supabase.from("messages").update({ ready_at: null }).eq("id", id);
    if (error) return { ok: false, error: "Não foi possível atualizar." };
  }
  revalidatePath(`/celula/${id}`);
  revalidatePath("/celula");
  return { ok: true, data: undefined };
}

/** Marks the message as taught today (Brasília), or back to "being prepared". */
export async function setTaught(id: string, taught: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .update({ taught_on: taught ? dayKey(new Date()) : null })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return { ok: false, error: "Não foi possível atualizar." };
  revalidatePath(`/celula/${id}`);
  revalidatePath("/celula");
  return { ok: true, data: undefined };
}

export async function deleteMessage(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("messages").delete().eq("id", id);
  if (error) return { ok: false, error: "Não foi possível apagar." };
  revalidatePath("/celula");
  return { ok: true, data: undefined };
}
