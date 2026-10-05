import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DayEditor } from "./day-editor";
import { bookById } from "@/lib/bible/books";
import { chapterHref, formatRef } from "@/lib/bible/reference";
import { getChapter } from "@/lib/bible/text";
import { DAY_LABEL, devotionalTemplate } from "@/lib/devotional-plan";
import { getDevotionalSeries } from "@/lib/devotionals";
import { currentProfileId } from "@/lib/session";

export const metadata: Metadata = { title: "Devocional" };

const longDay = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

export default async function DevotionalDayPage({ params }: PageProps<"/biblia/devocionais/[id]/[dia]">) {
  const { id, dia } = await params;
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

  return (
    <main className="page">
      <div className="page-narrow" style={{ maxWidth: 720 }}>
        <Link href={base} className="caption" style={{ textDecoration: "none" }}>
          ← {series.title}
        </Link>
        <span className="label" style={{ marginBottom: -16 }}>
          Dia {day.number} de {days.length}
          {day.date ? ` · ${longDay(day.date)}` : ""}
          {day.state !== "sem-data" && day.state !== "futuro" ? ` · ${DAY_LABEL[day.state].toLowerCase()}` : ""}
        </span>

        <DayEditor
          key={day.id}
          dayId={day.id}
          title={day.title}
          passage={formatRef(day.book_id, day.chapter, day.verse_start, day.verse_end)}
          blocks={day.blocks}
          hints={Object.fromEntries(devotionalTemplate(series.template).blocks.map((b) => [b.title, b.hint]))}
        >
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
        </DayEditor>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, borderTop: "1px solid var(--line)", paddingTop: 16 }}>
          {prev ? (
            <Link href={`${base}/${prev.id}`} className="btn btn-sm">
              ← Dia {prev.number}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={`${base}/${next.id}`} className="btn btn-sm">
              Dia {next.number} →
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
