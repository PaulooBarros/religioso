import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DayEditor } from "./day-editor";
import { DayNote, ReadButton } from "./day-reader";
import { bookById } from "@/lib/bible/books";
import { chapterHref, formatRef } from "@/lib/bible/reference";
import { getChapter } from "@/lib/bible/text";
import { DAY_LABEL, devotionalTemplate } from "@/lib/devotional-plan";
import { getDevotionalSeries } from "@/lib/devotionals";
import { currentProfileId } from "@/lib/session";

export const metadata: Metadata = { title: "Devocional" };

const longDay = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

const readDay = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }).format(new Date(iso));

export default async function DevotionalDayPage({ params, searchParams }: PageProps<"/biblia/devocionais/[id]/[dia]">) {
  const { id, dia } = await params;
  const { editar } = await searchParams;
  const profileId = await currentProfileId();
  if (!profileId) notFound();
  const found = await getDevotionalSeries(profileId, id);
  const day = found?.days.find((d) => d.id === dia);
  if (!found || !day) notFound();
  const { series, days } = found;
  const book = bookById(day.book_id);
  if (!book) notFound();

  const chapter = (await getChapter(book, day.chapter)) ?? [];
  const start = day.verse_start ?? 1;
  const end = day.verse_start ? (day.verse_end ?? day.verse_start) : chapter.length;
  const verses = chapter.map((text, i) => ({ n: i + 1, text })).filter((v) => v.n >= start && v.n <= end);
  const prev = days[day.number - 2];
  const next = days[day.number];
  const base = `/biblia/devocionais/${series.id}`;
  const ref = formatRef(day.book_id, day.chapter, day.verse_start, day.verse_end);
  // A day with no text yet opens straight in the editor.
  const editing = typeof editar === "string" || !day.written;

  const passage = (
    <div className="msg-passage">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <span className="origin">Da sua base · {formatRef(day.book_id, day.chapter, day.verse_start, day.verse_end, true)}</span>
        <Link href={chapterHref(book, day.chapter, day.verse_start ?? undefined)} className="caption">
          Abrir no leitor
        </Link>
      </div>
      <p>
        {verses.map((v) => (
          <span key={v.n}>
            <sup>{v.n}</sup> {v.text}{" "}
          </span>
        ))}
      </p>
      <span className="caption">Bíblia Livre (CC BY 4.0)</span>
    </div>
  );

  return (
    <main className="page">
      <div className="page-narrow" style={{ maxWidth: 720 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
          <Link href={base} className="caption" style={{ textDecoration: "none" }}>
            ← {series.title}
          </Link>
          {day.written &&
            (editing ? (
              <Link href={`${base}/${day.id}`} className="caption">
                Voltar à leitura
              </Link>
            ) : (
              <Link href={`${base}/${day.id}?editar=1`} className="caption">
                Editar texto
              </Link>
            ))}
        </div>
        <span className="label" style={{ marginBottom: -16 }}>
          Dia {day.number} de {days.length}
          {day.date ? ` · ${longDay(day.date)}` : ""}
          {day.state === "hoje" || day.state === "pulado" ? ` · ${DAY_LABEL[day.state].toLowerCase()}` : ""}
        </span>

        {editing ? (
          <DayEditor
            key={day.id}
            dayId={day.id}
            title={day.title}
            passage={ref}
            blocks={day.blocks}
            hints={Object.fromEntries(devotionalTemplate(series.template).blocks.map((b) => [b.title, b.hint]))}
          >
            {passage}
          </DayEditor>
        ) : (
          <>
            <h1 className="h1">{day.title}</h1>
            {passage}
            {day.blocks
              .filter((b) => b.text.trim())
              .map((b) => (
                <section key={b.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {day.blocks.length > 1 && (
                    <h2 className="label" style={{ margin: 0 }}>
                      {b.title}
                    </h2>
                  )}
                  <p className="serif" style={{ margin: 0, fontSize: 18, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                    {b.text.trim()}
                  </p>
                </section>
              ))}
            <DayNote key={day.id} dayId={day.id} note={day.note ?? ""} />
          </>
        )}

        <div className="dev-foot">
          {prev ? (
            <Link href={`${base}/${prev.id}`} className="btn btn-sm">
              ← Dia {prev.number}
            </Link>
          ) : (
            <span />
          )}
          {!editing && (
            <span className="inline-form" style={{ justifyContent: "center" }}>
              <Link href={`/estudar/novo?ref=${encodeURIComponent(ref)}`} className="btn btn-sm">
                Criar card
              </Link>
              <ReadButton dayId={day.id} read={Boolean(day.read_at)} readLabel={day.read_at ? readDay(day.read_at) : null} />
            </span>
          )}
          {next ? (
            <Link href={`${base}/${next.id}`} className="btn btn-sm">
              Dia {next.number} →
            </Link>
          ) : (
            <span />
          )}
        </div>
      </div>
    </main>
  );
}
