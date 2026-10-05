import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddWeek, SeriesHeader, WeekControls } from "./series-client";
import { formatRef } from "@/lib/bible/reference";
import { STATUS_LABEL } from "@/lib/devotional-plan";
import { getDevotionalSeriesForCell } from "@/lib/devotionals";
import { templateOf } from "@/lib/message-templates";
import { getSeries, getTaught, taughtBefore, type WeekStatus } from "@/lib/series";
import { currentProfileId } from "@/lib/session";

export const metadata: Metadata = { title: "Série" };

const day = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

const STATUS: Record<WeekStatus, string> = {
  "a-preparar": "A preparar",
  "em-preparo": "Em preparo",
  pronta: "Pronta",
  ensinada: "Ensinada",
};

export default async function SeriesPage({ params }: PageProps<"/celula/series/[id]">) {
  const { id } = await params;
  const profileId = await currentProfileId();
  if (!profileId) notFound();
  const [found, taught, devotionals] = await Promise.all([getSeries(profileId, id), getTaught(profileId), getDevotionalSeriesForCell(profileId, id)]);
  if (!found) notFound();
  const { series, weeks } = found;
  const done = weeks.filter((w) => w.status === "ensinada").length;
  // The next week to work on: the first one not taught yet.
  const next = weeks.find((w) => w.status !== "ensinada");

  return (
    <main className="page">
      <div className="page-narrow">
        <Link href="/celula" className="caption" style={{ textDecoration: "none" }}>
          ← Célula
        </Link>
        <SeriesHeader id={series.id} title={series.title} about={series.about ?? ""} weekCount={weeks.length} />
        <span className="muted" style={{ fontSize: 14, marginTop: -16 }}>
          {weeks.length} {weeks.length === 1 ? "semana" : "semanas"} · {done} {done === 1 ? "ensinada" : "ensinadas"} · modelo{" "}
          {templateOf(series.template).name.toLowerCase()} · {series.duration_min} min
          {series.audience ? ` · ${series.audience}` : ""}
        </span>

        <section style={{ display: "flex", flexDirection: "column" }} aria-label="Semanas">
          {weeks.length === 0 && <p className="caption">Nenhuma semana. Acrescente a primeira abaixo.</p>}
          {weeks.map((w, i) => {
            const repeats = taughtBefore(taught, w, w.id);
            return (
              <div key={w.id} className="week-row">
                <span className="week-n">{i + 1}</span>
                <Link href={`/celula/${w.id}`} className="week-main">
                  <span className="serif week-title" style={{ fontWeight: w === next ? 600 : 500 }}>
                    {w.title}
                  </span>
                  <span className="muted" style={{ fontSize: 13 }}>
                    {formatRef(w.book_id, w.chapter, w.verse_start, w.verse_end)} ·{" "}
                    {w.taught_on ? `Ensinada em ${day(w.taught_on)}` : STATUS[w.status]}
                  </span>
                  {repeats.length > 0 && (
                    <span style={{ fontSize: 12.5, color: "var(--accent)" }}>
                      Passagem já ensinada: {repeats.map((t) => `“${t.title}” (${formatRef(t.book_id, t.chapter, t.verse_start, t.verse_end)}, ${day(t.taught_on)})`).join("; ")}
                    </span>
                  )}
                </Link>
                <WeekControls seriesId={series.id} messageId={w.id} title={w.title} first={i === 0} last={i === weeks.length - 1} />
              </div>
            );
          })}
        </section>

        <AddWeek seriesId={series.id} />

        {devotionals.length > 0 && (
          <section style={{ display: "flex", flexDirection: "column", gap: 8 }} aria-labelledby="dev-title">
            <h2 id="dev-title" className="label" style={{ margin: 0 }}>
              Devocionais que acompanham esta série
            </h2>
            {devotionals.map((d) => (
              <Link key={d.id} href={`/biblia/devocionais/${d.id}`} className="msg-version">
                <span>{d.title}</span>
                <span className="muted">{STATUS_LABEL[d.status]}</span>
              </Link>
            ))}
          </section>
        )}

        <section style={{ display: "flex", flexDirection: "column", gap: 8 }} aria-labelledby="taught-title">
          <h2 id="taught-title" className="label" style={{ margin: 0 }}>
            Já ensinado ao grupo
          </h2>
          {taught.length === 0 ? (
            <p className="caption" style={{ margin: 0 }}>
              Nada ainda. As mensagens marcadas como ensinadas aparecem aqui, desta série ou não, para você não repetir uma
              passagem sem querer.
            </p>
          ) : (
            taught.map((t) => (
              <Link key={t.id} href={`/celula/${t.id}`} className="msg-version">
                <span>
                  {formatRef(t.book_id, t.chapter, t.verse_start, t.verse_end)} · {t.title}
                </span>
                <span className="muted">{day(t.taught_on)}</span>
              </Link>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
