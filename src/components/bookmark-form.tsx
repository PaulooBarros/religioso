"use client";

import { useState, useTransition } from "react";
import { Ribbon } from "./icons";
import { Sheet } from "./sheet";
import { saveBookmark } from "@/lib/actions/bookmarks";
import type { Bookmark } from "@/lib/types";

export function BookmarkForm({
  refLabel,
  bookId,
  chapter,
  verse,
  knownTags,
  onClose,
  onSaved,
}: {
  refLabel: string;
  bookId: number;
  chapter: number;
  verse: number | null;
  knownTags: string[];
  onClose: () => void;
  onSaved: (b: Bookmark) => void;
}) {
  const [name, setName] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [newTag, setNewTag] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const finalTag = newTag !== null ? newTag.trim() || null : tag;

  return (
    <Sheet
      title={
        <>
          <Ribbon color="var(--ink)" width={10} height={15} />
          Marcar {refLabel}
        </>
      }
      onClose={onClose}
    >
      <form
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await saveBookmark({ bookId, chapter, verse, name, tag: finalTag });
            if (res.ok) onSaved(res.data);
            else setError(res.error);
          });
        }}
      >
        <label className="field">
          <span>
            Nome <span className="muted">(opcional)</span>
          </span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        </label>
        <div className="field">
          <span id="tag-label">
            Etiqueta <span className="muted">(opcional)</span>
          </span>
          <div role="group" aria-labelledby="tag-label" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {knownTags.map((t) => (
              <button
                key={t}
                type="button"
                className="chip"
                aria-pressed={newTag === null && tag === t}
                onClick={() => {
                  setNewTag(null);
                  setTag(tag === t ? null : t);
                }}
              >
                {t}
              </button>
            ))}
            {newTag === null ? (
              <button type="button" className="chip chip-dashed" onClick={() => setNewTag("")}>
                + nova
              </button>
            ) : (
              <input
                className="input"
                style={{ minHeight: 36, height: 36, width: 160, fontSize: 13.5 }}
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="nova etiqueta"
                maxLength={40}
                aria-label="Nova etiqueta"
                autoFocus
              />
            )}
          </div>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="btn btn-lg" style={{ flex: 1 }} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-lg btn-primary" style={{ flex: 1 }} disabled={pending}>
            {pending ? "Salvando…" : "Salvar marcador"}
          </button>
        </div>
      </form>
    </Sheet>
  );
}
