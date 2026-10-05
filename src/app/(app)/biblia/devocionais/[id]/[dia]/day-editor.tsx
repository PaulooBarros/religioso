"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { saveDevotional } from "@/lib/actions/devotionals";
import type { DevotionalBlock } from "@/lib/devotional-plan";

/** Writes one day of a series. The passage text (children) comes from the base. */
export function DayEditor({
  dayId,
  title: initialTitle,
  passage: initialPassage,
  blocks: initialBlocks,
  hints,
  children,
}: {
  dayId: string;
  title: string;
  passage: string;
  blocks: DevotionalBlock[];
  hints: Record<string, string>;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [passage, setPassage] = useState(initialPassage);
  const [blocks, setBlocks] = useState(initialBlocks);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const touch = () => {
    setDirty(true);
    setSaved(false);
  };

  function save() {
    setError(null);
    start(async () => {
      const r = await saveDevotional(dayId, { title, passage, blocks });
      if (!r.ok) return setError(r.error);
      setDirty(false);
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form
      style={{ display: "flex", flexDirection: "column", gap: 22 }}
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <label className="visually-hidden" htmlFor="dev-title">
        Título do dia
      </label>
      <input
        id="dev-title"
        className="msg-title"
        value={title}
        maxLength={200}
        required
        placeholder="Título do dia"
        onChange={(e) => {
          setTitle(e.target.value);
          touch();
        }}
      />

      <label className="field" style={{ maxWidth: 260 }}>
        <span>Passagem</span>
        <input
          className="input"
          value={passage}
          required
          autoComplete="off"
          onChange={(e) => {
            setPassage(e.target.value);
            touch();
          }}
        />
      </label>

      {children}

      {blocks.map((b) => (
        <label key={b.id} className="field">
          <span className="label">{b.title}</span>
          <textarea
            className="textarea msg-text"
            value={b.text}
            placeholder={hints[b.title] ?? ""}
            onChange={(e) => {
              setBlocks((bs) => bs.map((x) => (x.id === b.id ? { ...x, text: e.target.value } : x)));
              touch();
            }}
          />
        </label>
      ))}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="inline-form">
        <button type="submit" className="btn btn-primary" disabled={pending || !dirty}>
          {pending ? "Salvando…" : "Salvar"}
        </button>
        <span className="caption" role="status">
          {dirty ? "Alterações não salvas." : saved ? "Salvo." : ""}
        </span>
      </div>
    </form>
  );
}
