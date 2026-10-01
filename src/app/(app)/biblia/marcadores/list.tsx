"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Ribbon } from "@/components/icons";
import { removeBookmark } from "@/lib/actions/bookmarks";

export type BookmarkItem = {
  id: string;
  ref: string;
  href: string;
  name: string | null;
  tag: string | null;
  preview: string;
  when: string;
  lastRead: boolean;
};

const UNDO_MS = 5000;

export function BookmarkList({ items, canWrite }: { items: BookmarkItem[]; canWrite: boolean }) {
  const [filter, setFilter] = useState<string | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Removal is delayed so "Desfazer" can cancel it.
  function commit(id: string) {
    void removeBookmark(id).then((res) => {
      if (!res.ok) {
        setHidden((h) => h.filter((x) => x !== id));
        setError(res.error);
      }
    });
  }

  function remove(id: string) {
    if (timer.current && pending) {
      clearTimeout(timer.current);
      commit(pending);
    }
    setHidden((h) => [...h, id]);
    setPending(id);
    timer.current = setTimeout(() => {
      commit(id);
      setPending(null);
    }, UNDO_MS);
  }

  function undo() {
    if (timer.current) clearTimeout(timer.current);
    setHidden((h) => h.filter((x) => x !== pending));
    setPending(null);
  }

  // Leaving the page still applies a pending removal.
  const pendingRef = useRef(pending);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);
  useEffect(
    () => () => {
      if (timer.current && pendingRef.current) {
        clearTimeout(timer.current);
        void removeBookmark(pendingRef.current);
      }
    },
    [],
  );

  const tags = [...new Set(items.filter((i) => !i.lastRead && i.tag).map((i) => i.tag!))].sort();
  const visible = items.filter(
    (i) => !hidden.includes(i.id) && (filter === null || i.lastRead || i.tag === filter),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <h1 className="h2" style={{ marginRight: 12 }}>
          Marcadores
        </h1>
        <button type="button" className="chip" aria-pressed={filter === null} onClick={() => setFilter(null)}>
          Todas
        </button>
        {tags.map((t) => (
          <button key={t} type="button" className="chip" aria-pressed={filter === t} onClick={() => setFilter(t)}>
            {t}
          </button>
        ))}
      </div>

      {!canWrite ? (
        <div className="empty">
          <p className="empty-title">Marcadores precisam do banco conectado.</p>
          <p className="lead">Conecte o Supabase e escolha um perfil para salvar passagens.</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty">
          <p className="empty-title">{filter ? "Nenhum marcador com essa etiqueta." : "Nenhum marcador ainda."}</p>
          <p className="lead">Na Bíblia, toque num versículo e escolha “Marcar”.</p>
          <div>
            <Link href="/biblia" className="btn">
              Abrir a Bíblia
            </Link>
          </div>
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, borderTop: "1px solid var(--line)" }}>
          {visible.map((m) => (
            <li
              key={m.id}
              style={{
                display: "grid",
                gridTemplateColumns: "18px minmax(0, 1fr) auto",
                gap: 14,
                alignItems: "start",
                padding: "16px 0",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <span style={{ marginTop: 3 }}>
                <Ribbon color={m.lastRead ? "var(--accent)" : "var(--faint)"} />
              </span>
              <Link href={m.href} style={{ display: "flex", flexDirection: "column", gap: 4, textDecoration: "none", color: "var(--ink)" }}>
                <span style={{ display: "flex", gap: 12, fontSize: 13.5, flexWrap: "wrap" }}>
                  <b style={{ fontWeight: 600, color: "var(--accent)" }}>{m.ref}</b>
                  <span className="muted" style={{ fontSize: 12.5 }}>
                    {m.when}
                  </span>
                </span>
                <span style={{ fontSize: 14.5, fontWeight: 500 }}>{m.name ?? "Sem nome"}</span>
                <span className="serif" style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink-2)" }}>
                  {m.preview}
                </span>
                {m.tag && (
                  <span className="muted" style={{ fontSize: 12 }}>
                    {m.tag}
                  </span>
                )}
              </Link>
              {!m.lastRead && (
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => remove(m.id)}>
                  Remover
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="form-error">{error}</p>}

      {pending && (
        <div className="toast" role="status">
          Marcador removido
          <button type="button" onClick={undo}>
            Desfazer
          </button>
        </div>
      )}
    </div>
  );
}
