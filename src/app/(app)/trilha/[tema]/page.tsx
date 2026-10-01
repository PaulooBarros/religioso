import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DomainBar, progressLabel, ThemeList } from "../theme-list";
import { AddSubtheme, Readings, SubthemeActions, ThemeNotes } from "./trail-client";
import { currentProfileId } from "@/lib/session";
import { itemStatus } from "@/lib/srs";
import { getThemePage, progressOf } from "@/lib/trail";

type Params = { tema: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { tema } = await params;
  return { title: `Trilha · ${tema}` };
}

const STATUS = {
  nova: { icon: "○", label: "Nova" },
  estudo: { icon: "◐", label: "Em estudo" },
  dominada: { icon: "●", label: "Dominada" },
} as const;

export default async function ThemePage({ params, searchParams }: PageProps<"/trilha/[tema]">) {
  const { tema } = await params;
  const { sub } = await searchParams;
  const profileId = await currentProfileId();
  if (!profileId) notFound();

  const page = await getThemePage(profileId, tema);
  if (!page) notFound();
  const { trail, theme, subthemes, items, readings, notes, drafts } = page;
  const index = trail.findIndex((t) => t.id === theme.id) + 1;

  const orphans = items.filter((i) => !i.subtheme_id);
  const selectedId = typeof sub === "string" ? sub : null;
  const selected = selectedId === "outros" ? null : (subthemes.find((s) => s.id === selectedId) ?? null);
  const showOrphans = selectedId === "outros";
  const selectedItems = selected ? items.filter((i) => i.subtheme_id === selected.id) : showOrphans ? orphans : [];
  const p = theme.progress;

  const studyHref = (subId?: string) => `/revisao?modo=tema&tema=${theme.id}${subId ? `&sub=${subId}` : ""}`;

  return (
    <div className="trail has-theme">
      <ThemeList themes={trail} current={theme.id} />
      <main className="trail-main">
        <div className="trail-body">
          <Link href="/trilha" className="caption mobile-only" style={{ textDecoration: "none" }}>
            ← Temas
          </Link>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span className="caption">Tema {index}</span>
            <h1 className="h1">{theme.name}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 14, maxWidth: 420 }}>
              <div style={{ flex: 1 }}>
                <DomainBar percent={p.percent} />
              </div>
              <span style={{ fontSize: 13.5, whiteSpace: "nowrap" }}>
                {p.started ? `${p.percent}% de domínio` : progressLabel(p)}
              </span>
            </div>
            <span className="muted" style={{ fontSize: 14 }}>
              {p.total} {p.total === 1 ? "questão" : "questões"} · {p.mastered} dominadas · {p.dueThisWeek} vencem esta semana
              {drafts > 0 && (
                <>
                  {" · "}
                  <Link href={`/estudar?estado=rascunho&tema=${theme.id}`}>{drafts} em rascunho</Link>
                </>
              )}
            </span>
          </div>

          <div className="inline-form">
            {p.total > 0 ? (
              <Link href={studyHref()} className="btn btn-primary">
                Estudar este tema
              </Link>
            ) : (
              <Link href="/estudar/novo" className="btn btn-primary">
                Criar a primeira questão
              </Link>
            )}
            <span className="btn" aria-disabled="true" title="Chega na próxima task" style={{ color: "var(--faint)", cursor: "default" }}>
              Simulado do tema
            </span>
          </div>

          <section style={{ display: "flex", flexDirection: "column" }} aria-labelledby="subs-title">
            <span id="subs-title" className="label" style={{ marginBottom: 6 }}>
              Subtemas
            </span>
            {subthemes.map((s) => (
              <Link
                key={s.id}
                href={selected?.id === s.id ? `/trilha/${theme.id}` : `/trilha/${theme.id}?sub=${s.id}`}
                className="trail-sub"
                aria-current={selected?.id === s.id ? "page" : undefined}
                scroll={false}
              >
                <span>{s.name}</span>
                <DomainBar percent={s.progress.percent} />
                <span>
                  {s.progress.total} {s.progress.total === 1 ? "questão" : "questões"}
                </span>
              </Link>
            ))}
            {orphans.length > 0 && (
              <Link
                href={showOrphans ? `/trilha/${theme.id}` : `/trilha/${theme.id}?sub=outros`}
                className="trail-sub"
                aria-current={showOrphans ? "page" : undefined}
                scroll={false}
              >
                <span className="muted">Sem subtema</span>
                <DomainBar percent={progressOf(orphans).percent} />
                <span>
                  {orphans.length} {orphans.length === 1 ? "questão" : "questões"}
                </span>
              </Link>
            )}
            {subthemes.length === 0 && orphans.length === 0 && (
              <p className="caption" style={{ margin: "4px 0 8px" }}>
                Nenhum subtema ainda.
              </p>
            )}
            <div style={{ marginTop: 8 }}>
              <AddSubtheme themeId={theme.id} />
            </div>
          </section>

          {(selected || showOrphans) && (
            <section className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }} aria-labelledby="sub-title">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
                <h2 id="sub-title" className="serif" style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>
                  {selected ? selected.name : "Sem subtema"}
                </h2>
                {selectedItems.length > 0 && (
                  <Link href={studyHref(selected?.id)} className="btn btn-sm btn-primary">
                    Estudar este subtema
                  </Link>
                )}
              </div>
              {selectedItems.length === 0 ? (
                <p className="caption" style={{ margin: 0 }}>
                  Nenhuma questão aprovada neste subtema.
                </p>
              ) : (
                <div>
                  {selectedItems.map((i) => {
                    const st = STATUS[itemStatus(i.review)];
                    return (
                      <Link key={i.id} href={`/estudar/${i.id}`} className="trail-item">
                        <span className={`status-icon ${itemStatus(i.review)}`} title={st.label} aria-label={st.label}>
                          {st.icon}
                        </span>
                        <span>{i.prompt}</span>
                      </Link>
                    );
                  })}
                  <p className="caption" style={{ margin: "10px 0 0" }}>
                    ○ Nova · ◐ Em estudo · ● Dominada (intervalo de 21 dias ou mais)
                  </p>
                </div>
              )}
              {selected && (
                <>
                  <Readings themeId={theme.id} subthemeId={selected.id} readings={readings.filter((r) => r.subtheme_id === selected.id)} />
                  <SubthemeActions id={selected.id} themeId={theme.id} name={selected.name} itemCount={selectedItems.length} />
                </>
              )}
            </section>
          )}

          <div className="trail-columns">
            <Readings themeId={theme.id} subthemeId={null} readings={readings.filter((r) => !r.subtheme_id)} />
            <ThemeNotes themeId={theme.id} subthemeId={selected?.id ?? null} label={selected ? `${theme.name} · ${selected.name}` : theme.name} notes={selected ? notes.filter((n) => n.subtheme_id === selected.id) : notes} />
          </div>
        </div>
      </main>
    </div>
  );
}
