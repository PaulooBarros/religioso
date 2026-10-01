import Link from "next/link";
import { FromYourBase, Icon } from "@/components/icons";
import { bookById } from "@/lib/bible/books";
import { chapterHref, parseReference } from "@/lib/bible/reference";
import { getStudyItems, getThemes } from "@/lib/queries";
import { currentProfileId } from "@/lib/session";
import { KIND_LABEL, levelLabel, type StudyItem, type Theme } from "@/lib/study";

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

function ItemCard({ item, themes }: { item: StudyItem; themes: Theme[] }) {
  const theme = themes.find((t) => t.id === item.theme_id);
  return (
    <li className="item-card">
      <div className="item-meta">
        <span>{KIND_LABEL[item.kind]}</span>
        <span>·</span>
        <span>{theme?.name ?? "Sem tema"}</span>
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
      <div className="item-foot">
        <FromYourBase />
        {item.source_title || item.source_url ? (
          item.source_url ? (
            <a className="source-chip" href={item.source_url} target="_blank" rel="noopener noreferrer">
              {item.source_title ?? item.source_url}
            </a>
          ) : (
            <span className="source-chip">{item.source_title}</span>
          )
        ) : (
          <span className="source-chip unverified">sem fonte</span>
        )}
        <RefLinks refs={item.bible_refs} />
        <span style={{ flex: 1 }} />
        <Link href={`/estudar/${item.id}`} style={{ fontSize: 13 }}>
          Editar
        </Link>
      </div>
    </li>
  );
}

export default async function StudyPage({ searchParams }: PageProps<"/estudar">) {
  const { tema, tipo } = await searchParams;
  const profileId = await currentProfileId();
  const [themes, items] = await Promise.all([getThemes(), profileId ? getStudyItems(profileId) : Promise.resolve([])]);

  const themeFilter = typeof tema === "string" ? tema : null;
  const kindFilter = tipo === "card" || tipo === "mcq" ? tipo : null;
  const visible = items.filter(
    (i) =>
      (!themeFilter || (themeFilter === "sem" ? !i.theme_id : i.theme_id === themeFilter)) &&
      (!kindFilter || i.kind === kindFilter),
  );

  const href = (t: string | null, k: string | null) => {
    const q = new URLSearchParams();
    if (t) q.set("tema", t);
    if (k) q.set("tipo", k);
    const s = q.toString();
    return s ? `/estudar?${s}` : "/estudar";
  };

  const usedThemes = themes.filter((t) => items.some((i) => i.theme_id === t.id));

  return (
    <main className="page">
      <div className="page-narrow">
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="label">Estudar</span>
            <h1 className="h1">Cards e questões</h1>
          </div>
          {profileId && (
            <Link href="/estudar/novo" className="btn btn-primary">
              <Icon name="mais_sinal" size={15} stroke={1.8} />
              Novo item
            </Link>
          )}
        </div>

        {items.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <nav className="segmented" aria-label="Filtrar por tipo">
              <Link href={href(themeFilter, null)} aria-current={!kindFilter ? "page" : undefined}>
                Todos · {items.length}
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
                {items.some((i) => !i.theme_id) && (
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
            <p className="empty-title">Nenhum item com esse filtro.</p>
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
