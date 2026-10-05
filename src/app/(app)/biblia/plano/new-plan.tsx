"use client";

import { useActionState, useState } from "react";
import { createReadingPlan, type PlanFormState } from "@/lib/actions/reading-plans";
import { MAX_PLAN_DAYS, PLAN_PRESETS } from "@/lib/reading-plan";

const CUSTOM = "custom";

export function NewPlan({ books, today, open: initiallyOpen }: { books: { id: number; name: string }[]; today: string; open: boolean }) {
  const [state, action, pending] = useActionState<PlanFormState, FormData>(createReadingPlan, {});
  const [open, setOpen] = useState(initiallyOpen);
  const [choice, setChoice] = useState(PLAN_PRESETS[0].id);
  const [bookStart, setBookStart] = useState(1);
  const [bookEnd, setBookEnd] = useState(1);

  if (!open) {
    return (
      <div>
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
          Novo plano
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="card" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <h2 className="serif" style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>
        Novo plano
      </h2>
      {choice !== CUSTOM && <input type="hidden" name="preset" value={choice} />}

      <div role="radiogroup" aria-label="Plano" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {PLAN_PRESETS.map((p) => (
          <button key={p.id} type="button" role="radio" aria-checked={choice === p.id} className="dev-option" onClick={() => setChoice(p.id)}>
            <b>{p.title}</b>
            <span>
              {p.summary} {p.days} dias.
            </span>
          </button>
        ))}
        <button type="button" role="radio" aria-checked={choice === CUSTOM} className="dev-option" onClick={() => setChoice(CUSTOM)}>
          <b>Outro</b>
          <span>Escolha os livros e o número de dias.</span>
        </button>
      </div>

      {choice === CUSTOM && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          <label className="field">
            <span>Do livro</span>
            <select
              className="input"
              name="book_start"
              value={bookStart}
              onChange={(e) => {
                const v = Number(e.target.value);
                setBookStart(v);
                if (bookEnd < v) setBookEnd(v);
              }}
            >
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Até o livro</span>
            <select className="input" name="book_end" value={bookEnd} onChange={(e) => setBookEnd(Number(e.target.value))}>
              {books
                .filter((b) => b.id >= bookStart)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="field">
            <span>Dias</span>
            <input className="input" name="days" type="number" min={1} max={MAX_PLAN_DAYS} defaultValue={30} required />
          </label>
          <label className="field">
            <span>
              Nome <span className="muted">(opcional)</span>
            </span>
            <input className="input" name="title" maxLength={200} />
          </label>
        </div>
      )}

      <label className="field" style={{ maxWidth: 200 }}>
        <span>Começar em</span>
        <input className="input" name="start_date" type="date" defaultValue={today} required />
      </label>
      <span className="caption">
        Os capítulos nunca são partidos. Se houver mais dias que capítulos, o plano fica com um capítulo por dia.
      </span>

      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <div className="inline-form">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Criando…" : "Criar plano"}
        </button>
        {!initiallyOpen && (
          <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
