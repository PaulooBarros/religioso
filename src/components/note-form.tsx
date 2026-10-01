"use client";

import { useState, useTransition } from "react";
import { Sheet } from "./sheet";
import { FromYourBase } from "./icons";
import { createNote, updateNote } from "@/lib/actions/notes";
import type { Note } from "@/lib/types";

/** Passage and/or theme the new note is linked to. */
type Target = {
  bookId?: number | null;
  chapter?: number | null;
  verseStart?: number | null;
  verseEnd?: number | null;
  themeId?: string | null;
  subthemeId?: string | null;
};

export function NoteForm({
  refLabel,
  target,
  editing,
  onClose,
  onSaved,
}: {
  refLabel: string;
  /** Passage for a new note. */
  target?: Target;
  /** Existing note being edited. */
  editing?: Note;
  onClose: () => void;
  onSaved: (n: Note) => void;
}) {
  const [body, setBody] = useState(editing?.body ?? "");
  const [tags, setTags] = useState(editing?.tags.join(", ") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <Sheet title={editing ? `Editar nota · ${refLabel}` : `Nova nota · ${refLabel}`} onClose={onClose}>
      <form
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
        onSubmit={(e) => {
          e.preventDefault();
          const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
          start(async () => {
            const res = editing
              ? await updateNote(editing.id, body, tagList)
              : await createNote({ body, tags: tagList, ...target! });
            if (res.ok) onSaved(res.data);
            else setError(res.error);
          });
        }}
      >
        <FromYourBase extra="nota sua" />
        <label className="field">
          <span className="visually-hidden">Texto da nota</span>
          <textarea
            className="textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="O que você observou nesta passagem?"
            rows={6}
            required
          />
        </label>
        <label className="field">
          <span>
            Etiquetas <span className="muted">(opcional, separadas por vírgula)</span>
          </span>
          <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="providência, sofrimento" />
        </label>
        {error && <p className="form-error">{error}</p>}
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="btn btn-lg" style={{ flex: 1 }} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-lg btn-primary" style={{ flex: 1 }} disabled={pending || !body.trim()}>
            {pending ? "Salvando…" : "Salvar nota"}
          </button>
        </div>
      </form>
    </Sheet>
  );
}
