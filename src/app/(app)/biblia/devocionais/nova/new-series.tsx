"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createDevotionalSeries, type DevotionalFormState } from "@/lib/actions/devotionals";
import { DEVOTIONAL_TEMPLATES, MAX_DAYS, WEEKDAY_NAMES, WEEKDAYS, type DevotionalTemplateId } from "@/lib/devotional-plan";

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
// Monday first, as in the design.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function NewDevotionalSeries() {
  const [state, action, pending] = useActionState<DevotionalFormState, FormData>(createDevotionalSeries, {});
  const [template, setTemplate] = useState<DevotionalTemplateId>("completo");
  const [daily, setDaily] = useState(true);
  const [chosen, setChosen] = useState<number[]>([1, 2, 3, 4, 5]);
  const [days, setDays] = useState("");
  const count = days.split("\n").filter((l) => l.trim()).length;
  const weekdays = daily ? EVERY_DAY : chosen;

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <input type="hidden" name="template" value={template} />
      {weekdays.map((w) => (
        <input key={w} type="hidden" name="weekday" value={w} />
      ))}

      <label className="field">
        <span>Título da série</span>
        <input className="input" name="title" required maxLength={200} placeholder="Ex.: Salmos de confiança" />
      </label>

      <label className="field">
        <span>
          Livro ou tema <span className="muted">(opcional)</span>
        </span>
        <input className="input" name="about" maxLength={200} placeholder="Ex.: Salmos" />
      </label>

      <label className="field">
        <span>
          Descrição <span className="muted">(opcional)</span>
        </span>
        <textarea className="textarea" name="description" maxLength={1000} rows={2} style={{ minHeight: 70 }} />
      </label>

      <div className="field">
        <span id="dev-rhythm">Ritmo</span>
        <div role="radiogroup" aria-labelledby="dev-rhythm" className="segmented">
          <button type="button" role="radio" aria-checked={daily} onClick={() => setDaily(true)}>
            Diário
          </button>
          <button type="button" role="radio" aria-checked={!daily} onClick={() => setDaily(false)}>
            Dias escolhidos
          </button>
        </div>
        {!daily && (
          <div role="group" aria-label="Dias da semana" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {WEEK_ORDER.map((w) => {
              const on = chosen.includes(w);
              return (
                <button
                  key={w}
                  type="button"
                  className="chip"
                  aria-pressed={on}
                  aria-label={WEEKDAY_NAMES[w]}
                  title={WEEKDAY_NAMES[w]}
                  style={{ width: 38, justifyContent: "center", padding: 0 }}
                  onClick={() => setChosen((c) => (on ? c.filter((x) => x !== w) : [...c, w]))}
                >
                  {WEEKDAYS[w]}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="field">
        <span id="dev-tpl">Modelo do devocional</span>
        <div role="radiogroup" aria-labelledby="dev-tpl" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {DEVOTIONAL_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={template === t.id}
              className="dev-option"
              onClick={() => setTemplate(t.id)}
            >
              <b>{t.name}</b>
              <span>{t.summary}</span>
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span>Dias, um por linha</span>
        <textarea
          className="textarea"
          name="days"
          required
          rows={8}
          value={days}
          onChange={(e) => setDays(e.target.value)}
          style={{ fontFamily: "inherit", fontSize: 15 }}
          placeholder={"Sl 3 | Tu és o meu escudo\nSl 4\nSl 23:1-4 | O pastor que não falta"}
        />
        <span className="caption">
          Passagem e, depois de uma barra (|), o título do dia. Sem título, o dia leva o nome da passagem. Dá para acrescentar,
          reordenar e renomear depois.{" "}
          {count > 0 && (
            <b style={{ fontWeight: 600 }}>
              {count} {count === 1 ? "dia" : "dias"}
              {count > MAX_DAYS ? ` (o máximo é ${MAX_DAYS})` : ""}.
            </b>
          )}
        </span>
      </label>

      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" className="btn btn-primary" disabled={pending || weekdays.length === 0}>
          {pending ? "Criando…" : "Criar série"}
        </button>
        <Link href="/biblia/devocionais" className="btn btn-ghost">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
