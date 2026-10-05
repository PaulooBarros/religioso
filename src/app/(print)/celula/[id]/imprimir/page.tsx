import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintActions } from "./print-actions";
import { bookById } from "@/lib/bible/books";
import { formatRef } from "@/lib/bible/reference";
import { BIBLIA_LIVRE_SOURCE } from "@/lib/bible/source";
import { getChapter } from "@/lib/bible/text";
import { getMessage } from "@/lib/messages";
import { currentProfileId } from "@/lib/session";

export const metadata: Metadata = { title: "Mensagem para impressão" };

export default async function PrintPage({ params, searchParams }: PageProps<"/celula/[id]/imprimir">) {
  const { id } = await params;
  const { texto } = await searchParams;
  const profileId = await currentProfileId();
  if (!profileId) notFound();
  const message = await getMessage(profileId, id);
  if (!message) notFound();
  const book = bookById(message.book_id);
  if (!book) notFound();

  const withText = texto !== "0";
  const passage = formatRef(message.book_id, message.chapter, message.verse_start, message.verse_end, true);
  const chapter = (await getChapter(book, message.chapter)) ?? [];
  const start = message.verse_start ?? 1;
  const end = message.verse_start ? (message.verse_end ?? message.verse_start) : chapter.length;
  const verses = chapter.map((text, i) => ({ n: i + 1, text })).filter((v) => v.n >= start && v.n <= end);
  const blocks = message.blocks.filter((b) => b.text.trim() || b.kind === "leitura");
  const hasReading = blocks.some((b) => b.kind === "leitura");
  const credit = `Texto bíblico: ${BIBLIA_LIVRE_SOURCE.name}, ${BIBLIA_LIVRE_SOURCE.license}.`;

  // Plain text for messaging apps: *bold* headings, as WhatsApp reads them.
  const plain = [
    `*${message.title}*`,
    passage,
    ...blocks.flatMap((b) => {
      const reading = b.kind === "leitura" && withText ? verses.map((v) => `${v.n} ${v.text}`).join(" ") : "";
      return ["", `*${b.title}*`, ...[reading, b.text.trim()].filter(Boolean)];
    }),
    ...(withText && hasReading ? ["", credit] : []),
  ].join("\n");

  return (
    <>
      <div className="print-bar">
        <Link href={`/celula/${message.id}`} className="btn btn-sm btn-ghost" style={{ paddingLeft: 0 }}>
          ← Voltar ao editor
        </Link>
        <span style={{ flex: 1 }}>
          {!message.ready_at && <span className="muted">Esta mensagem ainda não passou pela conferência.</span>}
        </span>
        <Link href={`/celula/${message.id}/imprimir${withText ? "?texto=0" : ""}`} className="btn btn-sm" replace>
          {withText ? "Sem o texto bíblico" : "Com o texto bíblico"}
        </Link>
        <PrintActions plain={plain} />
      </div>
      <main className="print-page">
        <header style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h2 style={{ margin: 0 }}>
            {passage} · {message.duration_min} min{message.topic ? ` · ${message.topic}` : ""}
          </h2>
          <h1>{message.title}</h1>
        </header>
        {blocks.map((b) => (
          <section key={b.id}>
            <h2>{b.title}</h2>
            {b.kind === "leitura" &&
              (withText ? (
                <p className="print-passage">
                  {verses.map((v) => (
                    <span key={v.n}>
                      <sup>{v.n}</sup> {v.text}{" "}
                    </span>
                  ))}
                </p>
              ) : (
                <p>{passage}</p>
              ))}
            {b.text.trim() && <p>{b.text.trim()}</p>}
          </section>
        ))}
        {withText && hasReading && <footer className="print-foot">{BIBLIA_LIVRE_SOURCE.required_credit}</footer>}
      </main>
    </>
  );
}
