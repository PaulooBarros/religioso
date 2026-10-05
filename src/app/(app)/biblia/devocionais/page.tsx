import Link from "next/link";
import { DomainBar } from "../../trilha/theme-list";
import { rhythmLabel, STATUS_LABEL } from "@/lib/devotional-plan";
import { getDevotionalSeriesList, type DevotionalSeriesSummary } from "@/lib/devotionals";
import { currentProfileId } from "@/lib/session";

export const metadata = { title: "Devocionais" };

const day = (iso: string) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

function progress(s: DevotionalSeriesSummary): string {
  if (s.status === "draft") return `${s.written} de ${s.days} ${s.days === 1 ? "dia escrito" : "dias escritos"}`;
  if (s.status === "active" && s.read === 0 && s.anchor_date) return `começa em ${day(s.anchor_date)}`;
  return `${s.read} de ${s.days} lidos`;
}

export default async function DevotionalsPage() {
  const profileId = await currentProfileId();
  if (!profileId) {
    return (
      <main className="page">
        <p className="lead">Escolha um perfil para usar os devocionais.</p>
      </main>
    );
  }
  const all = await getDevotionalSeriesList(profileId);
  const groups = [
    ["Em andamento", all.filter((s) => s.status === "active" || s.status === "paused")],
    ["Não iniciadas", all.filter((s) => s.status === "draft")],
    ["Concluídas", all.filter((s) => s.status === "done")],
    ["Arquivadas", all.filter((s) => s.status === "archived")],
  ] as const;

  return (
    <main className="page">
      <div className="page-narrow">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
          <h1 className="h1">Devocionais</h1>
          <Link href="/biblia/devocionais/nova" className="btn btn-primary">
            Nova série
          </Link>
        </div>

        {all.length === 0 && (
          <div className="empty">
            <p className="empty-title">Nenhuma série ainda.</p>
            <p className="lead">Uma série é um conjunto de textos curtos, um por dia, sobre um livro ou tema.</p>
            <div>
              <Link href="/biblia/devocionais/nova" className="btn btn-primary">
                Criar a primeira série
              </Link>
            </div>
          </div>
        )}

        {groups.map(
          ([title, list]) =>
            list.length > 0 && (
              <section key={title} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <h2 className="label" style={{ margin: "0 0 6px" }}>
                  {title}
                </h2>
                {list.map((s) => (
                  <Link key={s.id} href={`/biblia/devocionais/${s.id}`} className="msg-row">
                    <span className="msg-row-main" style={{ flex: 1 }}>
                      <span className="serif msg-row-title">{s.title}</span>
                      <span className="muted" style={{ fontSize: 13 }}>
                        {[s.about, rhythmLabel(s.weekdays).toLowerCase(), s.status === "paused" ? STATUS_LABEL.paused.toLowerCase() : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      <span style={{ maxWidth: 260 }}>
                        <DomainBar percent={s.days ? Math.round((s.read / s.days) * 100) : 0} />
                      </span>
                    </span>
                    <span className="muted" style={{ fontSize: 12.5, textAlign: "right" }}>
                      {progress(s)}
                    </span>
                  </Link>
                ))}
              </section>
            ),
        )}
      </div>
    </main>
  );
}
