import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EnrollControls } from "../enroll";
import { DomainBar } from "../../trilha/theme-list";
import { getCatechism } from "@/lib/catechisms";
import { currentProfileId } from "@/lib/session";

type Params = { id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Catecismo · ${id}` };
}

const STATUS = {
  nova: { icon: "○", label: "Nova" },
  estudo: { icon: "◐", label: "Em estudo" },
  dominada: { icon: "●", label: "Dominada" },
} as const;

const FILTERS = [
  ["todas", "Todas"],
  ["nova", "Novas"],
  ["estudo", "Em estudo"],
  ["dominada", "Dominadas"],
  ["bloqueada", "A liberar"],
] as const;

export default async function CatechismPage({ params, searchParams }: PageProps<"/catecismos/[id]">) {
  const { id } = await params;
  const { filtro } = await searchParams;
  const profileId = await currentProfileId();
  if (!profileId) notFound();
  const data = await getCatechism(profileId, id);
  if (!data) notFound();
  const { catechism: c, questions } = data;

  const filter = FILTERS.some(([k]) => k === filtro) ? (filtro as string) : "todas";
  const visible = questions.filter((q) =>
    filter === "todas" ? true : filter === "bloqueada" ? q.status === null : q.status === filter,
  );

  return (
    <main className="page">
      <div className="page-narrow">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Link href="/catecismos" className="caption" style={{ textDecoration: "none" }}>
            ← Catecismos
          </Link>
          <h1 className="h1">{c.name}</h1>
          <span className="caption">
            {c.year} · {c.total} perguntas · original em {c.original_lang} ·{" "}
            <a href={c.source_url} target="_blank" rel="noopener noreferrer">
              ler o original
            </a>
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 14, maxWidth: 460 }}>
            <div style={{ flex: 1 }}>
              <DomainBar percent={c.percent} />
            </div>
            <span style={{ fontSize: 13, whiteSpace: "nowrap" }}>
              {c.released === 0 ? "Não iniciado" : `${c.released} de ${c.total} liberadas · ${c.mastered} dominadas`}
            </span>
          </div>
        </div>

        <EnrollControls
          catechismId={c.id}
          state={c.enrollment?.state ?? null}
          perDay={c.enrollment?.per_day ?? null}
          finished={c.released >= c.total}
        />

        <p className="item-note" style={{ borderLeftColor: "var(--faint)", background: "transparent", border: "1px dashed var(--faint)" }}>
          <b>Tradução automática do original.</b> {c.translation_note}
        </p>

        <nav className="segmented" aria-label="Filtrar perguntas">
          {FILTERS.map(([key, label]) => (
            <Link
              key={key}
              href={key === "todas" ? `/catecismos/${c.id}` : `/catecismos/${c.id}?filtro=${key}`}
              aria-current={filter === key ? "page" : undefined}
              scroll={false}
            >
              {label}
            </Link>
          ))}
        </nav>

        {visible.length === 0 ? (
          <p className="caption">Nenhuma pergunta nesse filtro.</p>
        ) : (
          <div>
            {visible.map((q) => {
              const st = q.status ? STATUS[q.status] : null;
              return (
                <details key={q.number} className="catechism-q">
                  <summary>
                    <span className={`status-icon ${q.status ?? ""}`} title={st?.label ?? "Ainda não liberada"} aria-label={st?.label ?? "Ainda não liberada"}>
                      {st?.icon ?? "·"}
                    </span>
                    <span className="catechism-n">{q.number}</span>
                    <span>{q.question_pt}</span>
                  </summary>
                  <div className="catechism-a">
                    <p className="serif" style={{ margin: 0, fontSize: 17, lineHeight: 1.6 }}>
                      {q.answer_pt}
                    </p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <span className="source-chip unverified">Tradução automática do original</span>
                      <a className="source-chip" href={c.source_url} target="_blank" rel="noopener noreferrer">
                        {c.name}, pergunta {q.number}
                      </a>
                    </div>
                    <p className="catechism-original">
                      <b>
                        Original ({c.original_lang}, {c.year}):
                      </b>{" "}
                      {q.question_original} — {q.answer_original}
                    </p>
                    {q.question_en && q.answer_en && (
                      <p className="catechism-original">
                        <b>Tradução inglesa de 1863:</b> {q.question_en} — {q.answer_en}
                      </p>
                    )}
                  </div>
                </details>
              );
            })}
            <p className="caption" style={{ marginTop: 12 }}>
              ○ Nova · ◐ Em estudo · ● Dominada · “·” ainda não liberada
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
