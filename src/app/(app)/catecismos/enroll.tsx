"use client";

import { useState, useTransition } from "react";
import { enrollCatechism, pauseCatechism } from "@/lib/actions/catechisms";

const PACES = [2, 4, 6, 10];

/** Activate, change the pace or pause a catechism. */
export function EnrollControls({
  catechismId,
  state,
  perDay,
  finished,
}: {
  catechismId: string;
  state: "active" | "paused" | null;
  perDay: number | null;
  finished: boolean;
}) {
  const [pace, setPace] = useState(perDay ?? 4);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Algo deu errado.");
    });

  if (finished) return <span className="caption">Todas as perguntas já foram liberadas.</span>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span className="caption" id={`pace-${catechismId}`}>
          Novas por dia
        </span>
        <div className="segmented" role="radiogroup" aria-labelledby={`pace-${catechismId}`}>
          {PACES.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={pace === p}
              disabled={pending}
              onClick={() => {
                setPace(p);
                // Changing the pace of an active catechism applies right away.
                if (state === "active") run(() => enrollCatechism(catechismId, p));
              }}
            >
              {p}
            </button>
          ))}
        </div>
        {state === "active" ? (
          <button type="button" className="btn btn-sm" disabled={pending} onClick={() => run(() => pauseCatechism(catechismId))}>
            Pausar
          </button>
        ) : (
          <button type="button" className="btn btn-sm btn-primary" disabled={pending} onClick={() => run(() => enrollCatechism(catechismId, pace))}>
            {state === "paused" ? "Retomar" : "Ativar"}
          </button>
        )}
      </div>
      {error && (
        <span className="form-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
