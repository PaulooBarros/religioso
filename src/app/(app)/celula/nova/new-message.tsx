"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createMessage, type MessageFormState } from "@/lib/actions/messages";
import { TEMPLATES, type TemplateId } from "@/lib/message-templates";

const DURATIONS = [10, 15, 20, 30];

export function NewMessage({ presetPassage }: { presetPassage?: string }) {
  const [state, action, pending] = useActionState<MessageFormState, FormData>(createMessage, {});
  const [template, setTemplate] = useState<TemplateId>("expositiva");
  const [duration, setDuration] = useState(15);
  const current = TEMPLATES.find((t) => t.id === template)!;

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <input type="hidden" name="template" value={template} />
      <input type="hidden" name="duration" value={duration} />

      <label className="field">
        <span>Passagem</span>
        <input
          className="input"
          name="passage"
          defaultValue={presetPassage}
          required
          autoComplete="off"
          placeholder="Ex.: Rm 8:31-39"
        />
        <span className="caption">Um capítulo ou um trecho dele. O texto vem da Bíblia Livre, da sua base.</span>
      </label>

      <label className="field">
        <span>Título</span>
        <input className="input" name="title" required maxLength={200} placeholder="Ex.: Nada nos separará" />
      </label>

      <div className="field">
        <span id="tpl-label">Modelo de estrutura</span>
        <div role="radiogroup" aria-labelledby="tpl-label" className="segmented">
          {TEMPLATES.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={template === t.id} onClick={() => setTemplate(t.id)}>
              {t.name}
            </button>
          ))}
        </div>
        <span className="caption">
          {current.summary} Blocos: {current.blocks.map((b) => b.title).join(", ")}.
        </span>
      </div>

      <div className="field">
        <span id="dur-label">Tempo disponível</span>
        <div role="radiogroup" aria-labelledby="dur-label" className="segmented">
          {DURATIONS.map((d) => (
            <button key={d} type="button" role="radio" aria-checked={duration === d} onClick={() => setDuration(d)}>
              {d} min
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span>
          Perfil do grupo <span className="muted">(opcional)</span>
        </span>
        <input className="input" name="audience" maxLength={300} placeholder="Ex.: casais jovens, alguns novos na fé" />
      </label>

      <label className="field">
        <span>
          Tema <span className="muted">(opcional)</span>
        </span>
        <input className="input" name="topic" maxLength={200} placeholder="Ex.: segurança em Cristo" />
      </label>

      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Criando…" : "Criar e abrir o editor"}
        </button>
        <Link href="/celula" className="btn btn-ghost">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
