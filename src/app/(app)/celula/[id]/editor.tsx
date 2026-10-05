"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  deleteMessage,
  keepVersion,
  saveMessage,
  setChecks,
  setPassage,
  setReady,
  setTaught,
  type MessageContent,
} from "@/lib/actions/messages";
import type { Passage, VerseCounts } from "@/lib/bible/extract";
import { buildChecklist, liveChecks } from "@/lib/message-checks";
import {
  countWords,
  hintFor,
  MAX_BLOCKS,
  retitle,
  TEMPLATES,
  templateOf,
  WORDS_PER_MINUTE,
  type MessageBlock,
  type TemplateId,
} from "@/lib/message-templates";

type Status = "saved" | "dirty" | "saving" | "error";

export type EditorMessage = {
  id: string;
  title: string;
  template: TemplateId;
  duration_min: number;
  audience: string | null;
  topic: string | null;
  blocks: MessageBlock[];
  version: number;
  taught_on: string | null;
  checks: string[];
  ready_at: string | null;
};

export type PassageNote = { id: string; body: string; ref: string };

export function Editor({
  message,
  passage,
  passageShort,
  passageRef,
  counts,
  readerHref,
  verses,
  notes,
  versions,
  taughtLabel,
}: {
  message: EditorMessage;
  passage: string;
  passageShort: string;
  passageRef: Passage;
  counts: VerseCounts;
  readerHref: string;
  verses: { n: number; text: string }[];
  notes: PassageNote[];
  versions: { version: number; label: string }[];
  taughtLabel: string | null;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(message.title);
  const [template, setTemplate] = useState<TemplateId>(message.template);
  const [duration, setDuration] = useState(message.duration_min);
  const [audience, setAudience] = useState(message.audience ?? "");
  const [topic, setTopic] = useState(message.topic ?? "");
  const [blocks, setBlocks] = useState<MessageBlock[]>(message.blocks);
  const [status, setStatus] = useState<Status>("saved");
  const [error, setError] = useState<string | null>(null);
  const [busy, startAction] = useTransition();
  const [editingPassage, setEditingPassage] = useState(false);
  const [passageInput, setPassageInput] = useState(passageShort);
  const [checked, setChecked] = useState<string[]>(message.checks);
  const [ready, setReadyState] = useState(Boolean(message.ready_at));

  const content: MessageContent = { title, template, duration, audience, topic, blocks };
  const latest = useRef({ content, pending: false });
  useEffect(() => {
    latest.current = { content, pending: status === "dirty" || status === "error" };
  });

  // Any change to the outline sends it back to "being prepared" (the server does the same on save).
  const dirty = () => {
    setStatus("dirty");
    setReadyState(false);
  };

  // Autosave shortly after the last change.
  useEffect(() => {
    if (status !== "dirty") return;
    const timer = setTimeout(async () => {
      setStatus("saving");
      const r = await saveMessage(message.id, { title, template, duration, audience, topic, blocks });
      if (!r.ok) setError(r.error);
      // A change made while saving keeps the "dirty" state and triggers another save.
      setStatus((s) => (s === "saving" ? (r.ok ? "saved" : "error") : s));
    }, 1200);
    return () => clearTimeout(timer);
  }, [status, message.id, title, template, duration, audience, topic, blocks]);

  // Leaving the page before the autosave fires: save what is pending.
  useEffect(() => {
    const id = message.id;
    const ref = latest;
    return () => {
      if (ref.current.pending) void saveMessage(id, ref.current.content);
    };
  }, [message.id]);

  useEffect(() => {
    if (status === "saved") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status]);

  function patchBlock(id: string, patch: Partial<MessageBlock>) {
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    dirty();
  }

  function moveBlock(index: number, delta: number) {
    const to = index + delta;
    if (to < 0 || to >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[to]] = [next[to], next[index]];
    setBlocks(next);
    dirty();
  }

  function removeBlock(block: MessageBlock) {
    if (block.text.trim() && !window.confirm(`Remover o bloco “${block.title}” e o texto dele?`)) return;
    setBlocks((bs) => bs.filter((b) => b.id !== block.id));
    dirty();
  }

  function addBlock(kind: MessageBlock["kind"], blockTitle: string) {
    setBlocks((bs) => [...bs, { id: crypto.randomUUID(), kind, title: blockTitle, text: "" }]);
    dirty();
  }

  function changeTemplate(next: TemplateId) {
    if (next === template) return;
    setBlocks((bs) => retitle(bs, template, next));
    setTemplate(next);
    dirty();
  }

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>, after?: () => void) {
    setError(null);
    startAction(async () => {
      const r = await action();
      if (!r.ok) {
        setError(r.error);
        return;
      }
      after?.();
      router.refresh();
    });
  }

  const passageWords = verses.reduce((sum, v) => sum + countWords(v.text), 0);
  const words = blocks.reduce((sum, b) => sum + countWords(b.text), 0) + passageWords;
  const checklist = buildChecklist({ blocks, passage: passageRef, passageLabel: passageShort, passageWords, duration, counts, checked });

  function toggleCheck(key: string) {
    const next = checked.includes(key) ? checked.filter((k) => k !== key) : [...checked, key];
    setChecked(next);
    setError(null);
    startAction(async () => {
      const r = await setChecks(message.id, next);
      if (!r.ok) return setError(r.error);
      if (ready) {
        setReadyState(false);
        await setReady(message.id, false);
        router.refresh();
      }
    });
  }

  function markReady() {
    setError(null);
    startAction(async () => {
      // The server checks what is saved, so save the outline and the ticks first.
      const saved = await saveMessage(message.id, content);
      if (!saved.ok) return setError(saved.error);
      setStatus("saved");
      const live = liveChecks(checklist);
      const ticks = await setChecks(message.id, live);
      if (!ticks.ok) return setError(ticks.error);
      setChecked(live);
      const r = await setReady(message.id, true);
      if (!r.ok) return setError(r.error);
      setReadyState(true);
      router.refresh();
    });
  }
  const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));
  const missing = templateOf(template).blocks.filter((t) => !blocks.some((b) => b.kind === t.kind));
  const statusText = { saved: "Salvo", dirty: "Alterações não salvas…", saving: "Salvando…", error: "Não foi salvo" }[status];

  return (
    <div className="msg">
      <div className="msg-main">
        <div className="msg-head">
          <Link href="/celula" className="caption" style={{ textDecoration: "none" }}>
            ← Célula
          </Link>
          <span className="caption" role="status" style={{ flex: 1, textAlign: "right" }}>
            {statusText} · versão {message.version}
          </span>
          {status === "error" && (
            <button type="button" className="btn btn-sm" onClick={dirty}>
              Tentar de novo
            </button>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {editingPassage ? (
            <form
              className="inline-form"
              onSubmit={(e) => {
                e.preventDefault();
                run(
                  () => setPassage(message.id, passageInput),
                  () => setEditingPassage(false),
                );
              }}
            >
              <label className="visually-hidden" htmlFor="msg-passage">
                Passagem
              </label>
              <input
                id="msg-passage"
                className="input"
                style={{ maxWidth: 220, minHeight: 36 }}
                value={passageInput}
                onChange={(e) => setPassageInput(e.target.value)}
                autoFocus
                autoComplete="off"
              />
              <button type="submit" className="btn btn-sm btn-primary" disabled={busy}>
                Trocar
              </button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditingPassage(false)}>
                Cancelar
              </button>
            </form>
          ) : (
            <span className="label label-accent" style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {passage}
              <button type="button" className="msg-link" onClick={() => setEditingPassage(true)}>
                trocar
              </button>
            </span>
          )}
          <label className="visually-hidden" htmlFor="msg-title">
            Título
          </label>
          <input
            id="msg-title"
            className="msg-title"
            value={title}
            maxLength={200}
            onChange={(e) => {
              setTitle(e.target.value);
              dirty();
            }}
            placeholder="Título da mensagem"
          />
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        {blocks.map((b, i) => (
          <section key={b.id} className="msg-block" aria-label={b.title}>
            <div className="msg-block-head">
              <div className="msg-move">
                <button type="button" onClick={() => moveBlock(i, -1)} disabled={i === 0} aria-label={`Subir o bloco ${b.title}`}>
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveBlock(i, 1)}
                  disabled={i === blocks.length - 1}
                  aria-label={`Descer o bloco ${b.title}`}
                >
                  ↓
                </button>
              </div>
              <input
                className="msg-block-title"
                value={b.title}
                maxLength={80}
                aria-label="Nome do bloco"
                onChange={(e) => patchBlock(b.id, { title: e.target.value })}
              />
              <button type="button" className="msg-link" onClick={() => removeBlock(b)}>
                remover
              </button>
            </div>
            {b.kind === "leitura" && (
              <div className="msg-passage">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <span className="origin">Da sua base · {passage}</span>
                  <Link href={readerHref} className="caption">
                    Abrir no leitor
                  </Link>
                </div>
                <p>
                  {verses.map((v) => (
                    <span key={v.n}>
                      <sup>{v.n}</sup> {v.text}{" "}
                    </span>
                  ))}
                </p>
                <span className="caption">Bíblia Livre (CC BY 4.0)</span>
              </div>
            )}
            <textarea
              className="textarea msg-text"
              value={b.text}
              aria-label={`Texto do bloco ${b.title}`}
              placeholder={hintFor(template, b.kind)}
              onChange={(e) => patchBlock(b.id, { text: e.target.value })}
            />
          </section>
        ))}

        {blocks.length < MAX_BLOCKS && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span className="caption">Adicionar bloco:</span>
            {missing.map((t) => (
              <button key={t.kind} type="button" className="chip chip-dashed" onClick={() => addBlock(t.kind, t.title)}>
                + {t.title}
              </button>
            ))}
            <button type="button" className="chip chip-dashed" onClick={() => addBlock("livre", "Novo bloco")}>
              + Bloco livre
            </button>
          </div>
        )}
      </div>

      <aside className="msg-aside">
        <div className="msg-actions">
          <button
            type="button"
            className="btn btn-sm"
            disabled={busy}
            onClick={() => run(async () => keepVersion(message.id, content), () => setStatus("saved"))}
            title="Guarda uma cópia do esboço como está agora"
          >
            Guardar versão {message.version}
          </button>
          {message.taught_on ? (
            <button type="button" className="btn btn-sm" disabled={busy} onClick={() => run(() => setTaught(message.id, false))}>
              Desmarcar “ensinada”
            </button>
          ) : (
            <button type="button" className="btn btn-sm" disabled={busy} onClick={() => run(() => setTaught(message.id, true))}>
              Marcar como ensinada
            </button>
          )}
        </div>
        {taughtLabel && <span className="caption">Ensinada em {taughtLabel}.</span>}

        <section className="msg-panel" aria-labelledby="msg-checks">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
            <span id="msg-checks" className="label">
              Conferência
            </span>
            <span className="caption">{ready ? "Pronta" : `${checklist.done} de ${checklist.total} conferidos`}</span>
          </div>
          {checklist.auto.map((a) => (
            <div key={a.key} className={`msg-check ${a.status}`}>
              <span className="msg-check-mark" aria-hidden="true">
                {a.status === "ok" ? "✓" : a.status === "warn" ? "!" : "✕"}
              </span>
              <span>
                <span className="visually-hidden">{a.status === "ok" ? "Certo: " : a.status === "warn" ? "Atenção: " : "Pendente: "}</span>
                {a.label}
                <span className="msg-check-detail">{a.detail}</span>
              </span>
            </div>
          ))}
          <span className="caption" style={{ marginTop: 4 }}>
            O texto sustenta cada ponto? Marque ao conferir.
          </span>
          {checklist.manual.map((c) => (
            <label key={c.key} className="msg-check manual">
              <input type="checkbox" checked={c.done} onChange={() => toggleCheck(c.key)} />
              <span>
                {c.label}
                {c.detail && <span className="msg-check-detail">{c.detail}</span>}
              </span>
            </label>
          ))}
          {!checklist.manual.some((c) => c.key.startsWith("ponto:")) && blocks.some((b) => b.kind === "pontos") && (
            <span className="caption">Escreva os pontos numerados (1., 2., 3.) para conferir um por um.</span>
          )}
          <div className="msg-actions" style={{ marginTop: 4 }}>
            {ready ? (
              <button
                type="button"
                className="btn btn-sm"
                disabled={busy}
                onClick={() => run(() => setReady(message.id, false), () => setReadyState(false))}
              >
                Voltar para “em preparo”
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={busy || !checklist.complete}
                onClick={markReady}
                title={checklist.complete ? undefined : "Resolva os itens com ✕ e marque todos os itens da conferência"}
              >
                Marcar como pronta
              </button>
            )}
            <Link href={`/celula/${message.id}/imprimir`} className="btn btn-sm">
              Imprimir ou PDF
            </Link>
          </div>
        </section>

        <div className="field">
          <span id="msg-tpl">Modelo</span>
          <div role="radiogroup" aria-labelledby="msg-tpl" className="segmented">
            {TEMPLATES.map((t) => (
              <button key={t.id} type="button" role="radio" aria-checked={template === t.id} onClick={() => changeTemplate(t.id)}>
                {t.name}
              </button>
            ))}
          </div>
          <span className="caption">{templateOf(template).summary} Trocar o modelo muda as orientações, não o seu texto.</span>
        </div>

        <label className="field">
          <span>Tempo disponível (min)</span>
          <input
            className="input"
            type="number"
            min={5}
            max={90}
            value={duration}
            style={{ maxWidth: 110 }}
            onChange={(e) => {
              setDuration(Number(e.target.value));
              dirty();
            }}
          />
          <span className="caption" style={minutes > duration ? { color: "var(--accent)" } : undefined}>
            O esboço tem {words} palavras: cerca de {minutes} min de fala, a {WORDS_PER_MINUTE} palavras por minuto e contando a
            leitura do texto. A discussão não entra na conta.
          </span>
        </label>

        <label className="field">
          <span>Perfil do grupo</span>
          <input
            className="input"
            value={audience}
            maxLength={300}
            onChange={(e) => {
              setAudience(e.target.value);
              dirty();
            }}
          />
        </label>

        <label className="field">
          <span>Tema</span>
          <input
            className="input"
            value={topic}
            maxLength={200}
            onChange={(e) => {
              setTopic(e.target.value);
              dirty();
            }}
          />
        </label>

        <section className="msg-panel" aria-labelledby="msg-notes">
          <span id="msg-notes" className="label">
            Suas notas desta passagem
          </span>
          {notes.length === 0 ? (
            <p className="caption" style={{ margin: 0 }}>
              Nenhuma nota ainda. Você pode anotar <Link href={readerHref}>no leitor</Link>.
            </p>
          ) : (
            notes.map((n) => (
              <div key={n.id} className="msg-note">
                <span className="caption">{n.ref}</span>
                <p>{n.body}</p>
              </div>
            ))
          )}
        </section>

        <section className="msg-panel" aria-labelledby="msg-versions">
          <span id="msg-versions" className="label">
            Versões guardadas
          </span>
          {versions.length === 0 ? (
            <p className="caption" style={{ margin: 0 }}>
              Nenhuma. O esboço é salvo sozinho; guarde uma versão antes de uma mudança grande para poder voltar a ela.
            </p>
          ) : (
            versions.map((v) => (
              <Link key={v.version} href={`/celula/${message.id}?versao=${v.version}`} className="msg-version">
                <span>Versão {v.version}</span>
                <span className="muted">{v.label}</span>
              </Link>
            ))
          )}
        </section>

        <div>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            style={{ paddingLeft: 0 }}
            disabled={busy}
            onClick={() => {
              if (!window.confirm("Apagar esta mensagem e todas as versões guardadas?")) return;
              setError(null);
              startAction(async () => {
                const r = await deleteMessage(message.id);
                if (!r.ok) return setError(r.error);
                latest.current.pending = false;
                router.push("/celula");
              });
            }}
          >
            Apagar mensagem
          </button>
        </div>
      </aside>
    </div>
  );
}
