import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DayToggle, PlanActions } from "./plan-client";
import { DomainBar } from "../../../trilha/theme-list";
import { bookById } from "@/lib/bible/books";
import { chapterHref } from "@/lib/bible/reference";
import { planStatus } from "@/lib/reading-plan";
import { getReadingPlan, type PlanDay } from "@/lib/reading-plans";
import { currentProfileId } from "@/lib/session";
import { dayKey } from "@/lib/srs";

export const metadata: Metadata = { title: "Plano de leitura" };

const shortDay = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
const longDay = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

function DayRow({ planId, day, today, highlight }: { planId: string; day: PlanDay; today: string; highlight: boolean }) {
  return (
    <div className="plan-row">
      <DayToggle planId={planId} day={day.number} read={day.read} label={day.label} />
      <span className="plan-row-main">
        <span style={{ fontWeight: highlight ? 600 : 400 }}>{day.label}</span>
        <span className="muted" style={{ fontSize: 12.5 }}>
          Dia {day.number} · {shortDay(day.date)}
          {day.date === today ? " · hoje" : ""}
          {!day.read && day.date < today ? " · atrasado" : ""}
        </span>
      </span>
    </div>
  );
}

export default async function PlanPage({ params }: PageProps<"/biblia/plano/[id]">) {
  const { id } = await params;
  const profileId = await currentProfileId();
  if (!profileId) notFound();
  const found = await getReadingPlan(profileId, id);
  if (!found) notFound();
  const { plan, days, progress } = found;
  const today = dayKey(new Date());
  const next = progress.next ? days[progress.next - 1] : null;
  // The days around the next reading; the full list stays folded below.
  const from = next ? Math.max(0, next.number - 3) : Math.max(0, days.length - 7);
  const around = days.slice(from, from + 10);
  const first = bookById(plan.book_start);
  const last = bookById(plan.book_end);

  return (
    <main className="page">
      <div className="page-narrow">
        <Link href="/biblia/plano" className="caption" style={{ textDecoration: "none" }}>
          ← Planos de leitura
        </Link>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span className="label">
            Plano{plan.archived_at ? " · arquivado" : ""} · {first?.id === last?.id ? first?.name : `${first?.name} a ${last?.name}`}
          </span>
          <h1 className="h1">{plan.title}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 14, maxWidth: 460 }}>
            <div style={{ flex: 1 }}>
              <DomainBar percent={progress.percent} />
            </div>
            <span style={{ fontSize: 13.5, whiteSpace: "nowrap" }}>
              {progress.done} de {progress.total} dias · {progress.percent}%
            </span>
          </div>
          <span className="muted" style={{ fontSize: 14 }}>
            {planStatus(progress)} · começou em {longDay(plan.start_date)} · termina em {longDay(days[days.length - 1].date)}
          </span>
        </div>

        {next ? (
          <section className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }} aria-labelledby="next-title">
            <span id="next-title" className="label label-accent">
              {next.date === today ? "Leitura de hoje" : next.date < today ? "Próxima leitura (atrasada)" : "Próxima leitura"} · dia {next.number}
            </span>
            <span className="serif" style={{ fontSize: 26, fontWeight: 500 }}>
              {next.label}
            </span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {next.chapters.map((c) => {
                const book = bookById(c.bookId)!;
                return (
                  <Link key={`${c.bookId}-${c.chapter}`} href={chapterHref(book, c.chapter)} className="chip">
                    {book.abbrev} {c.chapter}
                  </Link>
                );
              })}
            </div>
            <div>
              <DayToggle planId={plan.id} day={next.number} read={false} label={next.label} big />
            </div>
          </section>
        ) : (
          <div className="notice" role="status">
            Plano concluído: todas as {progress.total} leituras feitas.
          </div>
        )}

        <PlanActions id={plan.id} title={plan.title} archived={Boolean(plan.archived_at)} late={progress.late} finished={progress.next === null} />

        <section style={{ display: "flex", flexDirection: "column" }} aria-labelledby="around-title">
          <h2 id="around-title" className="label" style={{ margin: "0 0 4px" }}>
            {next ? "Estes dias" : "Últimos dias"}
          </h2>
          {around.map((d) => (
            <DayRow key={d.number} planId={plan.id} day={d} today={today} highlight={d.number === next?.number} />
          ))}
        </section>

        <details>
          <summary style={{ cursor: "pointer", fontSize: 14 }}>Todos os {days.length} dias</summary>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 8 }}>
            {days.map((d) => (
              <DayRow key={d.number} planId={plan.id} day={d} today={today} highlight={d.number === next?.number} />
            ))}
          </div>
        </details>
      </div>
    </main>
  );
}
