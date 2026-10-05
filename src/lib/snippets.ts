import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Snippet } from "@/lib/snippet-text";

type Row = Omit<Snippet, "used_in"> & { snippet_uses: { message_id: string }[] | null };

/** The whole bank of the profile, newest first. */
export async function getSnippets(profileId: string): Promise<Snippet[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("snippets")
    .select("id, kind, body, topic, bible_ref, source_title, source_url, updated_at, snippet_uses(message_id)")
    .eq("profile_id", profileId)
    .order("updated_at", { ascending: false });
  return ((data ?? []) as unknown as Row[]).map(({ snippet_uses, ...s }) => ({
    ...s,
    used_in: (snippet_uses ?? []).map((u) => u.message_id),
  }));
}
