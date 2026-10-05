import Link from "next/link";
import { DeleteSnippet, SnippetForm } from "./bank-client";
import { filterSnippets, isSnippetKind, SNIPPET_KINDS, type SnippetKind } from "@/lib/snippet-text";
import { getSnippets } from "@/lib/snippets";
import { currentProfileId } from "@/lib/session";

export const metadata = { title: "Banco de ilustrações e perguntas" };

export default async function BankPage({ searchParams }: PageProps<"/celula/banco">) {
  const { tipo, q, editar } = await searchParams;
  const profileId = await currentProfileId();
  if (!profileId) {
    return (
      <main className="page">
        <p className="lead">Escolha um perfil para usar o banco.</p>
      </main>
    );
  }
  const kind: SnippetKind = typeof tipo === "string" && isSnippetKind(tipo) ? tipo : "ilustracao";
  const query = typeof q === "string" ? q : "";
  const all = await getSnippets(profileId);
  const shown = filterSnippets(all, kind, query);
  const editing = typeof editar === "string" ? all.find((s) => s.id === editar) : undefined;
  const count = (k: SnippetKind) => all.filter((s) => s.kind === k).length;

  return (
    <main className="page">
      <div className="page-narrow">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Link href="/celula" className="caption" style={{ textDecoration: "none" }}>
            ← Célula
          </Link>
          <h1 className="h1">Banco</h1>
          <p className="lead">
            Ilustrações e perguntas de discussão para reaproveitar. No editor da mensagem, cada bloco tem o link “banco” para
            inserir daqui ou guardar o que você escreveu.
          </p>
        </div>

        <SnippetForm key={editing?.id ?? `new-${kind}`} snippet={editing} defaultKind={kind} />

        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div className="segmented">
            {SNIPPET_KINDS.map((k) => (
              <Link
                key={k.id}
                href={`/celula/banco?tipo=${k.id}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
                aria-current={kind === k.id ? "page" : undefined}
              >
                {k.plural} · {count(k.id)}
              </Link>
            ))}
          </div>
          <form className="inline-form" role="search" style={{ flex: 1, minWidth: 220 }}>
            <input type="hidden" name="tipo" value={kind} />
            <label className="visually-hidden" htmlFor="bank-q">
              Buscar no banco
            </label>
            <input id="bank-q" className="input" name="q" defaultValue={query} placeholder="Buscar por texto, tema, referência ou fonte" style={{ minHeight: 36 }} />
            <button type="submit" className="btn btn-sm">
              Buscar
            </button>
            {query && (
              <Link href={`/celula/banco?tipo=${kind}`} className="btn btn-sm btn-ghost">
                Limpar
              </Link>
            )}
          </form>
        </div>

        <section className="item-list" aria-label="Itens do banco">
          {shown.length === 0 && (
            <p className="caption">{query ? "Nada encontrado para essa busca." : "Nenhum item deste tipo ainda."}</p>
          )}
          {shown.map((s) => (
            <article key={s.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p className="serif" style={{ margin: 0, fontSize: 16.5, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {s.body}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", fontSize: 12.5 }}>
                {s.topic && <span className="source-chip">{s.topic}</span>}
                {s.bible_ref && <span className="source-chip">{s.bible_ref}</span>}
                {s.source_title ? (
                  s.source_url ? (
                    <a className="source-chip" href={s.source_url} target="_blank" rel="noreferrer">
                      Fonte: {s.source_title} ↗
                    </a>
                  ) : (
                    <span className="source-chip">Fonte: {s.source_title}</span>
                  )
                ) : (
                  s.kind === "ilustracao" && <span className="source-chip unverified">Sem fonte</span>
                )}
                <span className="muted" style={{ flex: 1 }}>
                  {s.used_in.length === 0
                    ? "Ainda não usada"
                    : `Inserida em ${s.used_in.length} ${s.used_in.length === 1 ? "mensagem" : "mensagens"}`}
                </span>
                <Link href={`/celula/banco?tipo=${s.kind}&editar=${s.id}`} className="msg-link">
                  editar
                </Link>
                <DeleteSnippet id={s.id} />
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
