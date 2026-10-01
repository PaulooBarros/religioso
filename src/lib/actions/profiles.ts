"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { PROFILE_COOKIE } from "@/lib/session";

const ONE_YEAR = 60 * 60 * 24 * 365;

async function rememberProfile(id: string) {
  (await cookies()).set(PROFILE_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_YEAR,
    path: "/",
  });
}

export type ProfileState = { error?: string };

export async function createProfile(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "Digite um nome." };
  if (name.length > 60) return { error: "Use no máximo 60 caracteres." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").insert({ name }).select("id").single();
  if (error) return { error: "Não foi possível criar o perfil." };
  await rememberProfile(data.id);
  redirect("/hoje");
}

export async function selectProfile(id: string) {
  // RLS only returns profiles owned by the signed-in account.
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id").eq("id", id).maybeSingle();
  if (!data) redirect("/perfis");
  await rememberProfile(data.id);
  redirect("/hoje");
}
