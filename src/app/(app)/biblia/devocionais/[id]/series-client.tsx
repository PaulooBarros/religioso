"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  addDevotional,
  deleteDevotional,
  deleteDevotionalSeries,
  linkCellSeries,
  moveDevotional,
  moveDevotionalSeries,
  updateDevotionalSeries,
  type SeriesMove,
} from "@/lib/actions/devotionals";
import { MAX_DAYS, type SeriesStatus } from "@/lib/devotional-plan";
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

export function SeriesTitle({ id, title, about, description }: { id: string; title: string; about: string; description: string }) {
  const { pending, error, run } = useAction();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title, about, description });

  if (!editing) {
    return (
      <div style={{ display: "flex", gap: 14, alignItems: "baseline", flexWrap: "wrap" }}>
        <h1 className="h1">{title}</h1>
        <button type="button" className="msg-link" onClick={() => setEditing(true)}>
          editar
        </button>
      </div>
    );
  }
  return (
    <form
      style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 560 }}
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () => updateDevotionalSeries(id, draft),
          () => setEditing(false),
        );
      }}
    >
      <label className="field">
        <span>Título da série</span>
        <input className="input" value={draft.title} maxLength={200} required autoFocus onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
      </label>
      <label className="field">
        <span>Livro ou tema</span>
        <input className="input" value={draft.about} maxLength={200} onChange={(e) => setDraft({ ...draft, about: e.target.value })} />
      </label>
      <label className="field">
        <span>Descrição</span>
        <textarea
          className="textarea"
          value={draft.description}
          maxLength={1000}
          rows={2}
          style={{ minHeight: 70 }}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
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

// Actions offered in each state (design: Devocionais · página da série).
const MOVES: Record<SeriesStatus, { move: SeriesMove; label: string; primary?: boolean; confirm?: string }[]> = {
  draft: [],
  active: [
    { move: "pause", label: "Pausar" },
    { move: "archive", label: "Arquivar" },
  ],
  paused: [
    { move: "resume", label: "Retomar", primary: true },
    { move: "archive", label: "Arquivar" },
  ],
  done: [
    { move: "restart", label: "Recomeçar", confirm: "Recomeçar a série? As marcas de leitura são apagadas; os textos e as suas anotações ficam." },
    { move: "archive", label: "Arquivar" },
  ],
  archived: [{ move: "restore", label: "Restaurar", primary: true }],
};

export function SeriesActions({
  id,
  status,
  title,
  hasDays,
  today,
}: {
  id: string;
  status: SeriesStatus;
  title: string;
  hasDays: boolean;
  today: string;
}) {
  const { pending, error, run, router } = useAction();
  const [start, setStart] = useState(today);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="inline-form">
        {status === "draft" && (
          <>
            <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <span>Começar em</span>
              <input className="input" type="date" value={start} min={today} style={{ minHeight: 36, width: "auto" }} onChange={(e) => setStart(e.target.value)} />
            </label>
            <button type="button" className="btn btn-primary" disabled={pending || !hasDays} onClick={() => run(() => moveDevotionalSeries(id, "activate", start))}>
              Ativar
            </button>
          </>
        )}
        {MOVES[status].map((m) => (
          <button
            key={m.move}
            type="button"
            className={`btn${m.primary ? " btn-primary" : ""}`}
            disabled={pending}
            onClick={() => {
              if (m.confirm && !window.confirm(m.confirm)) return;
              run(() => moveDevotionalSeries(id, m.move));
            }}
          >
            {m.label}
          </button>
        ))}
        {(status === "draft" || status === "archived") && (
          <button
            type="button"
            className="btn btn-ghost"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(`Excluir a série “${title}” com todos os dias e anotações? Não dá para desfazer.`)) return;
              run(
                () => deleteDevotionalSeries(id),
                () => router.push("/biblia/devocionais"),
              );
            }}
          >
            {status === "draft" ? "Excluir rascunho" : "Excluir"}
          </button>
        )}
      </div>
      {status === "draft" && (
        <span className="caption">Se a data não for um dia do ritmo da série, ela começa no próximo dia do ritmo.</span>
      )}
      {status === "paused" && (
        <span className="caption">Ao retomar, o primeiro dia não lido passa para hoje (ou o próximo dia do ritmo).</span>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function DayControls({ seriesId, dayId, title, first, last }: { seriesId: string; dayId: string; title: string; first: boolean; last: boolean }) {
  const { pending, error, run } = useAction();
  return (
    <span style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
      <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <span className="msg-move">
          <button type="button" disabled={pending || first} onClick={() => run(() => moveDevotional(seriesId, dayId, -1))} aria-label={`Subir o dia ${title}`}>
            ↑
          </button>
          <button type="button" disabled={pending || last} onClick={() => run(() => moveDevotional(seriesId, dayId, 1))} aria-label={`Descer o dia ${title}`}>
            ↓
          </button>
        </span>
        <button
          type="button"
          className="msg-link"
          disabled={pending}
          onClick={() => {
            if (window.confirm(`Excluir o dia “${title}” com o texto e a anotação dele?`)) run(() => deleteDevotional(seriesId, dayId));
          }}
        >
          excluir
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

export function AddDay({ seriesId }: { seriesId: string }) {
  const { pending, error, run } = useAction();
  const [passage, setPassage] = useState("");
  const [title, setTitle] = useState("");

  return (
    <form
      style={{ display: "flex", flexDirection: "column", gap: 8 }}
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () => addDevotional(seriesId, passage, title),
          () => {
            setPassage("");
            setTitle("");
          },
        );
      }}
    >
      <span className="label">Acrescentar dia</span>
      <div className="inline-form">
        <label className="visually-hidden" htmlFor="day-passage">
          Passagem
        </label>
        <input
          id="day-passage"
          className="input"
          style={{ maxWidth: 190 }}
          value={passage}
          required
          autoComplete="off"
          placeholder="Passagem, ex.: Sl 27"
          onChange={(e) => setPassage(e.target.value)}
        />
        <label className="visually-hidden" htmlFor="day-title">
          Título
        </label>
        <input
          id="day-title"
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
      <span className="caption">Até {MAX_DAYS} dias por série.</span>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

/** Chooses the cell-group series this devotional series accompanies. */
export function CellLink({ id, current, options }: { id: string; current: string | null; options: { id: string; title: string }[] }) {
  const { pending, error, run } = useAction();
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid var(--line)", paddingTop: 20 }}>
      <label className="field" style={{ maxWidth: 420 }}>
        <span className="label">Série de célula ligada</span>
        <select
          className="input"
          value={current ?? ""}
          disabled={pending || options.length === 0}
          onChange={(e) => run(() => linkCellSeries(id, e.target.value || null))}
        >
          <option value="">Nenhuma</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.title}
            </option>
          ))}
        </select>
      </label>
      <span className="caption">
        {options.length === 0 ? (
          <>
            Não há séries em <Link href="/celula">Célula</Link> para ligar.
          </>
        ) : current ? (
          <>
            Os devocionais acompanham <Link href={`/celula/series/${current}`}>esta série de célula</Link>, que passa a mostrá-los na página dela.
          </>
        ) : (
          "Ligue quando os devocionais acompanharem o que o grupo estuda na célula."
        )}
      </span>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
