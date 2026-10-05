"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveDevotionalNote, setDevotionalRead } from "@/lib/actions/devotionals";

export function ReadButton({ dayId, read, readLabel }: { dayId: string; read: boolean; readLabel: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        className={`btn btn-sm${read ? "" : " btn-primary"}`}
        disabled={pending}
        aria-pressed={read}
        title={read ? "Clique para desmarcar" : undefined}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await setDevotionalRead(dayId, !read);
            if (!r.ok) return setError(r.error);
            router.refresh();
          })
        }
      >
        {read ? `✓ Lido${readLabel ? ` em ${readLabel}` : ""}` : "Marcar como lido"}
      </button>
      {error && (
        <span className="form-error" role="alert">
          {error}
        </span>
      )}
    </>
  );
}

export function DayNote({ dayId, note }: { dayId: string; note: string }) {
  const router = useRouter();
  const [value, setValue] = useState(note);
  const [saved, setSaved] = useState(note);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const dirty = value !== saved;

  function save() {
    if (!dirty) return;
    setError(null);
    start(async () => {
      const r = await saveDevotionalNote(dayId, value);
      if (!r.ok) return setError(r.error);
      setSaved(value);
      router.refresh();
    });
  }

  return (
    <label className="field" style={{ borderTop: "1px solid var(--line)", paddingTop: 20 }}>
      <span className="label">Minha anotação</span>
      <textarea
        className="textarea msg-text"
        value={value}
        maxLength={5000}
        placeholder="Escreva o que ficou para você hoje…"
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
      />
      <span className="inline-form">
        <button type="button" className="btn btn-sm" disabled={pending || !dirty} onClick={save}>
          {pending ? "Salvando…" : "Salvar anotação"}
        </button>
        <span className="caption" role="status">
          {error ?? (dirty ? "Não salva ainda." : saved ? "Salva." : "")}
        </span>
      </span>
    </label>
  );
}
