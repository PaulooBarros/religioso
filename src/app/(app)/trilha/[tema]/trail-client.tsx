"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FromYourBase } from "@/components/icons";
import { NoteForm } from "@/components/note-form";
import {
  addReading,
  createSubtheme,
  deleteReading,
  deleteSubtheme,
  renameSubtheme,
  setReadingDone,
} from "@/lib/actions/trail";
import { bookById } from "@/lib/bible/books";
import { chapterHref, parseReference } from "@/lib/bible/reference";
import { relativeDay } from "@/lib/dates";
import type { Reading } from "@/lib/trail";
import type { Note } from "@/lib/types";

function useAction() {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (res.ok) after?.();
      else setError(res.error ?? "Algo deu errado.");
    });
  return { error, pending, run };
}

export function AddSubtheme({ themeId }: { themeId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const { error, pending, run } = useAction();
  if (!open)
    return (
      <div>
        <button type="button" className="btn btn-sm btn-text" style={{ paddingLeft: 0 }} onClick={() => setOpen(true)}>
          + Subtema
        </button>
      </div>
    );
  return (
    <form
      className="inline-form"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => createSubtheme(themeId, name), () => {
          setName("");
          setOpen(false);
        });
      }}
    >
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do subtema" aria-label="Nome do subtema" autoFocus maxLength={120} />
      <button type="submit" className="btn btn-sm btn-primary" disabled={pending || !name.trim()}>
        Criar
      </button>
      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setOpen(false)}>
        Cancelar
      </button>
      {error && <span className="form-error">{error}</span>}
    </form>
  );
}

export function SubthemeActions({ id, themeId, name, itemCount }: { id: string; themeId: string; name: string; itemCount: number }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const { error, pending, run } = useAction();

  if (editing)
    return (
      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => renameSubtheme(id, themeId, value), () => setEditing(false));
        }}
      >
        <input className="input" value={value} onChange={(e) => setValue(e.target.value)} aria-label="Novo nome" autoFocus maxLength={120} />
        <button type="submit" className="btn btn-sm btn-primary" disabled={pending}>
          Salvar
        </button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditing(false)}>
          Cancelar
        </button>
        {error && <span className="form-error">{error}</span>}
      </form>
    );

  return (
    <div className="inline-form">
      <button type="button" className="btn btn-sm" onClick={() => setEditing(true)}>
        Renomear
      </button>
      <button
        type="button"
        className="btn btn-sm btn-ghost"
        disabled={pending}
        onClick={() => {
          const msg = itemCount
            ? `Apagar o subtema “${name}”? As ${itemCount} questões continuam no tema, sem subtema. As leituras dele são apagadas.`
            : `Apagar o subtema “${name}”?`;
          if (window.confirm(msg)) run(() => deleteSubtheme(id, themeId), () => router.push(`/trilha/${themeId}`));
        }}
      >
        Apagar subtema
      </button>
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

function RefLink({ text }: { text: string }) {
  const first = text.split(";")[0].trim();
  const ref = parseReference(first);
  const book = ref ? bookById(ref.book.id) : undefined;
  return book && ref ? <Link href={chapterHref(book, ref.chapter, ref.verse)}>{text}</Link> : <span>{text}</span>;
}

export function Readings({ themeId, subthemeId, readings }: { themeId: string; subthemeId: string | null; readings: Reading[] }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [ref, setRef] = useState("");
  const { error, pending, run } = useAction();

  return (
    <div className="trail-panel">
      <span className="label">Leituras indicadas{readings.length ? ` · ${readings.filter((r) => r.read_at).length} de ${readings.length} lidas` : ""}</span>
      {readings.length === 0 && !open && (
        <p className="caption" style={{ margin: 0 }}>
          Nenhuma leitura ainda. Acrescente um texto bíblico, um capítulo de confissão ou um livro.
        </p>
      )}
      {readings.map((r) => (
        <div key={r.id} className={`trail-reading${r.read_at ? " done" : ""}`}>
          <input
            type="checkbox"
            checked={Boolean(r.read_at)}
            aria-label={`Marcar “${r.title}” como lida`}
            onChange={(e) => run(() => setReadingDone(r.id, themeId, e.target.checked))}
            disabled={pending}
          />
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {r.url ? (
              <a href={r.url} target="_blank" rel="noopener noreferrer">
                {r.title}
              </a>
            ) : r.bible_ref && r.title === r.bible_ref ? (
              <RefLink text={r.bible_ref} />
            ) : (
              <span>{r.title}</span>
            )}
            {r.bible_ref && r.title !== r.bible_ref && (
              <span style={{ fontFamily: "var(--font-sans)", fontSize: 12.5 }}>
                <RefLink text={r.bible_ref} />
              </span>
            )}
          </span>
          <button
            type="button"
            aria-label={`Remover “${r.title}”`}
            onClick={() => {
              if (window.confirm(`Remover “${r.title}” das leituras?`)) run(() => deleteReading(r.id, themeId));
            }}
          >
            ×
          </button>
        </div>
      ))}
      {open ? (
        <form
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
          onSubmit={(e) => {
            e.preventDefault();
            run(() => addReading({ themeId, subthemeId, title, url, bibleRef: ref }), () => {
              setTitle("");
              setUrl("");
              setRef("");
              setOpen(false);
            });
          }}
        >
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título (ex.: Confissão de 1689, cap. 8)" aria-label="Título" autoFocus />
          <input className="input" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Texto bíblico (ex.: Fp 2:5-11)" aria-label="Texto bíblico" />
          <input className="input" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link (opcional)" aria-label="Link" />
          <div className="inline-form">
            <button type="submit" className="btn btn-sm btn-primary" disabled={pending}>
              Adicionar
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setOpen(false)}>
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div>
          <button type="button" className="btn btn-sm btn-text" style={{ paddingLeft: 0 }} onClick={() => setOpen(true)}>
            + Leitura
          </button>
        </div>
      )}
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

export function ThemeNotes({
  themeId,
  subthemeId,
  label,
  notes,
}: {
  themeId: string;
  subthemeId: string | null;
  label: string;
  notes: Note[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const shown = notes.slice(0, 5);
  return (
    <div className="trail-panel">
      <span className="label">Suas notas · {notes.length}</span>
      {notes.length === 0 && (
        <p className="caption" style={{ margin: 0 }}>
          Nenhuma nota neste {subthemeId ? "subtema" : "tema"} ainda.
        </p>
      )}
      {shown.map((n) => (
        <div key={n.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <p className="serif" style={{ margin: 0, fontSize: 15.5, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
            {n.body.length > 220 ? `${n.body.slice(0, 220).trimEnd()}…` : n.body}
          </p>
          <span className="caption" style={{ fontSize: 12, display: "flex", gap: 8 }}>
            <FromYourBase /> · {relativeDay(n.updated_at)}
          </span>
        </div>
      ))}
      <div className="inline-form">
        <button type="button" className="btn btn-sm" onClick={() => setOpen(true)}>
          Nova nota
        </button>
        {notes.length > shown.length && (
          <Link href={`/notas?tema=${themeId}`} style={{ fontSize: 13 }}>
            Ver todas
          </Link>
        )}
      </div>
      {open && (
        <NoteForm
          refLabel={label}
          target={{ themeId, subthemeId }}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
