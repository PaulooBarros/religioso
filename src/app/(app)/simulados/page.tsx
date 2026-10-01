import Link from "next/link";
import { NewExam } from "./new-exam";
import { DomainBar } from "../trilha/theme-list";
import { relativeDay } from "@/lib/dates";
import { getDiagnosis, getExams, getExamThemes } from "@/lib/exams";
import { getThemes } from "@/lib/queries";
import { currentProfileId } from "@/lib/session";

export const metadata = { title: "Simulados" };

const TREND = {
  subindo: "↑ subindo",
  caindo: "↓ caindo",
  estável: "→ estável",
  "primeira medição": "primeira medição",
} as const;

export default async function ExamsPage({ searchParams }: PageProps<"/simulados">) {
  const { tema } = await searchParams;
  const profileId = await currentProfileId();
  if (!profileId) {
    return (
      <main className="page">
        <p className="lead">Escolha um perfil para fazer simulados.</p>
      </main>
    );
  }
  const [setup, exams, diagnosis, themes] = await Promise.all([
    getExamThemes(profileId),
    getExams(profileId),
    getDiagnosis(profileId),
    getThemes(),
  ]);
  const themeName = (id: string | null) => themes.find((t) => t.id === id)?.name ?? "Sem tema";
  const running = exams.find((e) => e.status === "running");
  const finished = exams.filter((e) => e.status === "finished");

  return (
    <main className="page">
      <div className="page-narrow">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="label">Estudar</span>
          <h1 className="h1">Simulados</h1>
        </div>

        {running && (
          <div className="notice" role="status">
            <span style={{ flex: 1 }}>
              <b style={{ fontWeight: 600 }}>Há um simulado em andamento</b>, com {running.total} questões, começado{" "}
              {relativeDay(running.started_at)}.
            </span>
            <Link href={`/simulado/${running.id}`} className="btn btn-sm btn-primary">
              Continuar
            </Link>
          </div>
        )}

        {setup.total === 0 ? (
          <div className="empty">
            <p className="empty-title">Ainda não há questões para simulado.</p>
            <p className="lead">
              O simulado usa questões de múltipla escolha aprovadas. Cadastre ou aprove algumas em{" "}
              <Link href="/estudar">Estudar</Link>.
            </p>
          </div>
        ) : (
          <NewExam themes={setup.themes} total={setup.total} preset={typeof tema === "string" ? tema : undefined} />
        )}

        {diagnosis.length > 0 && (
          <section style={{ display: "flex", flexDirection: "column", gap: 14 }} aria-labelledby="diag-title">
            <h2 id="diag-title" className="h2" style={{ fontSize: 24 }}>
              Diagnóstico por tema
            </h2>
            <p className="caption" style={{ margin: 0 }}>
              Acerto em todos os simulados concluídos, do tema mais fraco ao mais forte. A tendência compara as duas
              últimas provas em que o tema apareceu.
            </p>
            {diagnosis.map((d) => (
              <div key={d.themeId ?? "none"} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13.5, flexWrap: "wrap" }}>
                  <span>
                    {d.themeId ? <Link href={`/trilha/${d.themeId}`}>{themeName(d.themeId)}</Link> : themeName(null)}
                  </span>
                  <span className="muted">
                    {d.percent}% · {d.correct} de {d.total} · {TREND[d.trend]}
                  </span>
                </div>
                <DomainBar percent={d.percent} />
              </div>
            ))}
          </section>
        )}

        {finished.length > 0 && (
          <section style={{ display: "flex", flexDirection: "column", gap: 4 }} aria-labelledby="hist-title">
            <h2 id="hist-title" className="h2" style={{ fontSize: 24, marginBottom: 8 }}>
              Histórico
            </h2>
            {finished.map((e) => (
              <Link key={e.id} href={`/simulado/${e.id}`} className="trail-sub" style={{ gridTemplateColumns: "minmax(0, 1fr) auto" }}>
                <span>
                  {e.theme_ids.length ? e.theme_ids.map(themeName).join(" e ") : "Misto"}
                  <span className="muted" style={{ fontSize: 12.5 }}>
                    {" "}
                    · {relativeDay(e.finished_at ?? e.started_at)}
                  </span>
                </span>
                <span>
                  {e.score} de {e.total}
                </span>
              </Link>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
