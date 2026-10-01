"use client";

import { useActionState, useState } from "react";
import { startExam, type ExamFormState } from "@/lib/actions/exams";
import type { ThemeOption } from "@/lib/exams";

const COUNTS = [10, 20, 30, 50];
const TIMES = [
  [0, "Sem limite"],
  [15, "15 min"],
  [30, "30 min"],
  [60, "60 min"],
] as const;

export function NewExam({ themes, total, preset }: { themes: ThemeOption[]; total: number; preset?: string }) {
  const [state, action, pending] = useActionState<ExamFormState, FormData>(startExam, {});
  const [selected, setSelected] = useState<string[]>(preset && themes.some((t) => t.id === preset) ? [preset] : []);
  const [time, setTime] = useState<number>(0);

  // No theme selected = mixed exam over everything.
  const available = selected.length ? themes.filter((t) => selected.includes(t.id)).reduce((s, t) => s + t.available, 0) : total;
  const counts = COUNTS.filter((c) => c <= available);
  const options = counts.length && counts[counts.length - 1] === available ? counts : [...counts, available];
  const [count, setCount] = useState<number>(10);
  const effective = Math.min(count, available);

  return (
    <form action={action} className="card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h2 className="serif" style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>
        Novo simulado
      </h2>
      {selected.map((id) => (
        <input key={id} type="hidden" name="theme" value={id} />
      ))}
      <input type="hidden" name="count" value={effective} />
      <input type="hidden" name="time" value={time} />

      <div className="field">
        <span id="exam-themes">
          Temas <span className="muted">(nenhum marcado = misto)</span>
        </span>
        <div role="group" aria-labelledby="exam-themes" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {themes.map((t) => {
            const on = selected.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                className="chip"
                aria-pressed={on}
                onClick={() => setSelected((s) => (on ? s.filter((x) => x !== t.id) : [...s, t.id]))}
              >
                {on ? "✓ " : ""}
                {t.name} · {t.available}
              </button>
            );
          })}
        </div>
      </div>

      <div className="field">
        <span id="exam-count">
          Número de questões <span className="muted">({available} disponíveis)</span>
        </span>
        <div className="segmented" role="radiogroup" aria-labelledby="exam-count">
          {options.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={effective === c} onClick={() => setCount(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span id="exam-time">Tempo</span>
        <div className="segmented" role="radiogroup" aria-labelledby="exam-time">
          {TIMES.map(([v, label]) => (
            <button key={v} type="button" role="radio" aria-checked={time === v} onClick={() => setTime(v)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="caption" style={{ margin: 0 }}>
        Só entram questões de múltipla escolha aprovadas. As erradas voltam para a sua revisão diária a partir de amanhã.
      </p>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <div>
        <button type="submit" className="btn btn-lg btn-primary" disabled={pending || available === 0}>
          {pending ? "Montando…" : "Começar simulado"}
        </button>
      </div>
    </form>
  );
}
