import Link from "next/link";
import { Ribbon } from "@/components/icons";
import { bookById } from "@/lib/bible/books";
import { chapterHref, formatRef } from "@/lib/bible/reference";
import { getVerseText } from "@/lib/bible/text";
import { getLastRead } from "@/lib/queries";
import { getOverview, type ReviewOverview } from "@/lib/review";
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

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function ReviewCard({ o }: { o: ReviewOverview }) {
  const total = o.due + o.fresh;
  // About 40 seconds per item.
  const minutes = Math.max(1, Math.round((total * 40) / 60));
  const parts = [
    o.cards && plural(o.cards, "card", "cards"),
    o.mcq && plural(o.mcq, "de múltipla escolha", "de múltipla escolha"),
    o.fresh && plural(o.fresh, "novo", "novos"),
  ].filter(Boolean);

  return (
    <section className="card review-card" style={{ padding: "28px 32px" }} aria-labelledby="review-title">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <span id="review-title" className="label label-accent">
          Revisão do dia
        </span>
        {total > 0 ? (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
              <span className="serif" style={{ fontSize: 56, fontWeight: 500, lineHeight: 1 }}>
                {total}
              </span>
              <span style={{ fontSize: 17 }}>
                {total === 1 ? "item" : "itens"} · cerca de {plural(minutes, "minuto", "minutos")}
              </span>
            </div>
            <span className="muted" style={{ fontSize: 14 }}>
              {parts.join(" · ")}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8, flexWrap: "wrap" }}>
              <Link href="/revisao" className="btn btn-lg btn-primary" style={{ padding: "0 28px" }}>
                Começar
              </Link>
              {o.errors > 0 && (
                <Link href="/revisao?modo=erros" className="btn btn-text">
                  Revisar erros ({o.errors})
                </Link>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="serif" style={{ margin: 0, fontSize: 22, lineHeight: 1.35 }}>
              {o.approved === 0 ? "Nenhum item aprovado ainda." : "Tudo revisado por hoje."}
            </p>
            <p className="lead">
              {o.approved === 0 ? (
                o.drafts > 0 ? (
                  <>
                    Há {plural(o.drafts, "rascunho", "rascunhos")} esperando a sua aprovação em{" "}
                    <Link href="/estudar?estado=rascunho">Estudar</Link>. Só itens aprovados entram na revisão.
                  </>
                ) : (
                  <>
                    Cadastre cards e questões em <Link href="/estudar">Estudar</Link>.
                  </>
                )
              ) : (
                "Os próximos itens voltam quando vencerem."
              )}
            </p>
            {o.errors > 0 && (
              <div>
                <Link href="/revisao?modo=erros" className="btn">
                  Revisar erros ({o.errors})
                </Link>
              </div>
            )}
          </>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}>
        <span style={{ fontSize: 13.5 }}>
          <b style={{ fontWeight: 600 }}>{plural(o.streak.count, "dia", "dias")}</b> {o.streak.count === 1 ? "seguido" : "seguidos"}
        </span>
        <div
          className="streak-grid"
          role="img"
          aria-label={`Últimos 14 dias: ${o.last14.filter((d) => d.done).length} estudados`}
        >
          {o.last14.map((d, i) => (
            <span key={d.day} className={`${d.done ? "done" : ""}${i === o.last14.length - 1 ? " today" : ""}`} title={d.day} />
          ))}
        </div>
        <span className="caption" style={{ fontSize: 12 }}>
          Últimos 14 dias{o.streak.todayDone ? "" : " · hoje pendente"}
        </span>
      </div>
    </section>
  );
}

export default async function TodayPage() {
  const profileId = await currentProfileId();
  const [last, overview] = profileId ? await Promise.all([getLastRead(profileId), getOverview(profileId)]) : [null, null];
  const lastBook = last ? bookById(last.book_id) : undefined;
  const preview = last?.verse ? await getVerseText(last.book_id, last.chapter, last.verse) : null;

  return (
    <main className="page">
      <div className="page-narrow">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="caption">{todayLabel()}</span>
          <h1 className="h1">Hoje</h1>
        </div>

        {overview && <ReviewCard o={overview} />}

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
