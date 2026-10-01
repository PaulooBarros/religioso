import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ExamRunner } from "./runner";
import { Icon } from "@/components/icons";
import { getExam, resultsByTheme, WEAK_DAYS, WEAK_THRESHOLD } from "@/lib/exams";
import { getThemes } from "@/lib/queries";
import { getSession } from "@/lib/session";

export const metadata = { title: "Simulado" };

const LETTERS = "ABCDEF";

/** Full-screen exam: the running test, or the result with the commented answer key. */
export default async function ExamPage({ params, searchParams }: PageProps<"/simulado/[id]">) {
  const { id } = await params;
  const { ver } = await searchParams;
  const session = await getSession();
  if (session.mode === "anonymous") redirect("/entrar");
  if (session.mode === "local") redirect("/hoje");
  if (!session.profile) redirect("/perfis");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const [data, themes] = await Promise.all([getExam(session.profile.id, id), getThemes()]);
  if (!data) notFound();
  const { exam, answers } = data;
  if (exam.status === "abandoned") redirect("/simulados");
  const themeName = (tid: string | null) => themes.find((t) => t.id === tid)?.name ?? "Sem tema";
  const title = exam.theme_ids.length ? exam.theme_ids.map(themeName).join(" e ") : "Misto";

  if (exam.status === "running") {
    return (
      <ExamRunner
        examId={exam.id}
        title={title}
        deadline={
          exam.time_limit_min ? new Date(new Date(exam.started_at).getTime() + exam.time_limit_min * 60_000).toISOString() : null
        }
        // The answer key never goes to the browser while the exam is running.
        questions={answers.map((a) => ({
          position: a.position,
          theme: themeName(a.theme_id),
          prompt: a.prompt,
          options: a.options,
          chosen: a.chosen,
          flagged: a.flagged,
        }))}
      />
    );
  }

  // ---------- Result ----------
  const minutes = Math.max(1, Math.round((new Date(exam.finished_at!).getTime() - new Date(exam.started_at).getTime()) / 60_000));
  const byTheme = resultsByTheme(answers).sort((a, b) => a.percent - b.percent);
  const weakest = byTheme.length > 1 && byTheme[0].percent < 100 ? byTheme[0] : null;
  const priority = byTheme.filter((t) => t.themeId && t.percent < WEAK_THRESHOLD).map((t) => themeName(t.themeId));
  const wrongCount = exam.total - (exam.score ?? 0);
  const onlyWrong = ver === "erradas";
  const shown = onlyWrong ? answers.filter((a) => !a.is_correct) : answers;

  return (
    <div className="session">
      <header className="session-head">
        <Link href="/simulados" className="session-link">
          <Icon name="voltar" size={15} />
          Simulados
        </Link>
        <div className="session-count">Simulado · {title}</div>
        <span className="session-link" style={{ visibility: "hidden" }}>
          Simulados
        </span>
      </header>
      <main className="session-main" style={{ justifyContent: "flex-start" }}>
        <div className="session-body" style={{ gap: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span className="label">
              Simulado concluído · {exam.total} {exam.total === 1 ? "questão" : "questões"} · {minutes} min
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span className="serif" style={{ fontSize: 52, fontWeight: 500, lineHeight: 1 }}>
                {exam.score}
              </span>
              <span style={{ fontSize: 16 }}>
                de {exam.total} corretas ({Math.round(((exam.score ?? 0) / exam.total) * 100)}%)
              </span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Por tema</span>
            {byTheme.map((t) => (
              <div key={t.themeId ?? "none"} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                  <span>
                    {weakest === t ? (
                      <>
                        <b style={{ fontWeight: 600 }}>{themeName(t.themeId)}</b> · mais fraco
                      </>
                    ) : (
                      themeName(t.themeId)
                    )}
                  </span>
                  <span>
                    {t.correct} de {t.total}
                  </span>
                </div>
                <div className="domain-bar">
                  <div style={{ width: `${t.percent}%` }} />
                </div>
              </div>
            ))}
          </div>

          <p className="lead">
            {wrongCount === 0
              ? "Nenhuma questão errada. Os acertos não mudam o agendamento da revisão."
              : `${wrongCount === 1 ? "A questão errada entra" : `As ${wrongCount} questões erradas entram`} na sua revisão a partir de amanhã.`}
            {priority.length > 0 &&
              ` Enquanto este for o seu simulado mais recente, por até ${WEAK_DAYS} dias, a revisão do dia começa por ${priority.join(", ")} (abaixo de ${WEAK_THRESHOLD}% de acerto).`}
          </p>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {weakest?.themeId && (
              <Link href={`/trilha/${weakest.themeId}`} className="btn btn-primary">
                Estudar {themeName(weakest.themeId)}
              </Link>
            )}
            <Link href="/simulados" className="btn">
              Novo simulado
            </Link>
          </div>

          <section style={{ display: "flex", flexDirection: "column", gap: 14 }} aria-labelledby="key-title">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <h2 id="key-title" className="serif" style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>
                Gabarito comentado
              </h2>
              {wrongCount > 0 && (
                <nav className="segmented" aria-label="Filtrar gabarito">
                  <Link href={`/simulado/${exam.id}`} aria-current={!onlyWrong ? "page" : undefined} scroll={false}>
                    Todas
                  </Link>
                  <Link href={`/simulado/${exam.id}?ver=erradas`} aria-current={onlyWrong ? "page" : undefined} scroll={false}>
                    Só erradas
                  </Link>
                </nav>
              )}
            </div>
            {shown.map((a) => (
              <div key={a.position} className="item-card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5 }}>
                  <span className="muted">
                    Questão {a.position} · {themeName(a.theme_id)}
                  </span>
                  <b style={{ fontWeight: 600, color: a.is_correct ? "var(--accent)" : "var(--ink)" }}>
                    {a.is_correct ? "✓ Correta" : a.chosen === null ? "Em branco" : "✕ Errada"}
                  </b>
                </div>
                <p className="item-prompt">{a.prompt}</p>
                {!a.is_correct && (
                  <span style={{ fontSize: 14 }}>
                    Sua resposta: {a.chosen === null ? "nenhuma" : `${LETTERS[a.chosen]}) ${a.options[a.chosen]}`}
                  </span>
                )}
                <span style={{ fontSize: 14, fontWeight: 500, color: "var(--accent)" }}>
                  ✓ Correta: {LETTERS[a.correct_option]}) {a.options[a.correct_option]}
                </span>
                {a.explanation && (
                  <p className="serif" style={{ margin: 0, fontSize: 15.5, lineHeight: 1.6, color: "var(--ink-2)", whiteSpace: "pre-wrap" }}>
                    {a.explanation}
                  </p>
                )}
                {a.source_title &&
                  (a.source_url ? (
                    <a className="source-chip" style={{ alignSelf: "flex-start" }} href={a.source_url} target="_blank" rel="noopener noreferrer">
                      {a.source_title}
                    </a>
                  ) : (
                    <span className="source-chip" style={{ alignSelf: "flex-start" }}>
                      {a.source_title}
                    </span>
                  ))}
              </div>
            ))}
          </section>
        </div>
      </main>
    </div>
  );
}
