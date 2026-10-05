"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Sheet } from "@/components/sheet";
import { addSnippets, recordSnippetUse } from "@/lib/actions/snippets";
import type { MessageBlock } from "@/lib/message-templates";
import { filterSnippets, SNIPPET_KINDS, snippetsFromBlock, type Snippet, type SnippetKind } from "@/lib/snippet-text";

/** Inserts items of the bank into a block, or stores the block's text in the bank. */
export function BankPicker({
  block,
  messageId,
  topic,
  snippets,
  onInsert,
  onStored,
  onClose,
}: {
  block: MessageBlock;
  messageId: string;
  topic: string;
  snippets: Snippet[];
  onInsert: (snippet: Snippet) => void;
  /** Called after the block's text was stored, so the list can be reloaded. */
  onStored: () => void;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<SnippetKind>(block.kind === "perguntas" ? "pergunta" : "ilustracao");
  const [query, setQuery] = useState("");
  const [inserted, setInserted] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const shown = filterSnippets(snippets, kind, query);
  const toStore = snippetsFromBlock(block.kind, block.text, snippets);

  function insert(s: Snippet) {
    onInsert(s);
    setInserted((ids) => [...ids, s.id]);
    void recordSnippetUse(s.id, messageId);
  }

  function store() {
    setNote(null);
    start(async () => {
      const r = await addSnippets(toStore, topic);
      if (!r.ok) return setNote(r.error);
      setNote(r.data.count === 1 ? "1 item guardado no banco." : `${r.data.count} itens guardados no banco.`);
      onStored();
    });
  }

  return (
    <Sheet title={`Banco · ${block.title}`} onClose={onClose}>
      <div className="segmented" role="radiogroup" aria-label="Tipo">
        {SNIPPET_KINDS.map((k) => (
          <button key={k.id} type="button" role="radio" aria-checked={kind === k.id} onClick={() => setKind(k.id)}>
            {k.plural}
          </button>
        ))}
      </div>
      <label className="visually-hidden" htmlFor="picker-q">
        Buscar no banco
      </label>
      <input
        id="picker-q"
        className="input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por texto, tema, referência ou fonte"
        autoComplete="off"
      />

      <div className="picker-list">
        {shown.length === 0 && (
          <p className="caption" style={{ margin: 0 }}>
            {snippets.some((s) => s.kind === kind) ? "Nada encontrado para essa busca." : "O banco ainda não tem itens deste tipo."}
          </p>
        )}
        {shown.map((s) => {
          const here = inserted.includes(s.id) || s.used_in.includes(messageId);
          const elsewhere = s.used_in.filter((id) => id !== messageId).length;
          return (
            <div key={s.id} className="picker-item">
              <p>{s.body}</p>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12.5 }}>
                <span className="muted" style={{ flex: 1 }}>
                  {[
                    s.topic,
                    s.bible_ref,
                    s.source_title ? `Fonte: ${s.source_title}` : s.kind === "ilustracao" ? "sem fonte" : null,
                    elsewhere > 0 ? `já usada em ${elsewhere} ${elsewhere === 1 ? "outra mensagem" : "outras mensagens"}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                <button type="button" className="btn btn-sm" onClick={() => insert(s)}>
                  {here ? "Inserir de novo" : "Inserir"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
        <div className="inline-form">
          <button type="button" className="btn btn-sm" disabled={pending || toStore.length === 0} onClick={store}>
            {block.kind === "perguntas"
              ? toStore.length === 0
                ? "Guardar as perguntas deste bloco"
                : `Guardar ${toStore.length === 1 ? "1 pergunta" : `${toStore.length} perguntas`} deste bloco`
              : "Guardar o texto deste bloco como ilustração"}
          </button>
          <Link href="/celula/banco" className="caption">
            Gerenciar o banco
          </Link>
        </div>
        <span className="caption" role="status">
          {note ?? (toStore.length === 0 ? "O bloco está vazio ou o texto dele já está no banco." : "Fonte e referências podem ser acrescentadas depois, no banco.")}
        </span>
      </div>
      <div>
        <button type="button" className="btn btn-primary btn-block" onClick={onClose}>
          Fechar
        </button>
      </div>
    </Sheet>
  );
}
