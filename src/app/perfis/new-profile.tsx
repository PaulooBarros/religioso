"use client";

import { useActionState, useState } from "react";
import { createProfile, type ProfileState } from "@/lib/actions/profiles";
import { initials } from "@/lib/initials";

export function NewProfileForm() {
  const [name, setName] = useState("");
  const [state, action, pending] = useActionState<ProfileState, FormData>(createProfile, {});

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <span className="avatar avatar-xl" style={{ alignSelf: "center" }} aria-hidden="true">
        {initials(name)}
      </span>
      <label className="field">
        <span>Nome</span>
        <input
          className="input"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Ana"
          maxLength={60}
          required
          autoFocus
        />
      </label>
      <p className="caption" style={{ margin: 0 }}>
        O avatar usa as iniciais do nome. Não há foto.
      </p>
      {state.error && <p className="form-error">{state.error}</p>}
      <button type="submit" className="btn btn-lg btn-primary" disabled={pending}>
        {pending ? "Criando…" : "Criar perfil"}
      </button>
    </form>
  );
}
