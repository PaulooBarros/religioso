"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { deleteSnippet, saveSnippet, type SnippetFormState } from "@/lib/actions/snippets";
import { MAX_SNIPPET_BODY, SNIPPET_KINDS, type Snippet, type SnippetKind } from "@/lib/snippet-text";

export function SnippetForm({ snippet, defaultKind }: { snippet?: Snippet; defaultKind: SnippetKind }) {
  const [state, action, pending] = useActionState<SnippetFormState, FormData>(saveSnippet, {});
  const [kind, setKind] = useState<SnippetKind>(snippet?.kind ?? defaultKind);
  const [open, setOpen] = useState(Boolean(snippet));

  if (!open) {
    return (
      <div>
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
          Novo item
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 className="serif" style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
        {snippet ? "Editar item" : "Novo item"}
      </h2>
      {snippet && <input type="hidden" name="id" value={snippet.id} />}
      <input type="hidden" name="kind" value={kind} />

      <div className="field">
        <span id="snip-kind">Tipo</span>
        <div role="radiogroup" aria-labelledby="snip-kind" className="segmented">
          {SNIPPET_KINDS.map((k) => (
            <button key={k.id} type="button" role="radio" aria-checked={kind === k.id} onClick={() => setKind(k.id)}>
              {k.name}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span>{kind === "pergunta" ? "Pergunta" : "Ilustração"}</span>
        <textarea
          className="textarea"
          name="body"
          required
          maxLength={MAX_SNIPPET_BODY}
          defaultValue={snippet?.body}
          rows={kind === "pergunta" ? 2 : 5}
          style={{ minHeight: kind === "pergunta" ? 70 : 120 }}
        />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <label className="field">
          <span>
            Tema <span className="muted">(opcional)</span>
          </span>
          <input className="input" name="topic" maxLength={120} defaultValue={snippet?.topic ?? ""} placeholder="Ex.: segurança em Cristo" />
        </label>
        <label className="field">
          <span>
            Referências bíblicas <span className="muted">(opcional)</span>
          </span>
          <input className="input" name="bible_ref" defaultValue={snippet?.bible_ref ?? ""} placeholder="Ex.: Rm 8:31-39; Jo 10:28" autoComplete="off" />
        </label>
        <label className="field">
          <span>
            Fonte <span className="muted">(livro, sermão, experiência própria…)</span>
          </span>
          <input className="input" name="source_title" maxLength={300} defaultValue={snippet?.source_title ?? ""} />
        </label>
        <label className="field">
          <span>
            Link da fonte <span className="muted">(opcional)</span>
          </span>
          <input className="input" name="source_url" type="url" maxLength={500} defaultValue={snippet?.source_url ?? ""} placeholder="https://" />
        </label>
      </div>
      {kind === "ilustracao" && (
        <span className="caption">
          Se a ilustração conta um fato (história real, dado, citação), anote de onde veio. Não copie trechos longos de obras
          protegidas: resuma com as suas palavras.
        </span>
      )}

      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <div className="inline-form">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Salvando…" : "Salvar"}
        </button>
        {snippet ? (
          <Link href={`/celula/banco?tipo=${snippet.kind}`} className="btn btn-ghost">
            Cancelar
          </Link>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

export function DeleteSnippet({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="msg-link"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Apagar este item do banco? O texto já inserido em mensagens não muda.")) return;
        start(async () => {
          const r = await deleteSnippet(id);
          if (!r.ok) window.alert(r.error);
          router.refresh();
        });
      }}
    >
      apagar
    </button>
  );
}
