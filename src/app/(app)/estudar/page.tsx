import Link from "next/link";
import { FromYourBase, Icon } from "@/components/icons";
import { bookById } from "@/lib/bible/books";
import { chapterHref, parseReference } from "@/lib/bible/reference";
import { getStudyItems, getThemes } from "@/lib/queries";
import { currentProfileId } from "@/lib/session";
import { approvalBlocker, KIND_LABEL, levelLabel, type StudyItem, type Theme } from "@/lib/study";
import { DraftActions } from "./draft-actions";

export const metadata = { title: "Estudar" };

const LETTERS = "ABCDEF";

function RefLinks({ refs }: { refs: string[] }) {
  if (!refs.length) return null;
  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 8, fontSize: 12.5 }}>
      {refs.map((r) => {
        const ref = parseReference(r);
        const book = ref ? bookById(ref.book.id) : undefined;
        return book && ref ? (
          <Link key={r} href={chapterHref(book, ref.chapter, ref.verse)}>
            {r}
          </Link>
        ) : (
          <span key={r}>{r}</span>
        );
      })}
    </span>
  );
}

function SourceChip({ item }: { item: StudyItem }) {
  if (!item.source_title && !item.source_url) return <span className="source-chip unverified">sem fonte</span>;
  const label = item.source_title ?? item.source_url;
  const state = item.source_ok === true ? " · verificada" : item.source_ok === false ? " · sem fonte verificada" : "";
  const icon =
    item.source_ok === true ? <Icon name="check" size={12} stroke={2.2} /> : item.source_ok === false ? <span aria-hidden="true">○</span> : null;
  const className = `source-chip${item.source_ok === false ? " unverified" : ""}`;
  return item.source_url ? (
    <a className={className} href={item.source_url} target="_blank" rel="noopener noreferrer">
      {icon}
      {label}
      <span className="muted">{state}</span>
    </a>
  ) : (
    <span className={className}>{label}</span>
  );
}

function ItemCard({ item, themes }: { item: StudyItem; themes: Theme[] }) {
  const theme = themes.find((t) => t.id === item.theme_id);
  const isDraft = item.status === "draft";
  return (
    <li className={`item-card${isDraft ? " is-draft" : ""}`}>
      {isDraft && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span className="draft-badge">Rascunho</span>
          <span className="muted" style={{ fontSize: 12 }}>
            {item.origin === "ia" ? "gerado pela IA · aguarda aprovação" : "aguarda aprovação"}
          </span>
        </div>
      )}
      <div className="item-meta">
        <span>{KIND_LABEL[item.kind]}</span>
        <span>·</span>
        <span>{theme?.name ?? "Sem tema"}</span>
        {item.subtopic && (
          <>
            <span>·</span>
            <span>{item.subtopic}</span>
          </>
        )}
        <span>·</span>
        <span>{levelLabel(item.level)}</span>
      </div>
      <p className="item-prompt">{item.prompt}</p>
      {item.kind === "card" ? (
        <p className="item-answer">{item.answer}</p>
      ) : (
        <ol className="item-answer" style={{ listStyle: "none", paddingLeft: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          {item.options?.map((o, i) => (
            <li key={i} style={i === item.correct_option ? { color: "var(--accent)", fontWeight: 500 } : undefined}>
              <span className="muted" style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, marginRight: 8 }}>
                {LETTERS[i]}
              </span>
              {o}
              {i === item.correct_option && (
                <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, marginLeft: 8 }}>
                  <Icon name="check" size={12} stroke={2.4} /> correta
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
      {item.explanation && (
        <details className="item-explanation">
          <summary>Explicação</summary>
          <p>{item.explanation}</p>
        </details>
      )}
      <div className="item-foot">
        {item.origin === "ia" ? (
          <span className="origin">
            <span className="origin-ai-mark">IA</span>
            Fala da IA (com fontes)
          </span>
        ) : (
          <FromYourBase />
        )}
        <SourceChip item={item} />
        {item.machine_translated && <span className="source-chip unverified">Tradução automática do original</span>}
        <RefLinks refs={item.bible_refs} />
        {!isDraft && (
          <>
            <span style={{ flex: 1 }} />
            <Link href={`/estudar/${item.id}`} style={{ fontSize: 13 }}>
              Editar
            </Link>
          </>
        )}
      </div>
      {item.review_note && (
        <p className="item-note">
          <b>Observação:</b> {item.review_note}
        </p>
      )}
      {isDraft && <DraftActions id={item.id} blocker={approvalBlocker(item)} canRecheck={Boolean(item.source_url)} />}
    </li>
  );
}

export default async function StudyPage({ searchParams }: PageProps<"/estudar">) {
  const { tema, tipo, estado } = await searchParams;
  const profileId = await currentProfileId();
  const [themes, items] = await Promise.all([getThemes(), profileId ? getStudyItems(profileId) : Promise.resolve([])]);

  const drafts = items.filter((i) => i.status === "draft").length;
  // Drafts first while there are any: they need a decision.
  const stateFilter = estado === "rascunho" || estado === "aprovado" ? estado : drafts ? "rascunho" : "aprovado";
  const themeFilter = typeof tema === "string" ? tema : null;
  const kindFilter = tipo === "card" || tipo === "mcq" ? tipo : null;
  const inState = items.filter((i) => (stateFilter === "rascunho" ? i.status === "draft" : i.status === "approved"));
  const visible = inState.filter(
    (i) =>
      (!themeFilter || (themeFilter === "sem" ? !i.theme_id : i.theme_id === themeFilter)) &&
      (!kindFilter || i.kind === kindFilter),
  );

  const href = (t: string | null, k: string | null, s: string = stateFilter) => {
    const q = new URLSearchParams();
    q.set("estado", s);
    if (t) q.set("tema", t);
    if (k) q.set("tipo", k);
    return `/estudar?${q.toString()}`;
  };

  const usedThemes = themes.filter((t) => inState.some((i) => i.theme_id === t.id));
  const approved = items.length - drafts;

  return (
    <main className="page">
      <div className="page-narrow">
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="label">Estudar</span>
            <h1 className="h1">Cards e questões</h1>
          </div>
          <Link href="/trilha" className="btn">
            Trilha
          </Link>
          {profileId && (
            <Link href="/estudar/novo" className="btn btn-primary">
              <Icon name="mais_sinal" size={15} stroke={1.8} />
              Novo item
            </Link>
          )}
        </div>

        {items.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <nav className="tabs" style={{ padding: 0 }} aria-label="Situação">
              <Link href={href(null, null, "rascunho")} className="tab" aria-current={stateFilter === "rascunho" ? "page" : undefined}>
                Rascunhos · {drafts}
              </Link>
              <Link href={href(null, null, "aprovado")} className="tab" aria-current={stateFilter === "aprovado" ? "page" : undefined}>
                Aprovados · {approved}
              </Link>
            </nav>
            {stateFilter === "rascunho" && drafts > 0 && (
              <p className="lead" style={{ fontSize: 13.5 }}>
                Rascunhos não entram na revisão. Leia cada um, confira a fonte e aprove, edite ou descarte. Itens gerados
                pela IA só podem ser aprovados com a fonte verificada.
              </p>
            )}
            <nav className="segmented" aria-label="Filtrar por tipo">
              <Link href={href(themeFilter, null)} aria-current={!kindFilter ? "page" : undefined}>
                Todos · {inState.length}
              </Link>
              <Link href={href(themeFilter, "card")} aria-current={kindFilter === "card" ? "page" : undefined}>
                Cards
              </Link>
              <Link href={href(themeFilter, "mcq")} aria-current={kindFilter === "mcq" ? "page" : undefined}>
                Múltipla escolha
              </Link>
            </nav>
            {usedThemes.length > 0 && (
              <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }} aria-label="Filtrar por tema">
                <Link href={href(null, kindFilter)} className={`chip${!themeFilter ? " on" : ""}`}>
                  Todos os temas
                </Link>
                {usedThemes.map((t) => (
                  <Link key={t.id} href={href(t.id, kindFilter)} className={`chip${themeFilter === t.id ? " on" : ""}`}>
                    {t.name}
                  </Link>
                ))}
                {inState.some((i) => !i.theme_id) && (
                  <Link href={href("sem", kindFilter)} className={`chip${themeFilter === "sem" ? " on" : ""}`}>
                    Sem tema
                  </Link>
                )}
              </nav>
            )}
          </div>
        )}

        {!profileId ? (
          <div className="empty">
            <p className="empty-title">Escolha um perfil para cadastrar itens.</p>
          </div>
        ) : items.length === 0 ? (
          <div className="empty">
            <p className="empty-title">Nenhum item ainda.</p>
            <p className="lead">
              Cadastre cards de pergunta e resposta ou questões de múltipla escolha, com tema, nível, explicação e fonte.
              Eles entram na revisão diária na próxima task.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link href="/estudar/novo" className="btn btn-primary">
                Criar o primeiro item
              </Link>
              <Link href="/biblia" className="btn btn-text">
                Criar a partir de um versículo
              </Link>
            </div>
          </div>
        ) : visible.length === 0 ? (
          <div className="empty">
            <p className="empty-title">
              {inState.length === 0
                ? stateFilter === "rascunho"
                  ? "Nenhum rascunho aguardando."
                  : "Nenhum item aprovado ainda."
                : "Nenhum item com esse filtro."}
            </p>
          </div>
        ) : (
          <ul className="item-list">
            {visible.map((i) => (
              <ItemCard key={i.id} item={i} themes={themes} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
