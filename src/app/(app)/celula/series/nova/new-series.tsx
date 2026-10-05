"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createSeries, type SeriesFormState } from "@/lib/actions/series";
import { TEMPLATES, type TemplateId } from "@/lib/message-templates";
import { MAX_WEEKS } from "@/lib/passage";

const DURATIONS = [10, 15, 20, 30];

export function NewSeries() {
  const [state, action, pending] = useActionState<SeriesFormState, FormData>(createSeries, {});
  const [template, setTemplate] = useState<TemplateId>("expositiva");
  const [duration, setDuration] = useState(15);
  const [weeks, setWeeks] = useState("");
  const count = weeks.split("\n").filter((l) => l.trim()).length;

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <input type="hidden" name="template" value={template} />
      <input type="hidden" name="duration" value={duration} />

      <label className="field">
        <span>Título da série</span>
        <input className="input" name="title" required maxLength={200} placeholder="Ex.: Romanos 8" />
      </label>

      <label className="field">
        <span>
          Livro ou tema <span className="muted">(opcional)</span>
        </span>
        <input className="input" name="about" maxLength={200} placeholder="Ex.: a segurança de quem está em Cristo" />
      </label>

      <label className="field">
        <span>Semanas, uma por linha</span>
        <textarea
          className="textarea"
          name="weeks"
          required
          rows={7}
          value={weeks}
          onChange={(e) => setWeeks(e.target.value)}
          style={{ fontFamily: "inherit", fontSize: 15 }}
          placeholder={"Rm 8:1-11 | Nenhuma condenação\nRm 8:12-17 | Filhos pelo Espírito\nRm 8:18-30"}
        />
        <span className="caption">
          Passagem e, depois de uma barra (|), o título da semana. Sem título, a semana leva o nome da passagem. Dá para
          acrescentar, reordenar e renomear depois.{" "}
          {count > 0 && (
            <b style={{ fontWeight: 600 }}>
              {count} {count === 1 ? "semana" : "semanas"}
              {count > MAX_WEEKS ? ` (o máximo é ${MAX_WEEKS})` : count < 4 || count > 6 ? " (o comum é de 4 a 6)" : ""}.
            </b>
          )}
        </span>
      </label>

      <div className="field">
        <span id="s-tpl">Modelo das mensagens</span>
        <div role="radiogroup" aria-labelledby="s-tpl" className="segmented">
          {TEMPLATES.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={template === t.id} onClick={() => setTemplate(t.id)}>
              {t.name}
            </button>
          ))}
        </div>
        <span className="caption">{TEMPLATES.find((t) => t.id === template)!.summary} Cada mensagem pode trocar de modelo depois.</span>
      </div>

      <div className="field">
        <span id="s-dur">Tempo de cada encontro</span>
        <div role="radiogroup" aria-labelledby="s-dur" className="segmented">
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

      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Criando…" : "Criar série"}
        </button>
        <Link href="/celula" className="btn btn-ghost">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
