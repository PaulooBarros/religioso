"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveStudyItem, type ItemFormState } from "@/lib/actions/study";
import { LEVELS, MAX_OPTIONS, type ItemKind, type StudyItem, type Subtheme, type Theme } from "@/lib/study";

const LETTERS = "ABCDEF";

export function ItemForm({
  themes,
  subthemes,
  item,
  presetRefs,
}: {
  themes: Theme[];
  subthemes: Subtheme[];
  item?: StudyItem;
  presetRefs?: string;
}) {
  const [themeId, setThemeId] = useState(item?.theme_id ?? "");
  const [subthemeId, setSubthemeId] = useState(item?.subtheme_id ?? "");
  const themeSubs = subthemes.filter((s) => s.theme_id === themeId);
  const [state, action, pending] = useActionState<ItemFormState, FormData>(saveStudyItem, {});
  const [kind, setKind] = useState<ItemKind>(item?.kind ?? "card");
  const [options, setOptions] = useState<string[]>(item?.options ?? ["", "", "", ""]);
  const [correct, setCorrect] = useState<number>(item?.correct_option ?? 0);
  const [level, setLevel] = useState<number>(item?.level ?? 1);

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {item && <input type="hidden" name="id" value={item.id} />}
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="level" value={level} />

      <div className="field">
        <span id="kind-label">Tipo</span>
        <div role="radiogroup" aria-labelledby="kind-label" className="segmented">
          {(["card", "mcq"] as const).map((k) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}>
              {k === "card" ? "Card (pergunta e resposta)" : "Múltipla escolha"}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span>Pergunta</span>
        <textarea
          className="textarea"
          name="prompt"
          defaultValue={item?.prompt}
          rows={3}
          required
          placeholder="Ex.: O que significa justificação?"
          style={{ minHeight: 90, fontSize: 18 }}
        />
      </label>

      {kind === "card" ? (
        <label className="field">
          <span>Resposta</span>
          <textarea className="textarea" name="answer" defaultValue={item?.answer ?? ""} rows={4} required />
        </label>
      ) : (
        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ marginBottom: 6 }}>
            Alternativas <span className="muted">(marque a correta)</span>
          </legend>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {options.map((o, i) => (
              <div key={i} className={`option-row${correct === i ? " is-correct" : ""}`}>
                <label className="option-radio">
                  <input type="radio" name="correct" value={i} checked={correct === i} onChange={() => setCorrect(i)} />
                  <span aria-hidden="true">{LETTERS[i]}</span>
                  <span className="visually-hidden">Alternativa {LETTERS[i]} é a correta</span>
                </label>
                <input
                  className="input"
                  name="option"
                  value={o}
                  onChange={(e) => setOptions((os) => os.map((x, j) => (j === i ? e.target.value : x)))}
                  aria-label={`Alternativa ${LETTERS[i]}`}
                  maxLength={500}
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    aria-label={`Remover alternativa ${LETTERS[i]}`}
                    onClick={() => {
                      setOptions((os) => os.filter((_, j) => j !== i));
                      setCorrect((c) => (c === i ? 0 : c > i ? c - 1 : c));
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < MAX_OPTIONS && (
            <div>
              <button type="button" className="btn btn-sm btn-text" style={{ paddingLeft: 0 }} onClick={() => setOptions((os) => [...os, ""])}>
                + Alternativa
              </button>
            </div>
          )}
        </fieldset>
      )}

      <label className="field">
        <span>
          Explicação <span className="muted">(opcional, aparece depois de responder)</span>
        </span>
        <textarea className="textarea" name="explanation" defaultValue={item?.explanation ?? ""} rows={3} style={{ minHeight: 80 }} />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
        <label className="field">
          <span>Tema</span>
          <span className="select-wrap" style={{ width: "100%" }}>
            <select
              name="theme_id"
              value={themeId}
              onChange={(e) => {
                setThemeId(e.target.value);
                setSubthemeId("");
              }}
              style={{ width: "100%", height: 44 }}
            >
              <option value="">Sem tema</option>
              {themes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </span>
        </label>
        <label className="field">
          <span>Subtema</span>
          <span className="select-wrap" style={{ width: "100%" }}>
            <select
              name="subtheme_id"
              value={subthemeId}
              onChange={(e) => setSubthemeId(e.target.value)}
              disabled={!themeId || themeSubs.length === 0}
              style={{ width: "100%", height: 44 }}
            >
              <option value="">{!themeId ? "Escolha um tema" : themeSubs.length ? "Sem subtema" : "Tema sem subtemas"}</option>
              {themeSubs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </span>
        </label>
        <div className="field">
          <span id="level-label">Nível</span>
          <div role="radiogroup" aria-labelledby="level-label" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {LEVELS.map((l) => (
              <button key={l.value} type="button" role="radio" aria-checked={level === l.value} className={`chip${level === l.value ? " on" : ""}`} onClick={() => setLevel(l.value)}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <label className="field">
        <span>
          Referências bíblicas <span className="muted">(opcional, separe com ponto e vírgula)</span>
        </span>
        <input
          className="input"
          name="bible_refs"
          defaultValue={item?.bible_refs.join("; ") ?? presetRefs ?? ""}
          placeholder="Rm 3:24; Ef 2:8-9"
        />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
        <label className="field">
          <span>Fonte</span>
          <input
            className="input"
            name="source_title"
            defaultValue={item?.source_title ?? ""}
            placeholder="Ex.: Confissão de 1689, cap. 11"
            maxLength={300}
          />
        </label>
        <label className="field">
          <span>
            Link da fonte <span className="muted">(opcional)</span>
          </span>
          <input className="input" name="source_url" type="url" defaultValue={item?.source_url ?? ""} placeholder="https://" />
        </label>
      </div>

      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="submit" className="btn btn-lg btn-primary" disabled={pending}>
          {pending ? "Salvando…" : "Salvar"}
        </button>
        {!item && (
          <button type="submit" name="another" value="1" className="btn btn-lg" disabled={pending}>
            Salvar e criar outro
          </button>
        )}
        <Link href="/estudar" className="btn btn-lg btn-ghost">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
