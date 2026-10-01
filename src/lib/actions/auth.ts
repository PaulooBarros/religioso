"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { PROFILE_COOKIE } from "@/lib/session";

export type AuthState = { error?: string; info?: string };

function credentials(form: FormData) {
  return {
    email: String(form.get("email") ?? "").trim(),
    password: String(form.get("password") ?? ""),
  };
}

export async function signIn(_prev: AuthState, form: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials(form));
  if (error) return { error: "E-mail ou senha incorretos." };
  redirect("/perfis");
}

export async function signUp(_prev: AuthState, form: FormData): Promise<AuthState> {
  const { email, password } = credentials(form);
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };
  if (!data.session) return { info: "Conta criada. Confirme pelo link enviado ao seu e-mail e depois entre." };
  redirect("/perfis");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(PROFILE_COOKIE);
  redirect("/entrar");
}
