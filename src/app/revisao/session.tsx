"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FromYourBase, Icon } from "@/components/icons";
import { gradeItem, undoGrade } from "@/lib/actions/review";
import { bookById } from "@/lib/bible/books";
import { chapterHref, parseReference } from "@/lib/bible/reference";
import type { ReviewMode, SessionItem } from "@/lib/review";
import { formatDelay, GRADES, previewIntervals, type Grade, type ReviewState } from "@/lib/srs";

const LETTERS = "ABCDEF";
/** Items due again within this window come back in the same session. */
const SAME_SESSION_MS = 20 * 60_000;

type Recorded = { logId: string; review: SessionItem["review"]; nextIn: string };
type HistoryEntry = { logId: string; item: SessionItem; grade: Grade; reinserted: boolean };

function itemLabel(item: SessionItem) {
  return [item.theme_name, item.subtopic].filter(Boolean).join(" · ") || (item.kind === "card" ? "Card" : "Múltipla escolha");
}

function Sources({ item }: { item: SessionItem }) {
  return (
    <div className="session-sources">
      {item.origin === "ia" ? (
        <span className="origin">
          <span className="origin-ai-mark">IA</span>
          Fala da IA (com fontes)
        </span>
      ) : (
        <FromYourBase />
      )}
      {item.source_url ? (
        <a
          className={`source-chip${item.source_ok === false ? " unverified" : ""}`}
          href={item.source_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {item.source_ok === true && <Icon name="check" size={12} stroke={2.2} />}
          {item.source_title ?? "Fonte"}
          <span className="muted">{item.source_ok === true ? " · verificada" : item.source_ok === false ? " · sem fonte verificada" : ""}</span>
        </a>
      ) : item.source_title ? (
        <span className="source-chip">{item.source_title}</span>
      ) : null}
      {item.machine_translated && <span className="source-chip unverified">Tradução automática do original</span>}
      {item.bible_refs.length > 0 && (
        <span className="muted" style={{ fontSize: 12.5 }}>
          Textos:{" "}
          {item.bible_refs.map((r, i) => {
            const ref = parseReference(r);
            const book = ref ? bookById(ref.book.id) : undefined;
            return (
              <span key={r}>
                {i > 0 && ", "}
                {book && ref ? (
                  <a href={chapterHref(book, ref.chapter, ref.verse)} target="_blank" rel="noopener noreferrer">
                    {r}
                  </a>
                ) : (
                  r
                )}
              </span>
            );
          })}
        </span>
      )}
    </div>
  );
}

export function ReviewSession({
  mode,
  initialQueue,
  title: focusTitle,
  backHref = "/hoje",
}: {
  mode: ReviewMode;
  initialQueue: SessionItem[];
  title?: string;
  backHref?: string;
}) {
  const router = useRouter();
  const [queue, setQueue] = useState(initialQueue);
  const [answered, setAnswered] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [choice, setChoice] = useState<number | null>(null);
  const [recorded, setRecorded] = useState<Recorded | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<Grade, number>>({ 1: 0, 2: 0, 3: 0, 4: 0 });
  const [wrong, setWrong] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [finished, setFinished] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const [endedAt, setEndedAt] = useState<number | null>(null);

  const item = queue[0];
  const total = answered + queue.length;
  const title = focusTitle ?? (mode === "erros" ? "Revisar erros" : "Revisão do dia");
  const backLabel = backHref === "/hoje" ? "Voltar para Hoje" : "Voltar para a trilha";

  function finish() {
    setEndedAt(Date.now());
    setFinished(true);
  }

  async function record(grade: Grade): Promise<Recorded | null> {
    setBusy(true);
    setError(null);
    const res = await gradeItem(item.id, grade, mode);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return null;
    }
    return {
      logId: res.data.logId,
      review: res.data.review,
      nextIn: formatDelay(new Date(res.data.review.due_at).getTime() - Date.now()),
    };
  }

  function advance(grade: Grade, rec: Recorded) {
    const updated: SessionItem = { ...item, review: rec.review };
    const rest = queue.slice(1);
    const comesBack = rec.review && new Date(rec.review.due_at).getTime() - Date.now() < SAME_SESSION_MS;
    const nextQueue = comesBack ? [...rest.slice(0, 3), updated, ...rest.slice(3)] : rest;
    setHistory((h) => [...h, { logId: rec.logId, item, grade, reinserted: Boolean(comesBack) }]);
    setCounts((c) => ({ ...c, [grade]: c[grade] + 1 }));
    if (grade === 1) {
      const key = item.theme_name ?? "sem tema";
      setWrong((w) => ({ ...w, [key]: (w[key] ?? 0) + 1 }));
    }
    setAnswered((a) => a + 1);
    setQueue(nextQueue);
    setRevealed(false);
    setChoice(null);
    setRecorded(null);
    if (nextQueue.length === 0) finish();
  }

  async function gradeCard(grade: Grade) {
    if (busy || !item) return;
    const rec = await record(grade);
    if (rec) advance(grade, rec);
  }

  async function chooseOption(i: number) {
    if (busy || !item || choice !== null) return;
    setChoice(i);
    const rec = await record(i === item.correct_option ? 3 : 1);
    if (rec) setRecorded(rec);
    else setChoice(null);
  }

  function continueMcq() {
    if (!recorded || choice === null) return;
    advance(choice === item.correct_option ? 3 : 1, recorded);
  }

  async function undo() {
    if (busy) return;
    // Answered MCQ still on screen: undo just that answer.
    if (recorded) {
      setBusy(true);
      const res = await undoGrade(recorded.logId);
      setBusy(false);
      if (res.ok) {
        setRecorded(null);
        setChoice(null);
      } else setError(res.error);
      return;
    }
    const last = history[history.length - 1];
    if (!last) return;
    setBusy(true);
    const res = await undoGrade(last.logId);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setHistory((h) => h.slice(0, -1));
    setQueue((q) => [last.item, ...(last.reinserted ? q.filter((x) => x.id !== last.item.id) : q)]);
    setAnswered((a) => a - 1);
    setCounts((c) => ({ ...c, [last.grade]: c[last.grade] - 1 }));
    if (last.grade === 1) {
      const key = last.item.theme_name ?? "sem tema";
      setWrong((w) => ({ ...w, [key]: Math.max(0, (w[key] ?? 1) - 1) }));
    }
    setRevealed(last.item.kind === "card");
    setFinished(false);
  }

  function close() {
    if (answered > 0 && !finished) finish();
    else router.push(backHref);
  }

  // Keyboard: Space reveal · 1–4 grade · A–F choose · Enter continue · F source · Z undo · Esc close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if ((e.target as HTMLElement)?.closest("input, textarea")) return;
      const k = e.key.toLowerCase();
      if (k === "escape") return close();
      if (finished || !item) return;
      if (k === "z") return void undo();
      if (k === "f" && item.source_url) return void window.open(item.source_url, "_blank", "noopener");
      if (item.kind === "card") {
        if (!revealed && (k === " " || k === "enter")) {
          e.preventDefault();
          setRevealed(true);
        } else if (revealed && ["1", "2", "3", "4"].includes(k)) void gradeCard(Number(k) as Grade);
      } else {
        const idx = LETTERS.toLowerCase().indexOf(k);
        if (choice === null && idx >= 0 && idx < (item.options?.length ?? 0)) void chooseOption(idx);
        else if (recorded && (k === "enter" || k === " ")) {
          e.preventDefault();
          continueMcq();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ---------- Empty and finished states ----------
  if (initialQueue.length === 0) {
    return (
      <div className="session session-center">
        <div className="session-card" style={{ gap: 14 }}>
          <span className="label">{title}</span>
          <p className="serif" style={{ margin: 0, fontSize: 26 }}>
            {mode === "erros" ? "Nenhum erro para revisar." : mode === "tema" ? "Nenhum item aprovado aqui." : "Nada para revisar agora."}
          </p>
          <p className="lead">
            {mode === "erros"
              ? "Os itens em que você errou por último aparecem aqui."
              : "Os itens aprovados entram aqui quando vencem. Itens em rascunho precisam ser aprovados em Estudar."}
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href={backHref} className="btn btn-primary">
              {backLabel}
            </Link>
            <Link href="/estudar" className="btn">
              Ir para Estudar
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (finished) {
    const minutes = Math.max(1, Math.round(((endedAt ?? startedAt) - startedAt) / 60_000));
    const wrongThemes = Object.entries(wrong).filter(([, n]) => n > 0);
    return (
      <div className="session session-center">
        <div className="session-card" style={{ gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span className="label label-accent">{queue.length ? "Sessão encerrada" : "Sessão concluída"}</span>
            <p className="serif" style={{ margin: 0, fontSize: 26, lineHeight: 1.3 }}>
              {answered} {answered === 1 ? "resposta" : "respostas"} em {minutes} {minutes === 1 ? "minuto" : "minutos"}.
            </p>
          </div>
          <div className="session-summary">
            {[...GRADES].reverse().map((g) => (
              <div key={g.grade}>
                <span>{g.label}</span>
                <span>{counts[g.grade]}</span>
              </div>
            ))}
          </div>
          {wrongThemes.length > 0 && (
            <p className="lead">
              Erros em: <b>{wrongThemes.map(([t, n]) => `${t} (${n})`).join(", ")}</b>. Esses itens voltam logo, e você pode
              treiná-los em “Revisar erros”.
            </p>
          )}
          {queue.length > 0 && <p className="lead">Ficaram {queue.length} itens para depois.</p>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href={backHref} className="btn btn-lg btn-primary">
              {backLabel}
            </Link>
            {counts[1] > 0 && mode !== "erros" && (
              <a href="/revisao?modo=erros" className="btn btn-lg">
                Revisar erros
              </a>
            )}
            {history.length > 0 && (
              <button type="button" className="btn btn-lg btn-ghost" onClick={undo} disabled={busy}>
                Desfazer última
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------- Question ----------
  const intervals = previewIntervals(item.review as ReviewState | null);
  const isMcq = item.kind === "mcq";
  const correct = choice !== null && choice === item.correct_option;

  return (
    <div className="session">
      <div className="session-progress" aria-hidden="true">
        <div style={{ width: `${(answered / total) * 100}%` }} />
      </div>
      <header className="session-head">
        <button type="button" className="session-link" onClick={close}>
          <Icon name="fechar" size={15} />
          Encerrar
        </button>
        <div className="session-count">
          <span className="desktop-only">{title} · </span>
          {answered + 1} de {total}
        </div>
        {item.source_url ? (
          <a className="session-link" href={item.source_url} target="_blank" rel="noopener noreferrer">
            Ver fonte <span className="kbd desktop-only">F</span>
          </a>
        ) : (
          <span className="session-link" style={{ visibility: "hidden" }}>
            Ver fonte
          </span>
        )}
      </header>

      <main
        className="session-main"
        onClick={() => {
          if (!isMcq && !revealed) setRevealed(true);
        }}
      >
        <div className="session-body">
          <span className="caption">
            {itemLabel(item)}
            {!item.review && " · novo"}
          </span>
          <p className="session-question">{item.prompt}</p>

          {isMcq ? (
            <div className="session-options" role="group" aria-label="Alternativas">
              {item.options?.map((o, i) => {
                const isRight = choice !== null && i === item.correct_option;
                const isChosenWrong = choice === i && !isRight;
                return (
                  <button
                    key={i}
                    type="button"
                    className={`session-option${isRight ? " right" : ""}${isChosenWrong ? " chosen" : ""}`}
                    disabled={choice !== null || busy}
                    onClick={() => chooseOption(i)}
                  >
                    <span className="session-letter">{LETTERS[i]}</span>
                    <span style={{ flex: 1 }}>{o}</span>
                    {isRight && (
                      <span className="session-tag right">
                        <Icon name="check" size={12} stroke={2.4} /> Correta
                      </span>
                    )}
                    {isChosenWrong && (
                      <span className="session-tag">
                        <Icon name="fechar" size={12} stroke={2.4} /> Sua resposta
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : null}

          {((!isMcq && revealed) || (isMcq && choice !== null)) && (
            <div className="session-answer">
              {!isMcq && <p className="session-answer-text">{item.answer}</p>}
              {item.explanation && <p className="session-explanation">{item.explanation}</p>}
              <Sources item={item} />
            </div>
          )}
        </div>
      </main>

      <footer className="session-foot">
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {!isMcq && !revealed && (
          <button type="button" className="btn btn-lg session-reveal" onClick={() => setRevealed(true)}>
            Revelar resposta <span className="kbd desktop-only">Espaço</span>
          </button>
        )}
        {!isMcq && revealed && (
          <div className="session-grades">
            {GRADES.map((g) => (
              <button key={g.grade} type="button" disabled={busy} onClick={() => gradeCard(g.grade)}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <b>{g.label}</b>
                  <span className="kbd desktop-only">{g.key}</span>
                </span>
                <span className="muted" style={{ fontSize: 12 }}>
                  {intervals[g.grade]}
                </span>
              </button>
            ))}
          </div>
        )}
        {isMcq && choice === null && <span className="caption">Escolha uma alternativa{" "}<span className="desktop-only">(teclas A a {LETTERS[(item.options?.length ?? 1) - 1]})</span></span>}
        {isMcq && recorded && (
          <>
            <button type="button" className="btn btn-lg btn-primary session-reveal" onClick={continueMcq}>
              Continuar <span className="kbd desktop-only" style={{ color: "inherit", borderColor: "currentColor" }}>Enter</span>
            </button>
            <span className="caption">
              Registrado como “{correct ? "Bom" : "Errei"}” · volta em{" "}
              {recorded.nextIn}
            </span>
          </>
        )}
        <span className="caption desktop-only">
          {isMcq ? "A–F escolher · Enter continuar" : "Espaço revelar · 1–4 avaliar"} · F ver fonte · Z desfazer · Esc encerrar
        </span>
      </footer>
    </div>
  );
}
