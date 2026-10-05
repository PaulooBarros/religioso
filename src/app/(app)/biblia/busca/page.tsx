import Link from "next/link";
import { bookById } from "@/lib/bible/books";
import { chapterHref, formatRef } from "@/lib/bible/reference";
import { highlight, parseQuery, searchVerses } from "@/lib/bible/search";
import { searchIndex } from "@/lib/bible/text";

export const metadata = { title: "Buscar na Bíblia" };

const PAGE = 50;

export default async function SearchPage({ searchParams }: PageProps<"/biblia/busca">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 200) : "";
  const testament = params.t === "at" ? "OT" : params.t === "nt" ? "NT" : undefined;
  const bookId = typeof params.livro === "string" && bookById(Number(params.livro)) ? Number(params.livro) : undefined;
  const page = Math.max(1, Number(params.p) || 1);

  const terms = parseQuery(q);
  const { hits, perBook } = terms.length ? searchVerses(await searchIndex(), terms, { testament, bookId }) : { hits: [], perBook: [] };
  const total = hits.length;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const current = Math.min(page, pages);
  const shown = hits.slice((current - 1) * PAGE, current * PAGE);
  const allCount = perBook.reduce((sum, b) => sum + b.count, 0);

  const href = (next: { t?: string | null; livro?: number | null; p?: number }) => {
    const sp = new URLSearchParams({ q });
    const t = next.t === undefined ? params.t : next.t;
    const livro = next.livro === undefined ? bookId : next.livro;
    if (typeof t === "string" && (t === "at" || t === "nt")) sp.set("t", t);
    if (livro) sp.set("livro", String(livro));
    if (next.p && next.p > 1) sp.set("p", String(next.p));
    return `/biblia/busca?${sp}`;
  };

  return (
    <main className="page">
      <div className="page-narrow">
        <h1 className="h1">Buscar na Bíblia</h1>

        <form role="search" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="inline-form">
            <label className="visually-hidden" htmlFor="bible-q">
              Palavras
            </label>
            <input id="bible-q" className="input" name="q" defaultValue={q} placeholder="Ex.: graça fé" autoComplete="off" autoFocus={!q} style={{ flex: 1, minWidth: 220 }} />
            <button type="submit" className="btn btn-primary">
              Buscar
            </button>
          </div>
          <span className="caption">
            Encontra os versículos que têm todas as palavras, sem diferenciar acentos nem maiúsculas. Use aspas para uma expressão
            exata (“bom pastor”) e asterisco para o começo da palavra (am* acha amor, amou, amado).
          </span>
        </form>

        {q && terms.length === 0 && <p className="lead">Digite ao menos uma palavra.</p>}

        {terms.length > 0 && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <span style={{ fontSize: 14 }}>
                <b style={{ fontWeight: 600 }}>
                  {total} {total === 1 ? "versículo" : "versículos"}
                </b>
                {bookId ? ` em ${bookById(bookId)!.name}` : testament ? ` no ${testament === "OT" ? "Antigo" : "Novo"} Testamento` : ""}
                {pages > 1 ? ` · página ${current} de ${pages}` : ""}
              </span>
              <div className="segmented">
                {(
                  [
                    [null, "Toda a Bíblia", undefined],
                    ["at", "Antigo Testamento", "OT"],
                    ["nt", "Novo Testamento", "NT"],
                  ] as const
                ).map(([t, label, value]) => (
                  <Link key={label} href={href({ t, livro: null })} aria-current={testament === value ? "page" : undefined}>
                    {label}
                  </Link>
                ))}
              </div>
              {perBook.length > 1 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Link href={href({ livro: null })} className={`chip${bookId ? "" : " on"}`}>
                    Todos · {allCount}
                  </Link>
                  {perBook.map((b) => (
                    <Link key={b.bookId} href={href({ livro: b.bookId })} className={`chip${bookId === b.bookId ? " on" : ""}`}>
                      {bookById(b.bookId)!.abbrev} · {b.count}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {total === 0 ? (
              <p className="lead">
                Nada encontrado. A busca procura palavras inteiras: tente o asterisco (por exemplo, “{terms[0].value}*”) ou menos
                palavras.
              </p>
            ) : (
              <section style={{ display: "flex", flexDirection: "column" }} aria-label="Resultados">
                {shown.map((v) => {
                  const book = bookById(v.bookId)!;
                  return (
                    <Link key={`${v.bookId}-${v.chapter}-${v.verse}`} href={chapterHref(book, v.chapter, v.verse)} className="search-hit">
                      <span className="search-ref">{formatRef(v.bookId, v.chapter, v.verse)}</span>
                      <span className="serif">
                        {highlight(v.text, terms).map((piece, i) => (piece.hit ? <mark key={i}>{piece.text}</mark> : piece.text))}
                      </span>
                    </Link>
                  );
                })}
              </section>
            )}

            {pages > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                {current > 1 ? (
                  <Link href={href({ p: current - 1 })} className="btn btn-sm">
                    ← Anteriores
                  </Link>
                ) : (
                  <span />
                )}
                {current < pages && (
                  <Link href={href({ p: current + 1 })} className="btn btn-sm">
                    Próximos →
                  </Link>
                )}
              </div>
            )}
            <span className="caption">Texto da Bíblia Livre (CC BY 4.0), da sua base.</span>
          </>
        )}
      </div>
    </main>
  );
}
