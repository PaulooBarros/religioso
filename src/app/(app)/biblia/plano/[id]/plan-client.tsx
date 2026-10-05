"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteReadingPlan, realignPlan, setPlanArchived, setPlanDayRead } from "@/lib/actions/reading-plans";
import type { ActionResult } from "@/lib/types";

export function DayToggle({ planId, day, read, label, big }: { planId: string; day: number; read: boolean; label: string; big?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const toggle = () =>
    start(async () => {
      const r = await setPlanDayRead(planId, day, !read);
      if (!r.ok) window.alert(r.error);
      router.refresh();
    });

  if (big) {
    return (
      <button type="button" className="btn btn-primary" disabled={pending} onClick={toggle}>
        {pending ? "Marcando…" : "Marcar como lido"}
      </button>
    );
  }
  return (
    <button
      type="button"
      className={`plan-check${read ? " read" : ""}`}
      disabled={pending}
      aria-pressed={read}
      aria-label={`Dia ${day}, ${label}: ${read ? "lido, clique para desmarcar" : "marcar como lido"}`}
      onClick={toggle}
    >
      {read ? "✓" : ""}
    </button>
  );
}

export function PlanActions({ id, title, archived, late, finished }: { id: string; title: string; archived: boolean; late: number; finished: boolean }) {
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="inline-form">
        {!finished && !archived && (
          <button
            type="button"
            className="btn btn-sm"
            disabled={pending}
            title="A próxima leitura passa para hoje e as seguintes vêm depois dela"
            onClick={() => run(() => realignPlan(id))}
          >
            Reajustar datas
          </button>
        )}
        <button type="button" className="btn btn-sm" disabled={pending} onClick={() => run(() => setPlanArchived(id, !archived))}>
          {archived ? "Restaurar" : "Arquivar"}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          disabled={pending}
          onClick={() => {
            if (!window.confirm(`Excluir o plano “${title}” e as marcas de leitura? Não dá para desfazer.`)) return;
            run(
              () => deleteReadingPlan(id),
              () => router.push("/biblia/plano"),
            );
          }}
        >
          Excluir
        </button>
      </div>
      {late > 0 && !archived && (
        <span className="caption">
          Ficou para trás? “Reajustar datas” recomeça a contagem a partir de hoje, sem perder o que já foi lido.
        </span>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
