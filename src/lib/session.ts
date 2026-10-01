import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export { initials } from "@/lib/initials";

export const PROFILE_COOKIE = "et_profile";

export type Profile = { id: string; name: string };

export type Session =
  | { mode: "local" } // Supabase not configured: reading only
  | { mode: "anonymous" }
  | { mode: "user"; email: string; profiles: Profile[]; profile: Profile | null };

export const getSession = cache(async (): Promise<Session> => {
  if (!isSupabaseConfigured()) return { mode: "local" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { mode: "anonymous" };

  const { data } = await supabase.from("profiles").select("id, name").order("created_at");
  const profiles = (data ?? []) as Profile[];
  const wanted = (await cookies()).get(PROFILE_COOKIE)?.value;
  const profile = profiles.find((p) => p.id === wanted) ?? (profiles.length === 1 ? profiles[0] : null);
  return { mode: "user", email: user.email ?? "", profiles, profile };
});

/** Current profile id, or null when there is none (local mode, not chosen). */
export async function currentProfileId(): Promise<string | null> {
  const s = await getSession();
  return s.mode === "user" ? (s.profile?.id ?? null) : null;
}
