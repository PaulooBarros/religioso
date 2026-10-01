"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { approveStudyItem, deleteStudyItem, recheckSource } from "@/lib/actions/study";

export function DraftActions({ id, blocker, canRecheck }: { id: string; blocker: string | null; canRecheck: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Algo deu errado.");
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          disabled={pending || Boolean(blocker)}
          title={blocker ?? undefined}
          onClick={() => run(() => approveStudyItem(id))}
        >
          Aprovar
        </button>
        <Link href={`/estudar/${id}`} className="btn btn-sm">
          Editar
        </Link>
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          disabled={pending}
          onClick={() => {
            if (window.confirm("Descartar este rascunho?")) run(() => deleteStudyItem(id));
          }}
        >
          Descartar
        </button>
        {blocker && canRecheck && (
          <button type="button" className="btn btn-sm btn-text" disabled={pending} onClick={() => run(() => recheckSource(id))}>
            Verificar link de novo
          </button>
        )}
      </div>
      {blocker && <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{blocker}</span>}
      {error && (
        <span className="form-error" role="alert" style={{ fontSize: 12.5 }}>
          {error}
        </span>
      )}
    </div>
  );
}
