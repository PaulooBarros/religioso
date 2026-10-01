"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { FromYourBase, Icon, Ribbon, RibbonOutline } from "./icons";
import { BookmarkForm } from "./bookmark-form";
import { NoteForm } from "./note-form";
import { Sheet } from "./sheet";
import { markLastRead } from "@/lib/actions/bookmarks";
import { deleteNote } from "@/lib/actions/notes";
import { formatRef, formatSelection, OTHER_VERSIONS, otherVersionHref } from "@/lib/bible/reference";
import type { Book } from "@/lib/bible/books";
import { relativeDay } from "@/lib/dates";
import type { Bookmark, Note } from "@/lib/types";

type BookOption = { id: number; name: string; slug: string; chapters: number };
type ChapterLink = { href: string; label: string } | null;

type Dialog =
  | { kind: "bookmark" }
  | { kind: "note"; chapterWide?: boolean; editing?: Note }
  | { kind: "notes" }
  | null;

const SIZES = [17, 19, 21, 23];
const SIZE_KEY = "et:reading-size";
const LAST_READ_DELAY = 2500;

const SIZE_EVENT = "et:reading-size";

function readSizeStep(): number {
  try {
    const v = Number(localStorage.getItem(SIZE_KEY));
    return SIZES.includes(v) ? SIZES.indexOf(v) : 1;
  } catch {
    return 1;
  }
}

function subscribeSize(onChange: () => void) {
  window.addEventListener(SIZE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(SIZE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function noteRef(n: Note, fallbackBook: number, fallbackChapter: number) {
  const p = n.note_passages[0];
  return p ? formatRef(p.book_id, p.chapter, p.verse_start, p.verse_end) : formatRef(fallbackBook, fallbackChapter);
}

function OtherVersions({ book, chapter, verse, up }: { book: Book; chapter: number; verse?: number; up?: boolean }) {
  return (
    <details className={`menu${up ? " menu-up" : ""}`}>
      <summary className={up ? "action-btn" : "toolbar-link"} style={up ? undefined : { display: "inline-flex", gap: 6, alignItems: "center" }}>
        <Icon name="externo" size={up ? 18 : 14} />
        Ler em outra versão
      </summary>
      <div className="menu-list">
        {OTHER_VERSIONS.map((v) => (
          <a key={v.code} href={otherVersionHref(book, chapter, v.code, verse)} target="_blank" rel="noopener noreferrer">
            <span>{v.name}</span>
            <span className="muted" style={{ fontSize: 12 }}>
              {v.code}
            </span>
          </a>
        ))}
        <p className="menu-note">Versões com direitos autorais não ficam guardadas aqui. O link abre o texto no Bible Gateway.</p>
      </div>
    </details>
  );
}

function NotesList({
  notes,
  book,
  chapter,
  canWrite,
  onGoTo,
  onEdit,
  onDelete,
}: {
  notes: Note[];
  book: Book;
  chapter: number;
  canWrite: boolean;
  onGoTo: (verse: number | null, end: number | null) => void;
  onEdit: (n: Note) => void;
  onDelete: (n: Note) => void;
}) {
  if (notes.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <p className="serif" style={{ margin: 0, fontSize: 18 }}>
          Nenhuma nota neste capítulo.
        </p>
        <p className="lead" style={{ fontSize: 13.5 }}>
          {canWrite
            ? "Selecione um versículo e escolha “Nova nota”, ou escreva uma nota para o capítulo inteiro."
            : "Notas ficam disponíveis quando o banco estiver conectado e um perfil escolhido."}
        </p>
      </div>
    );
  }
  return (
    <>
      {notes.map((n) => {
        const p = n.note_passages.find((x) => x.book_id === book.id && x.chapter === chapter) ?? n.note_passages[0];
        return (
          <div className="note" key={n.id}>
            <div className="note-head">
              <button type="button" className="note-ref" onClick={() => onGoTo(p?.verse_start ?? null, p?.verse_end ?? null)}>
                {noteRef(n, book.id, chapter)}
              </button>
              <FromYourBase />
            </div>
            <p className="note-body">{n.body}</p>
            <div className="note-meta">
              {n.tags.length > 0 && <span>Etiquetas: {n.tags.join(", ")}</span>}
              <span>{relativeDay(n.updated_at)}</span>
              <button type="button" onClick={() => onEdit(n)}>
                Editar
              </button>
              <button type="button" onClick={() => onDelete(n)}>
                Apagar
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}

export function Reader({
  book,
  chapter,
  chapterTotal,
  verses,
  initialBookmarks,
  initialNotes,
  knownTags,
  canWrite,
  books,
  prev,
  next,
  credit,
}: {
  book: Book;
  chapter: number;
  chapterTotal: number;
  verses: string[];
  initialBookmarks: Bookmark[];
  initialNotes: Note[];
  knownTags: string[];
  canWrite: boolean;
  books: BookOption[];
  prev: ChapterLink;
  next: ChapterLink;
  credit: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<number[]>([]);
  const [bookmarks, setBookmarks] = useState(initialBookmarks);
  const [notes, setNotes] = useState(initialNotes);
  const [tags, setTags] = useState(knownTags);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const sizeStep = useSyncExternalStore(subscribeSize, readSizeStep, () => 1);
  const [, startDelete] = useTransition();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Automatic "onde parei": save where the reader is, debounced while scrolling.
  const lastSaved = useRef<string>("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleLastRead = useCallback(
    (verse: number) => {
      if (!canWrite) return;
      const key = `${book.id}:${chapter}:${verse}`;
      if (key === lastSaved.current) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        lastSaved.current = key;
        void markLastRead(book.id, chapter, verse);
      }, LAST_READ_DELAY);
    },
    [book.id, chapter, canWrite],
  );

  useEffect(() => {
    const fromHash = Number(/^#v(\d+)$/.exec(window.location.hash)?.[1]);
    scheduleLastRead(fromHash > 0 ? fromHash : 1);
    const visible = new Set<number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const n = Number((e.target as HTMLElement).dataset.verse);
          if (e.isIntersecting) visible.add(n);
          else visible.delete(n);
        }
        if (visible.size) scheduleLastRead(Math.min(...visible));
      },
      { rootMargin: "-140px 0px -40% 0px" },
    );
    document.querySelectorAll<HTMLElement>(".verse").forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [scheduleLastRead]);

  const notedVerses = useMemo(() => {
    const s = new Set<number>();
    for (const n of notes)
      for (const p of n.note_passages) {
        if (p.book_id !== book.id || p.chapter !== chapter || !p.verse_start) continue;
        for (let v = p.verse_start; v <= (p.verse_end ?? p.verse_start); v++) s.add(v);
      }
    return s;
  }, [notes, book.id, chapter]);

  const ribbons = useMemo(() => {
    const m = new Map<number, "last" | "mark">();
    for (const b of bookmarks) {
      if (!b.verse) continue;
      if (b.is_last_read) m.set(b.verse, "last");
      else if (!m.has(b.verse)) m.set(b.verse, "mark");
    }
    return m;
  }, [bookmarks]);

  const sorted = [...selected].sort((a, b) => a - b);
  const selLabel = `${book.abbrev} ${formatSelection(chapter, sorted)}`;
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  function toggle(n: number) {
    setSelected((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]));
  }

  function goTo(verse: number | null, end: number | null) {
    setDialog(null);
    if (!verse) return;
    const range: number[] = [];
    for (let v = verse; v <= (end ?? verse); v++) range.push(v);
    setSelected(range);
    document.getElementById(`v${verse}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function copySelection() {
    const text = sorted.map((v) => `${sorted.length > 1 ? `${v} ` : ""}${verses[v - 1]}`).join(" ");
    try {
      await navigator.clipboard.writeText(`${text}\n— ${formatRef(book.id, chapter, first, last)} (BLIVRE)`);
      setToast("Texto copiado");
    } catch {
      setToast("Não foi possível copiar");
    }
  }

  function removeNote(n: Note) {
    if (!window.confirm("Apagar esta nota?")) return;
    startDelete(async () => {
      const res = await deleteNote(n.id);
      if (res.ok) setNotes((ns) => ns.filter((x) => x.id !== n.id));
      else setToast(res.error);
    });
  }

  function cycleSize() {
    const step = (sizeStep + 1) % SIZES.length;
    try {
      localStorage.setItem(SIZE_KEY, String(SIZES[step]));
    } catch {
      // Preference is optional.
    }
    window.dispatchEvent(new Event(SIZE_EVENT));
  }

  const notesList = (
    <NotesList
      notes={notes}
      book={book}
      chapter={chapter}
      canWrite={canWrite}
      onGoTo={goTo}
      onEdit={(n) => setDialog({ kind: "note", editing: n })}
      onDelete={removeNote}
    />
  );

  const chapterNumbers = Array.from({ length: chapterTotal }, (_, i) => i + 1);

  return (
    <div className="reader">
      <div className="reader-main">
        <div className="reader-toolbar">
          <label className="select-wrap">
            <span className="visually-hidden">Livro</span>
            <select value={book.slug} onChange={(e) => router.push(`/biblia/${e.target.value}/1`)}>
              <optgroup label="Antigo Testamento">
                {books.slice(0, 39).map((b) => (
                  <option key={b.id} value={b.slug}>
                    {b.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Novo Testamento">
                {books.slice(39).map((b) => (
                  <option key={b.id} value={b.slug}>
                    {b.name}
                  </option>
                ))}
              </optgroup>
            </select>
            <Icon name="chevron" size={12} stroke={2} />
          </label>
          <label className="select-wrap">
            <span className="visually-hidden">Capítulo</span>
            <select value={chapter} onChange={(e) => router.push(`/biblia/${book.slug}/${e.target.value}`)}>
              {chapterNumbers.map((n) => (
                <option key={n} value={n}>
                  Capítulo {n}
                </option>
              ))}
            </select>
            <Icon name="chevron" size={12} stroke={2} />
          </label>
          <div style={{ flex: 1 }} />
          <Link href="/fontes" className="toolbar-link desktop-only" title="Fonte e licença do texto">
            Bíblia Livre · CC BY 4.0
          </Link>
          <span className="desktop-only">
            <OtherVersions book={book} chapter={chapter} />
          </span>
          <button type="button" className="aa-btn" onClick={cycleSize} aria-label={`Tamanho do texto: ${SIZES[sizeStep]} px`}>
            Aa
          </button>
          <button type="button" className="btn btn-sm mobile-only" onClick={() => setDialog({ kind: "notes" })}>
            Notas{notes.length ? ` ${notes.length}` : ""}
          </button>
          {!panelOpen && (
            <button type="button" className="btn btn-sm desktop-only" onClick={() => setPanelOpen(true)}>
              Notas{notes.length ? ` ${notes.length}` : ""}
            </button>
          )}
        </div>

        <div className="reader-scroll">
          <article className="reader-article" style={{ "--reading-size": `${SIZES[sizeStep]}px` } as React.CSSProperties}>
            <h1 className="reader-title">
              {book.name} {chapter}
            </h1>
            <div>
              {verses.map((t, i) => {
                const n = i + 1;
                const ribbon = ribbons.get(n);
                const isSel = selected.includes(n);
                return (
                  <div
                    key={n}
                    id={`v${n}`}
                    data-verse={n}
                    className={`verse${notedVerses.has(n) ? " has-note" : ""}`}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSel}
                    onClick={() => toggle(n)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggle(n);
                      }
                    }}
                  >
                    {ribbon && (
                      <span className="verse-ribbon" title={ribbon === "last" ? "Onde parei" : "Marcador"}>
                        <Ribbon color={ribbon === "last" ? "var(--accent)" : "var(--faint)"} />
                      </span>
                    )}
                    <span className="verse-num">
                      {n}
                      {notedVerses.has(n) && <span aria-label=", tem nota">•</span>}
                    </span>
                    <p className="verse-text">{t}</p>
                  </div>
                );
              })}
            </div>
            <p className="reader-hint">
              Toque num versículo para selecionar. Sublinhado pontilhado e “•”: tem nota. Fitilho na margem: marcador
              (bordô = “Onde parei”).
            </p>
            <nav className="chapter-nav" aria-label="Capítulos">
              {prev ? (
                <Link href={prev.href} className="btn">
                  ← {prev.label}
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link href={next.href} className="btn">
                  {next.label} →
                </Link>
              )}
            </nav>
            <p className="credit">
              {credit} <Link href="/fontes">Fontes e licenças</Link>
            </p>
          </article>
        </div>
      </div>

      {panelOpen && (
        <aside className="notes-panel" aria-label={`Notas de ${book.name} ${chapter}`}>
          <div className="notes-panel-head">
            <b style={{ flex: 1, fontWeight: 600 }}>
              Notas · {book.name} {chapter}
            </b>
            <span className="muted" style={{ fontSize: 12.5 }}>
              {notes.length}
            </span>
            <button type="button" className="aa-btn" onClick={() => setPanelOpen(false)} aria-label="Fechar painel de notas">
              <Icon name="fechar" size={14} />
            </button>
          </div>
          <div className="notes-list">{notesList}</div>
          {canWrite && (
            <div className="notes-panel-foot">
              <button type="button" className="btn btn-block" onClick={() => setDialog({ kind: "note", chapterWide: true })}>
                Nova nota neste capítulo
              </button>
            </div>
          )}
        </aside>
      )}

      {selected.length > 0 && !dialog && (
        <div className={`action-bar${panelOpen ? "" : " no-panel"}`} role="toolbar" aria-label={`Ações para ${selLabel}`}>
          <div className="action-bar-head">
            <span className="action-ref">{selLabel}</span>
            <button type="button" className="action-close" onClick={() => setSelected([])} aria-label="Limpar seleção">
              <span className="mobile-only">Cancelar</span>
              <span className="desktop-only" style={{ display: "inline-flex" }}>
                <Icon name="fechar" size={14} />
              </span>
            </button>
          </div>
          <div className="action-grid">
            <button type="button" className="action-btn" disabled={!canWrite} onClick={() => setDialog({ kind: "note" })}>
              <Icon name="notas" size={18} />
              Nova nota
            </button>
            <button type="button" className="action-btn" disabled={!canWrite} onClick={() => setDialog({ kind: "bookmark" })}>
              <RibbonOutline size={15} />
              Marcar
            </button>
            <button type="button" className="action-btn" onClick={copySelection}>
              <Icon name="copiar" size={18} />
              Copiar
            </button>
          </div>
          <OtherVersions book={book} chapter={chapter} verse={first} up />
        </div>
      )}

      {dialog?.kind === "bookmark" && (
        <BookmarkForm
          refLabel={formatRef(book.id, chapter, first)}
          bookId={book.id}
          chapter={chapter}
          verse={first ?? null}
          knownTags={tags}
          onClose={() => setDialog(null)}
          onSaved={(b) => {
            setBookmarks((bs) => [...bs, b]);
            if (b.tag && !tags.includes(b.tag)) setTags((t) => [...t, b.tag!]);
            setDialog(null);
            setSelected([]);
            setToast("Marcador salvo");
          }}
        />
      )}

      {dialog?.kind === "note" && (
        <NoteForm
          refLabel={
            dialog.editing
              ? noteRef(dialog.editing, book.id, chapter)
              : dialog.chapterWide
                ? `${book.name} ${chapter}`
                : formatRef(book.id, chapter, first, last)
          }
          editing={dialog.editing}
          target={{
            bookId: book.id,
            chapter,
            verseStart: dialog.chapterWide ? null : (first ?? null),
            verseEnd: dialog.chapterWide ? null : (last ?? null),
          }}
          onClose={() => setDialog(null)}
          onSaved={(n) => {
            setNotes((ns) => (ns.some((x) => x.id === n.id) ? ns.map((x) => (x.id === n.id ? n : x)) : [...ns, n]));
            setDialog(null);
            setSelected([]);
            setToast("Nota salva");
          }}
        />
      )}

      {dialog?.kind === "notes" && (
        <Sheet title={`Notas · ${book.name} ${chapter}`} onClose={() => setDialog(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>{notesList}</div>
          {canWrite && (
            <button type="button" className="btn btn-lg btn-block" onClick={() => setDialog({ kind: "note", chapterWide: true })}>
              Nova nota neste capítulo
            </button>
          )}
        </Sheet>
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
