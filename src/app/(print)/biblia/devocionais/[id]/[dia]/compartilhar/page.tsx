import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintActions } from "@/components/print-actions";
import { bookById } from "@/lib/bible/books";
import { formatRef } from "@/lib/bible/reference";
import { BIBLIA_LIVRE_SOURCE } from "@/lib/bible/source";
import { getChapter } from "@/lib/bible/text";
import { shareText } from "@/lib/devotional-plan";
import { getDevotionalSeries } from "@/lib/devotionals";
import { currentProfileId } from "@/lib/session";

export const metadata: Metadata = { title: "Compartilhar devocional" };

export default async function ShareDevotionalPage({ params, searchParams }: PageProps<"/biblia/devocionais/[id]/[dia]/compartilhar">) {
  const { id, dia } = await params;
  const { ref, nota } = await searchParams;
  const profileId = await currentProfileId();
  if (!profileId) notFound();
  const found = await getDevotionalSeries(profileId, id);
  const day = found?.days.find((d) => d.id === dia);
  if (!found || !day) notFound();
  const book = bookById(day.book_id);
  if (!book) notFound();

  const withPassage = ref !== "0";
  const withNote = nota === "1" && Boolean(day.note);
  const chapter = (await getChapter(book, day.chapter)) ?? [];
  const start = day.verse_start ?? 1;
  const end = day.verse_start ? (day.verse_end ?? day.verse_start) : chapter.length;
  const verses = chapter.map((text, i) => ({ n: i + 1, text })).filter((v) => v.n >= start && v.n <= end);
  const passage = formatRef(day.book_id, day.chapter, day.verse_start, day.verse_end, true);
  const blocks = day.blocks.filter((b) => b.text.trim());

  const plain = shareText({
    title: day.title,
    seriesTitle: found.series.title,
    number: day.number,
    verse: withPassage && verses[0] ? { text: verses[0].text, ref: formatRef(day.book_id, day.chapter, verses[0].n), credit: "Bíblia Livre" } : null,
    blocks: day.blocks,
    note: withNote ? day.note : null,
  });

  const here = `/biblia/devocionais/${id}/${dia}/compartilhar`;
  const href = (next: { ref?: boolean; nota?: boolean }) => {
    const q = new URLSearchParams();
    if (!(next.ref ?? withPassage)) q.set("ref", "0");
    if (next.nota ?? withNote) q.set("nota", "1");
    const s = q.toString();
    return s ? `${here}?${s}` : here;
  };

  return (
    <>
      <div className="print-bar">
        <Link href={`/biblia/devocionais/${id}/${dia}`} className="btn btn-sm btn-ghost" style={{ paddingLeft: 0 }}>
          ← Voltar ao dia
        </Link>
        <span style={{ flex: 1 }}>{blocks.length === 0 && <span className="muted">Este dia ainda está em branco.</span>}</span>
        <Link href={href({ ref: !withPassage })} className={`chip${withPassage ? " on" : ""}`} replace>
          {withPassage ? "✓ " : ""}Passagem
        </Link>
        {day.note && (
          <Link href={href({ nota: !withNote })} className={`chip${withNote ? " on" : ""}`} replace>
            {withNote ? "✓ " : ""}Minha anotação
          </Link>
        )}
        <PrintActions plain={plain} />
      </div>

      <div className="print-bar" style={{ flexDirection: "column", alignItems: "stretch" }}>
        <span className="label">Pré-visualização · formato de mensagem</span>
        <pre className="share-preview">{plain}</pre>
      </div>

      <main className="print-page">
        <header style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h2 style={{ margin: 0 }}>
            {found.series.title} · dia {day.number} de {found.days.length}
          </h2>
          <h1>{day.title}</h1>
        </header>
        {withPassage && (
          <section>
            <h2>{passage}</h2>
            <p className="print-passage">
              {verses.map((v) => (
                <span key={v.n}>
                  <sup>{v.n}</sup> {v.text}{" "}
                </span>
              ))}
            </p>
          </section>
        )}
        {blocks.map((b) => (
          <section key={b.id}>
            {blocks.length > 1 && <h2>{b.title}</h2>}
            <p>{b.text.trim()}</p>
          </section>
        ))}
        {withNote && (
          <section>
            <h2>Minha anotação</h2>
            <p>{day.note}</p>
          </section>
        )}
        {withPassage && <footer className="print-foot">{BIBLIA_LIVRE_SOURCE.required_credit}</footer>}
      </main>
    </>
  );
}
