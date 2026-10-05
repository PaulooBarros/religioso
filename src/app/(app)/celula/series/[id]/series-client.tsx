"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addWeek, deleteSeries, moveWeek, removeWeek, updateSeries } from "@/lib/actions/series";
import { MAX_WEEKS } from "@/lib/passage";
import type { ActionResult } from "@/lib/types";

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function run(action: () => Promise<ActionResult>, after?: () => void) {
    setError(null);
    start(async () => {
      const r = await action();
      if (!r.ok) return setError(r.error);
      after?.();
      router.refresh();
    });
  }
  return { pending, error, run, router };
}

export function SeriesHeader({ id, title, about, weekCount }: { id: string; title: string; about: string; weekCount: number }) {
  const { pending, error, run, router } = useAction();
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftAbout, setDraftAbout] = useState(about);

  if (editing) {
    return (
      <form
        style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 560 }}
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => updateSeries(id, { title: draftTitle, about: draftAbout }),
            () => setEditing(false),
          );
        }}
      >
        <label className="field">
          <span>Título da série</span>
          <input className="input" value={draftTitle} maxLength={200} required autoFocus onChange={(e) => setDraftTitle(e.target.value)} />
        </label>
        <label className="field">
          <span>Livro ou tema</span>
          <input className="input" value={draftAbout} maxLength={200} onChange={(e) => setDraftAbout(e.target.value)} />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="inline-form">
          <button type="submit" className="btn btn-sm btn-primary" disabled={pending}>
            Salvar
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditing(false)}>
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span className="label">Série{about ? ` · ${about}` : ""}</span>
      <div style={{ display: "flex", gap: 14, alignItems: "baseline", flexWrap: "wrap" }}>
        <h1 className="h1">{title}</h1>
        <button type="button" className="msg-link" onClick={() => setEditing(true)}>
          editar
        </button>
        <button
          type="button"
          className="msg-link"
          disabled={pending}
          onClick={() => {
            const kept = weekCount ? ` As ${weekCount} mensagens continuam em Célula, fora de série.` : "";
            if (!window.confirm(`Apagar a série “${title}”?${kept}`)) return;
            run(
              () => deleteSeries(id),
              () => router.push("/celula"),
            );
          }}
        >
          apagar série
        </button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function WeekControls({
  seriesId,
  messageId,
  title,
  first,
  last,
}: {
  seriesId: string;
  messageId: string;
  title: string;
  first: boolean;
  last: boolean;
}) {
  const { pending, error, run } = useAction();
  return (
    <span style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
      <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <span className="msg-move">
          <button type="button" disabled={pending || first} onClick={() => run(() => moveWeek(seriesId, messageId, -1))} aria-label={`Subir a semana ${title}`}>
            ↑
          </button>
          <button type="button" disabled={pending || last} onClick={() => run(() => moveWeek(seriesId, messageId, 1))} aria-label={`Descer a semana ${title}`}>
            ↓
          </button>
        </span>
        <button
          type="button"
          className="msg-link"
          disabled={pending}
          title="A mensagem continua em Célula, fora da série"
          onClick={() => {
            if (window.confirm(`Tirar “${title}” da série? A mensagem não é apagada.`)) run(() => removeWeek(seriesId, messageId));
          }}
        >
          tirar
        </button>
      </span>
      {error && (
        <span className="form-error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}

export function AddWeek({ seriesId }: { seriesId: string }) {
  const { pending, error, run } = useAction();
  const [passage, setPassage] = useState("");
  const [title, setTitle] = useState("");

  return (
    <form
      style={{ display: "flex", flexDirection: "column", gap: 8 }}
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () => addWeek(seriesId, passage, title),
          () => {
            setPassage("");
            setTitle("");
          },
        );
      }}
    >
      <span className="label">Acrescentar semana</span>
      <div className="inline-form">
        <label className="visually-hidden" htmlFor="week-passage">
          Passagem
        </label>
        <input
          id="week-passage"
          className="input"
          style={{ maxWidth: 190 }}
          value={passage}
          required
          autoComplete="off"
          placeholder="Passagem, ex.: Rm 9:1-13"
          onChange={(e) => setPassage(e.target.value)}
        />
        <label className="visually-hidden" htmlFor="week-title">
          Título
        </label>
        <input
          id="week-title"
          className="input"
          style={{ maxWidth: 300 }}
          value={title}
          maxLength={200}
          placeholder="Título (opcional)"
          onChange={(e) => setTitle(e.target.value)}
        />
        <button type="submit" className="btn" disabled={pending}>
          Acrescentar
        </button>
      </div>
      <span className="caption">Até {MAX_WEEKS} semanas por série.</span>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
