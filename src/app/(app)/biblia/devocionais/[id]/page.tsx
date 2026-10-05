import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddDay, CellLink, DayControls, SeriesActions, SeriesTitle } from "./series-client";
import { formatRef } from "@/lib/bible/reference";
import { DAY_ICON, DAY_LABEL, devotionalTemplate, rhythmLabel, STATUS_LABEL } from "@/lib/devotional-plan";
import { getDevotionalSeries } from "@/lib/devotionals";
import { getSeriesList } from "@/lib/series";
import { currentProfileId } from "@/lib/session";
import { dayKey } from "@/lib/srs";

export const metadata: Metadata = { title: "Série de devocionais" };

const shortDay = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

export default async function DevotionalSeriesPage({ params }: PageProps<"/biblia/devocionais/[id]">) {
  const { id } = await params;
  const profileId = await currentProfileId();
  if (!profileId) notFound();
  const [found, cellSeries] = await Promise.all([getDevotionalSeries(profileId, id), getSeriesList(profileId)]);
  if (!found) notFound();
  const { series, days } = found;
  const read = days.filter((d) => d.state === "lido").length;
  const written = days.filter((d) => d.written).length;
  const blank = days.length - written;

  return (
    <main className="page">
      <div className="page-narrow">
        <Link href="/biblia/devocionais" className="caption" style={{ textDecoration: "none" }}>
          ← Devocionais
        </Link>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="label" style={{ display: "flex", gap: 10, alignItems: "center" }}>
            Série{series.about ? ` · ${series.about}` : ""}
            <span className={`dev-status ${series.status}`}>{STATUS_LABEL[series.status]}</span>
          </span>
          <SeriesTitle id={series.id} title={series.title} about={series.about ?? ""} description={series.description ?? ""} />
          {series.description && <p className="lead">{series.description}</p>}
          <span className="muted" style={{ fontSize: 14 }}>
            {rhythmLabel(series.weekdays)} · {days.length} {days.length === 1 ? "dia" : "dias"} · {read} {read === 1 ? "lido" : "lidos"} · modelo{" "}
            {devotionalTemplate(series.template).name.toLowerCase()}
          </span>
        </div>

        {series.status === "draft" && blank > 0 && days.length > 0 && (
          <div className="notice" role="status">
            {written} de {days.length} dias escritos. A série pode ser ativada assim mesmo; os dias em branco continuam esperando o
            seu texto.
          </div>
        )}

        <SeriesActions id={series.id} status={series.status} title={series.title} hasDays={days.length > 0} today={dayKey(new Date())} />

        <section style={{ display: "flex", flexDirection: "column" }} aria-labelledby="days-title">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
            <h2 id="days-title" className="label" style={{ margin: 0 }}>
              Dias
            </h2>
            <span className="caption">✓ lido · ◆ hoje · ○ futuro · – pulado</span>
          </div>
          {days.length === 0 && <p className="caption">Nenhum dia. Acrescente o primeiro abaixo.</p>}
          {days.map((d, i) => (
            <div key={d.id} className="week-row">
              <span className={`dev-day-icon ${d.state}`} title={DAY_LABEL[d.state]} aria-label={DAY_LABEL[d.state]}>
                {DAY_ICON[d.state]}
              </span>
              <Link href={`/biblia/devocionais/${series.id}/${d.id}`} className="week-main">
                <span className="serif week-title" style={{ fontWeight: d.state === "hoje" ? 600 : 500 }}>
                  {d.title}
                </span>
                <span className="muted" style={{ fontSize: 13 }}>
                  Dia {d.number} · {formatRef(d.book_id, d.chapter, d.verse_start, d.verse_end)}
                  {d.date ? ` · ${shortDay(d.date)}` : ""}
                  {d.written ? "" : " · em branco"}
                </span>
              </Link>
              <DayControls seriesId={series.id} dayId={d.id} title={d.title} first={i === 0} last={i === days.length - 1} />
            </div>
          ))}
        </section>

        <AddDay seriesId={series.id} />

        <CellLink id={series.id} current={series.cell_series_id} options={cellSeries.map((s) => ({ id: s.id, title: s.title }))} />
      </div>
    </main>
  );
}
