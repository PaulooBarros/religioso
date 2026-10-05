import Link from "next/link";
import { formatRef } from "@/lib/bible/reference";
import { relativeDay } from "@/lib/dates";
import { templateOf } from "@/lib/message-templates";
import { getMessages } from "@/lib/messages";
import { currentProfileId } from "@/lib/session";

export const metadata = { title: "Célula" };

function taughtLabel(day: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  );
}

export default async function CellPage() {
  const profileId = await currentProfileId();
  if (!profileId) {
    return (
      <main className="page">
        <p className="lead">Escolha um perfil para preparar mensagens.</p>
      </main>
    );
  }
  const messages = await getMessages(profileId);
  const preparing = messages.filter((m) => !m.taught_on);
  const taught = messages.filter((m) => m.taught_on);

  return (
    <main className="page">
      <div className="page-narrow">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="label">Ensinar</span>
            <h1 className="h1">Célula</h1>
          </div>
          <Link href="/celula/nova" className="btn btn-primary">
            Nova mensagem
          </Link>
        </div>

        {messages.length === 0 ? (
          <div className="empty">
            <p className="empty-title">Nenhuma mensagem ainda.</p>
            <p className="lead">
              Escolha uma passagem e um modelo de estrutura. O esboço abre com os blocos prontos para você escrever.
            </p>
          </div>
        ) : (
          [
            ["Em preparo", preparing] as const,
            ["Ensinadas", taught] as const,
          ].map(
            ([title, list]) =>
              list.length > 0 && (
                <section key={title} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <h2 className="label" style={{ margin: "0 0 6px" }}>
                    {title} · {list.length}
                  </h2>
                  {list.map((m) => (
                    <Link key={m.id} href={`/celula/${m.id}`} className="msg-row">
                      <span className="msg-row-main">
                        <span className="serif msg-row-title">{m.title}</span>
                        <span className="muted" style={{ fontSize: 13 }}>
                          {formatRef(m.book_id, m.chapter, m.verse_start, m.verse_end)} · {templateOf(m.template).name} ·{" "}
                          {m.duration_min} min{m.topic ? ` · ${m.topic}` : ""}
                        </span>
                      </span>
                      <span className="muted" style={{ fontSize: 12.5, textAlign: "right" }}>
                        {m.taught_on ? `Ensinada em ${taughtLabel(m.taught_on)}` : `Editada ${relativeDay(m.updated_at)}`}
                        <br />
                        versão {m.version}
                      </span>
                    </Link>
                  ))}
                </section>
              ),
          )
        )}
      </div>
    </main>
  );
}
