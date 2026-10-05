import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Editor } from "./editor";
import { RestoreVersion } from "./restore-version";
import { bookById } from "@/lib/bible/books";
import { chapterHref, formatRef } from "@/lib/bible/reference";
import { getChapter, verseCounts } from "@/lib/bible/text";
import { templateOf } from "@/lib/message-templates";
import { getMessage, getMessageVersion, getMessageVersions, notesForPassage } from "@/lib/messages";
import { getChapterNotes } from "@/lib/queries";
import { currentProfileId } from "@/lib/session";

export const metadata: Metadata = { title: "Mensagem" };

const dateTime = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(
    new Date(iso),
  );

const longDay = (day: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));

export default async function MessagePage({ params, searchParams }: PageProps<"/celula/[id]">) {
  const { id } = await params;
  const { versao } = await searchParams;
  const profileId = await currentProfileId();
  if (!profileId) notFound();
  const message = await getMessage(profileId, id);
  if (!message) notFound();
  const book = bookById(message.book_id);
  if (!book) notFound();

  const passage = formatRef(message.book_id, message.chapter, message.verse_start, message.verse_end, true);

  // ---------- A saved version, read-only ----------
  if (typeof versao === "string") {
    const snap = /^\d+$/.test(versao) ? await getMessageVersion(message.id, Number(versao)) : null;
    if (!snap) notFound();
    return (
      <main className="page">
        <div className="page-narrow" style={{ maxWidth: 720 }}>
          <Link href={`/celula/${message.id}`} className="caption" style={{ textDecoration: "none" }}>
            ← Voltar ao esboço atual (versão {message.version})
          </Link>
          <div className="notice" role="status">
            <span style={{ flex: 1 }}>
              <b style={{ fontWeight: 600 }}>Versão {snap.version}</b>, guardada em {dateTime(snap.created_at)}. Só leitura. Ao
              restaurar, o esboço atual é guardado antes como versão {message.version}.
            </span>
            <RestoreVersion messageId={message.id} version={snap.version} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="label label-accent">
              {passage} · {templateOf(snap.template).name}
            </span>
            <h1 className="h1">{snap.title}</h1>
          </div>
          {snap.blocks.map((b) => (
            <section key={b.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <h2 className="label" style={{ margin: 0 }}>
                {b.title}
              </h2>
              {b.text.trim() ? (
                <p className="serif" style={{ margin: 0, fontSize: 16.5, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                  {b.text}
                </p>
              ) : (
                <p className="caption" style={{ margin: 0 }}>
                  (em branco)
                </p>
              )}
            </section>
          ))}
        </div>
      </main>
    );
  }

  // ---------- Editor ----------
  const [counts, chapter, chapterNotes, versions] = await Promise.all([
    verseCounts(),
    getChapter(book, message.chapter),
    getChapterNotes(profileId, message.book_id, message.chapter),
    getMessageVersions(message.id),
  ]);
  const start = message.verse_start ?? 1;
  const end = message.verse_start ? (message.verse_end ?? message.verse_start) : (chapter?.length ?? 0);
  const verses = (chapter ?? []).map((text, i) => ({ n: i + 1, text })).filter((v) => v.n >= start && v.n <= end);
  const notes = notesForPassage(chapterNotes, message.book_id, message.chapter, message.verse_start, message.verse_end).map((n) => {
    const p = n.note_passages.find((x) => x.book_id === message.book_id && x.chapter === message.chapter);
    return { id: n.id, body: n.body, ref: p ? formatRef(p.book_id, p.chapter, p.verse_start, p.verse_end) : "" };
  });

  return (
    <main className="page">
      <Editor
        key={`${message.id}:${message.version}`}
        message={message}
        passage={passage}
        passageShort={formatRef(message.book_id, message.chapter, message.verse_start, message.verse_end)}
        passageRef={{ bookId: message.book_id, chapter: message.chapter, start: message.verse_start, end: message.verse_end }}
        counts={counts}
        readerHref={chapterHref(book, message.chapter, message.verse_start ?? undefined)}
        verses={verses}
        notes={notes}
        versions={versions.map((v) => ({ version: v.version, label: dateTime(v.created_at) }))}
        taughtLabel={message.taught_on ? longDay(message.taught_on) : null}
      />
    </main>
  );
}
