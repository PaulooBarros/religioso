import Link from "next/link";
import { NewPlan } from "./new-plan";
import { DomainBar } from "../../trilha/theme-list";
import { BOOKS } from "@/lib/bible/books";
import { planStatus } from "@/lib/reading-plan";
import { getReadingPlans } from "@/lib/reading-plans";
import { currentProfileId } from "@/lib/session";
import { dayKey } from "@/lib/srs";

export const metadata = { title: "Plano de leitura" };

export default async function PlansPage() {
  const profileId = await currentProfileId();
  if (!profileId) {
    return (
      <main className="page">
        <p className="lead">Escolha um perfil para seguir um plano de leitura.</p>
      </main>
    );
  }
  const plans = await getReadingPlans(profileId);
  const active = plans.filter((p) => !p.plan.archived_at);
  const archived = plans.filter((p) => p.plan.archived_at);

  return (
    <main className="page">
      <div className="page-narrow">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h1 className="h1">Plano de leitura</h1>
          <p className="lead">Um trecho da Bíblia por dia, com os capítulos divididos pelo tamanho, e o seu avanço marcado.</p>
        </div>

        {active.length > 0 && (
          <section style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <h2 className="label" style={{ margin: "0 0 6px" }}>
              Seus planos
            </h2>
            {active.map(({ plan, days, progress }) => {
              const next = progress.next ? days[progress.next - 1] : null;
              return (
                <Link key={plan.id} href={`/biblia/plano/${plan.id}`} className="msg-row">
                  <span className="msg-row-main" style={{ flex: 1 }}>
                    <span className="serif msg-row-title">{plan.title}</span>
                    <span className="muted" style={{ fontSize: 13 }}>
                      {next ? `Próxima leitura: dia ${next.number}, ${next.label}` : "Todas as leituras feitas"}
                    </span>
                    <span style={{ maxWidth: 260 }}>
                      <DomainBar percent={progress.percent} />
                    </span>
                  </span>
                  <span className="muted" style={{ fontSize: 12.5, textAlign: "right" }}>
                    {progress.done} de {progress.total} dias
                    <br />
                    {planStatus(progress)}
                  </span>
                </Link>
              );
            })}
          </section>
        )}

        <NewPlan books={BOOKS.map((b) => ({ id: b.id, name: b.name }))} today={dayKey(new Date())} open={active.length === 0} />

        {archived.length > 0 && (
          <section style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <h2 className="label" style={{ margin: "0 0 6px" }}>
              Arquivados
            </h2>
            {archived.map(({ plan, progress }) => (
              <Link key={plan.id} href={`/biblia/plano/${plan.id}`} className="msg-version">
                <span>{plan.title}</span>
                <span className="muted">
                  {progress.done} de {progress.total} dias
                </span>
              </Link>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
