import Link from "next/link";
import { FromYourBase } from "@/components/icons";
import { bookById } from "@/lib/bible/books";
import { chapterHref, formatRef } from "@/lib/bible/reference";
import { relativeDay } from "@/lib/dates";
import { getNotes } from "@/lib/queries";
import { currentProfileId } from "@/lib/session";

export const metadata = { title: "Notas" };

export default async function NotesPage() {
  const profileId = await currentProfileId();
  const notes = profileId ? await getNotes(profileId) : [];

  return (
    <main className="page">
      <div className="page-narrow" style={{ maxWidth: 760 }}>
        <h1 className="h1">Notas</h1>
        {notes.length === 0 ? (
          <div className="empty">
            <p className="empty-title">Nenhuma nota ainda.</p>
            <p className="lead">
              {profileId
                ? "Selecione um versículo na Bíblia e escolha “Nova nota”."
                : "Notas ficam disponíveis quando o banco estiver conectado e um perfil escolhido."}
            </p>
            <div>
              <Link href="/biblia" className="btn">
                Abrir a Bíblia
              </Link>
            </div>
          </div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, borderTop: "1px solid var(--line)" }}>
            {notes.map((n) => (
              <li key={n.id} style={{ padding: "18px 0", borderBottom: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {n.note_passages.map((p, i) => {
                      const book = bookById(p.book_id);
                      return book ? (
                        <Link
                          key={i}
                          href={chapterHref(book, p.chapter, p.verse_start ?? undefined)}
                          style={{ fontSize: 13, fontWeight: 600, textDecoration: "none" }}
                        >
                          {formatRef(p.book_id, p.chapter, p.verse_start, p.verse_end)}
                        </Link>
                      ) : null;
                    })}
                  </span>
                  <FromYourBase />
                </div>
                <p className="serif" style={{ margin: 0, fontSize: 16, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {n.body}
                </p>
                <span className="muted" style={{ fontSize: 12 }}>
                  {n.tags.length > 0 && `Etiquetas: ${n.tags.join(", ")} · `}
                  {relativeDay(n.updated_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
