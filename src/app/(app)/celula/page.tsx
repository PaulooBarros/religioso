import Link from "next/link";
import { formatRef } from "@/lib/bible/reference";
import { relativeDay } from "@/lib/dates";
import { templateOf } from "@/lib/message-templates";
import { getMessages } from "@/lib/messages";
import { getSeriesList } from "@/lib/series";
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
  const [messages, series] = await Promise.all([getMessages(profileId), getSeriesList(profileId)]);
  const preparing = messages.filter((m) => !m.taught_on && !m.ready_at);
  const ready = messages.filter((m) => !m.taught_on && m.ready_at);
  const taught = messages.filter((m) => m.taught_on);

  return (
    <main className="page">
      <div className="page-narrow">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="label">Ensinar</span>
            <h1 className="h1">Célula</h1>
          </div>
          <div className="inline-form">
            <Link href="/celula/series/nova" className="btn">
              Nova série
            </Link>
            <Link href="/celula/nova" className="btn btn-primary">
              Nova mensagem
            </Link>
          </div>
        </div>

        {messages.length === 0 && series.length === 0 && (
          <div className="empty">
            <p className="empty-title">Nenhuma mensagem ainda.</p>
            <p className="lead">
              Escolha uma passagem e um modelo de estrutura. O esboço abre com os blocos prontos para você escrever. Para um
              livro ou tema em várias semanas, crie uma série.
            </p>
          </div>
        )}

        {series.length > 0 && (
          <section style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <h2 className="label" style={{ margin: "0 0 6px" }}>
              Séries · {series.length}
            </h2>
            {series.map((s) => (
              <Link key={s.id} href={`/celula/series/${s.id}`} className="msg-row">
                <span className="msg-row-main">
                  <span className="serif msg-row-title">{s.title}</span>
                  <span className="muted" style={{ fontSize: 13 }}>
                    {s.weeks} {s.weeks === 1 ? "semana" : "semanas"} · {s.taught} {s.taught === 1 ? "ensinada" : "ensinadas"} · modelo{" "}
                    {templateOf(s.template).name.toLowerCase()}
                    {s.about ? ` · ${s.about}` : ""}
                  </span>
                </span>
                <span className="muted" style={{ fontSize: 12.5, textAlign: "right" }}>
                  {s.weeks > 0 && s.taught === s.weeks ? "Concluída" : `Editada ${relativeDay(s.updated_at)}`}
                </span>
              </Link>
            ))}
          </section>
        )}

        {[
          ["Em preparo", preparing] as const,
          ["Prontas", ready] as const,
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
                        {formatRef(m.book_id, m.chapter, m.verse_start, m.verse_end)} · {templateOf(m.template).name} · {m.duration_min}{" "}
                        min{m.topic ? ` · ${m.topic}` : ""}
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
        )}
        {series.length > 0 && (
          <p className="caption" style={{ margin: 0 }}>
            As mensagens que fazem parte de uma série aparecem dentro dela.
          </p>
        )}
      </div>
    </main>
  );
}
