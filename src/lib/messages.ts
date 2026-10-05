import "server-only";
import { createClient } from "@/lib/supabase/server";
import { parseBlocks, type MessageBlock, type TemplateId } from "@/lib/message-templates";
import type { Note } from "@/lib/types";

export type Message = {
  id: string;
  title: string;
  book_id: number;
  chapter: number;
  verse_start: number | null;
  verse_end: number | null;
  template: TemplateId;
  duration_min: number;
  audience: string | null;
  topic: string | null;
  blocks: MessageBlock[];
  version: number;
  taught_on: string | null;
  created_at: string;
  updated_at: string;
};

export type MessageSummary = Omit<Message, "blocks" | "audience" | "created_at">;

export type MessageVersion = {
  version: number;
  title: string;
  template: TemplateId;
  blocks: MessageBlock[];
  created_at: string;
};

const SUMMARY_COLUMNS =
  "id, title, book_id, chapter, verse_start, verse_end, template, duration_min, topic, version, taught_on, updated_at";
const MESSAGE_COLUMNS = `${SUMMARY_COLUMNS}, audience, blocks, created_at`;

export async function getMessages(profileId: string): Promise<MessageSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select(SUMMARY_COLUMNS)
    .eq("profile_id", profileId)
    .order("updated_at", { ascending: false });
  return (data ?? []) as MessageSummary[];
}

export async function getMessage(profileId: string, id: string): Promise<Message | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .eq("id", id)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (!data) return null;
  return { ...(data as unknown as Message), blocks: parseBlocks(data.blocks) ?? [] };
}

/** Saved snapshots, newest first (without the blocks). */
export async function getMessageVersions(messageId: string): Promise<Omit<MessageVersion, "blocks">[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("message_versions")
    .select("version, title, template, created_at")
    .eq("message_id", messageId)
    .order("version", { ascending: false });
  return (data ?? []) as Omit<MessageVersion, "blocks">[];
}

export async function getMessageVersion(messageId: string, version: number): Promise<MessageVersion | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("message_versions")
    .select("version, title, template, blocks, created_at")
    .eq("message_id", messageId)
    .eq("version", version)
    .maybeSingle();
  if (!data) return null;
  return { ...(data as unknown as MessageVersion), blocks: parseBlocks(data.blocks) ?? [] };
}

/** Notes of the chapter that touch the passage (whole-chapter notes included). */
export function notesForPassage(notes: Note[], bookId: number, chapter: number, start: number | null, end: number | null): Note[] {
  if (!start) return notes;
  const last = end ?? start;
  return notes.filter((n) =>
    n.note_passages.some((p) => {
      if (p.book_id !== bookId || p.chapter !== chapter) return false;
      if (!p.verse_start) return true;
      return p.verse_start <= last && (p.verse_end ?? p.verse_start) >= start;
    }),
  );
}
