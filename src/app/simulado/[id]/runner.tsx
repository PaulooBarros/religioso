"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { abandonExam, finishExam, saveExamAnswer } from "@/lib/actions/exams";

const LETTERS = "ABCDEF";

type Question = {
  position: number;
  theme: string;
  prompt: string;
  options: string[];
  chosen: number | null;
  flagged: boolean;
};

function clock(seconds: number) {
  const s = Math.max(0, seconds);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function ExamRunner({
  examId,
  title,
  deadline,
  questions: initial,
}: {
  examId: string;
  title: string;
  deadline: string | null;
  questions: Question[];
}) {
  const router = useRouter();
  const [questions, setQuestions] = useState(initial);
  const [index, setIndex] = useState(() => Math.max(0, initial.findIndex((q) => q.chosen === null)));
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const submitted = useRef(false);

  const q = questions[index];
  const answered = questions.filter((x) => x.chosen !== null).length;

  const submit = useCallback(() => {
    if (submitted.current) return;
    submitted.current = true;
    start(async () => {
      const res = await finishExam(examId);
      if (res.ok) router.refresh();
      else {
        submitted.current = false;
        setError(res.error);
      }
    });
  }, [examId, router]);

  // Countdown; hands the exam in when time runs out.
  useEffect(() => {
    if (!deadline) return;
    const end = new Date(deadline).getTime();
    const tick = () => {
      const left = Math.round((end - Date.now()) / 1000);
      setRemaining(left);
      if (left <= 0) submit();
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [deadline, submit]);

  function update(position: number, patch: Partial<Pick<Question, "chosen" | "flagged">>) {
    const current = questions.find((x) => x.position === position)!;
    const next = { ...current, ...patch };
    setQuestions((qs) => qs.map((x) => (x.position === position ? next : x)));
    setError(null);
    void saveExamAnswer(examId, position, next.chosen, next.flagged).then((res) => {
      if (!res.ok) {
        setQuestions((qs) => qs.map((x) => (x.position === position ? current : x)));
        setError(res.error);
      }
    });
  }

  function handIn() {
    const blank = questions.length - answered;
    const msg = blank
      ? `${blank === 1 ? "Falta 1 questão em branco" : `Faltam ${blank} questões em branco`}. Entregar mesmo assim?`
      : "Entregar o simulado?";
    if (window.confirm(msg)) submit();
  }

  function leave() {
    if (!window.confirm("Sair do simulado? As respostas desta prova serão descartadas.")) return;
    start(async () => {
      await abandonExam(examId);
      router.push("/simulados");
    });
  }

  // Keyboard: A–F choose · ← → navigate · M flag
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || pending) return;
      const k = e.key.toLowerCase();
      const opt = LETTERS.toLowerCase().indexOf(k);
      if (k.length === 1 && opt >= 0 && opt < q.options.length) update(q.position, { chosen: opt });
      else if (k === "arrowright") setIndex((i) => Math.min(questions.length - 1, i + 1));
      else if (k === "arrowleft") setIndex((i) => Math.max(0, i - 1));
      else if (k === "m") update(q.position, { flagged: !q.flagged });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="session">
      <header className="session-head" style={{ borderBottom: "1px solid var(--line)" }}>
        <button type="button" className="session-link" onClick={leave} disabled={pending}>
          <Icon name="fechar" size={15} />
          <span className="desktop-only">Sair do simulado</span>
          <span className="mobile-only">Sair</span>
        </button>
        <div className="session-count">
          Simulado · {title} · {questions.length} {questions.length === 1 ? "questão" : "questões"}
        </div>
        <span
          role="timer"
          aria-live="off"
          style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", color: remaining !== null && remaining <= 60 ? "var(--accent)" : undefined }}
        >
          {deadline ? (remaining === null ? "…" : `${clock(remaining)} restantes`) : "Sem limite"}
        </span>
      </header>

      <div className="exam">
        <main className="exam-main">
          <div className="session-body" style={{ gap: 22 }}>
            <span className="caption">
              Questão {q.position} de {questions.length} · {q.theme}
            </span>
            <p className="session-question" style={{ fontSize: 26 }}>
              {q.prompt}
            </p>
            <div className="session-options" role="radiogroup" aria-label="Alternativas">
              {q.options.map((o, i) => (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={q.chosen === i}
                  className={`session-option${q.chosen === i ? " chosen" : ""}`}
                  onClick={() => update(q.position, { chosen: q.chosen === i ? null : i })}
                >
                  <span className="session-letter">{LETTERS[i]}</span>
                  <span style={{ flex: 1 }}>{o}</span>
                  {q.chosen === i && <span className="session-tag">Selecionada</span>}
                </button>
              ))}
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "space-between" }}>
              <button type="button" className="btn" disabled={index === 0} onClick={() => setIndex(index - 1)}>
                ← Anterior
              </button>
              <button type="button" className="btn btn-ghost" aria-pressed={q.flagged} onClick={() => update(q.position, { flagged: !q.flagged })}>
                {q.flagged ? "◆ Marcada para revisar" : "◇ Marcar para revisar"}
              </button>
              <button type="button" className="btn" disabled={index === questions.length - 1} onClick={() => setIndex(index + 1)}>
                Próxima →
              </button>
            </div>
          </div>
        </main>

        <aside className="exam-aside" aria-label="Questões da prova">
          <span className="label">Questões · {answered} de {questions.length} respondidas</span>
          <div className="exam-grid">
            {questions.map((x, i) => (
              <button
                key={x.position}
                type="button"
                className={`${x.chosen !== null ? "answered" : ""}${i === index ? " current" : ""}`}
                aria-label={`Questão ${x.position}${x.chosen !== null ? ", respondida" : ", em branco"}${x.flagged ? ", marcada para revisar" : ""}`}
                aria-current={i === index ? "true" : undefined}
                onClick={() => setIndex(i)}
              >
                {x.position}
                {x.flagged && <span aria-hidden="true">◇</span>}
              </button>
            ))}
          </div>
          <div className="caption" style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 2 }}>
            <span>■ respondida · □ em branco</span>
            <span>◇ marcada para revisar</span>
          </div>
          <div style={{ flex: 1 }} />
          <button type="button" className="btn btn-lg btn-primary" onClick={handIn} disabled={pending}>
            {pending ? "Entregando…" : "Entregar simulado"}
          </button>
        </aside>
      </div>
    </div>
  );
}
