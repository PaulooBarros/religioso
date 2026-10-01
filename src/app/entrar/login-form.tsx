"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "@/lib/actions/auth";

export function LoginForm() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [inState, inAction, inPending] = useActionState<AuthState, FormData>(signIn, {});
  const [upState, upAction, upPending] = useActionState<AuthState, FormData>(signUp, {});
  const state = mode === "in" ? inState : upState;
  const pending = mode === "in" ? inPending : upPending;

  return (
    <form action={mode === "in" ? inAction : upAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <label className="field">
        <span>E-mail</span>
        <input className="input" type="email" name="email" autoComplete="email" required />
      </label>
      <label className="field">
        <span>Senha</span>
        <input
          className="input"
          type="password"
          name="password"
          autoComplete={mode === "in" ? "current-password" : "new-password"}
          minLength={mode === "up" ? 8 : undefined}
          required
        />
      </label>
      {state.error && <p className="form-error">{state.error}</p>}
      {state.info && <p className="lead">{state.info}</p>}
      <button type="submit" className="btn btn-lg btn-primary" disabled={pending}>
        {pending ? "Aguarde…" : mode === "in" ? "Entrar" : "Criar conta"}
      </button>
      <button type="button" className="btn btn-text" onClick={() => setMode(mode === "in" ? "up" : "in")}>
        {mode === "in" ? "Primeiro acesso? Criar conta" : "Já tenho conta"}
      </button>
    </form>
  );
}
