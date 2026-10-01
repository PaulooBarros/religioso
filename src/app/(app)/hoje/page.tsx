import Link from "next/link";
import { Ribbon } from "@/components/icons";
import { bookById } from "@/lib/bible/books";
import { chapterHref, formatRef } from "@/lib/bible/reference";
import { getVerseText } from "@/lib/bible/text";
import { getLastRead } from "@/lib/queries";
import { currentProfileId } from "@/lib/session";
import { relativeDay } from "@/lib/dates";

export const metadata = { title: "Hoje" };

function todayLabel() {
  const s = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function TodayPage() {
  const profileId = await currentProfileId();
  const last = profileId ? await getLastRead(profileId) : null;
  const lastBook = last ? bookById(last.book_id) : undefined;
  const preview = last?.verse ? await getVerseText(last.book_id, last.chapter, last.verse) : null;

  return (
    <main className="page">
      <div className="page-narrow">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="caption">{todayLabel()}</span>
          <h1 className="h1">Hoje</h1>
        </div>

        <div className="card" style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 12 }}>
          <span className="label label-accent">Revisão do dia</span>
          <p className="serif" style={{ margin: 0, fontSize: 22, lineHeight: 1.35 }}>
            A revisão espaçada chega na próxima etapa.
          </p>
          <p className="lead">
            Por enquanto, leia a Bíblia e guarde notas e marcadores. Eles ficam no seu perfil e voltam aqui para você
            continuar de onde parou.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {last && lastBook ? (
            <Link href={chapterHref(lastBook, last.chapter, last.verse ?? undefined)} className="card-link">
              <span className="label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Ribbon color="var(--accent)" />
                Continuar lendo
              </span>
              <span className="serif" style={{ fontSize: 20, fontWeight: 500 }}>
                {formatRef(last.book_id, last.chapter, last.verse, null, true)}
              </span>
              {preview && (
                <span className="serif" style={{ fontSize: 15, lineHeight: 1.6, color: "var(--ink-2)", fontStyle: "italic" }}>
                  “{preview.length > 90 ? `${preview.slice(0, 90).trimEnd()}…` : preview}”
                </span>
              )}
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                Marcador “Onde parei” · {relativeDay(last.updated_at)}
              </span>
            </Link>
          ) : (
            <Link href="/biblia" className="card-link">
              <span className="label">Começar a ler</span>
              <span className="serif" style={{ fontSize: 20, fontWeight: 500 }}>
                Abrir a Bíblia
              </span>
              <span style={{ fontSize: 13.5, color: "var(--muted)" }}>
                O marcador “Onde parei” é criado sozinho quando você lê.
              </span>
              <span style={{ fontSize: 13.5, color: "var(--accent)", fontWeight: 500, marginTop: 4 }}>Ler →</span>
            </Link>
          )}
          <Link href="/biblia/marcadores" className="card-link">
            <span className="label">Marcadores</span>
            <span className="serif" style={{ fontSize: 20, fontWeight: 500 }}>
              Passagens salvas
            </span>
            <span style={{ fontSize: 13.5, color: "var(--muted)" }}>Com nome e etiqueta, sincronizados entre celular e computador.</span>
            <span style={{ fontSize: 13.5, color: "var(--accent)", fontWeight: 500, marginTop: 4 }}>Ver →</span>
          </Link>
          <Link href="/notas" className="card-link">
            <span className="label">Notas</span>
            <span className="serif" style={{ fontSize: 20, fontWeight: 500 }}>
              Suas anotações
            </span>
            <span style={{ fontSize: 13.5, color: "var(--muted)" }}>Ligadas às passagens em que você as escreveu.</span>
            <span style={{ fontSize: 13.5, color: "var(--accent)", fontWeight: 500, marginTop: 4 }}>Ver →</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
