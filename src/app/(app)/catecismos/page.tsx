import Link from "next/link";
import { EnrollControls } from "./enroll";
import { DomainBar } from "../trilha/theme-list";
import { getCatechisms } from "@/lib/catechisms";
import { currentProfileId } from "@/lib/session";

export const metadata = { title: "Catecismos" };

export default async function CatechismsPage() {
  const profileId = await currentProfileId();
  if (!profileId) {
    return (
      <main className="page">
        <p className="lead">Escolha um perfil para estudar os catecismos.</p>
      </main>
    );
  }
  const catechisms = await getCatechisms(profileId);

  return (
    <main className="page">
      <div className="page-narrow">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="label">Estudar</span>
          <h1 className="h1">Catecismos</h1>
          <p className="lead">
            Ative um catecismo e escolha quantas perguntas novas entram por dia. Elas aparecem na revisão do dia como
            cards. O texto em português é <b>tradução automática do original</b>; o original fica guardado ao lado de
            cada pergunta.
          </p>
        </div>

        <ul className="item-list">
          {catechisms.map((c) => (
            <li key={c.id} className="item-card" style={{ gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
                <Link href={`/catecismos/${c.id}`} className="serif" style={{ fontSize: 22, fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>
                  {c.name}
                </Link>
                <span className="caption">
                  {c.year} · {c.total} perguntas · original em {c.original_lang}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <DomainBar percent={c.percent} />
                </div>
                <span style={{ fontSize: 13, whiteSpace: "nowrap" }}>
                  {c.released === 0 ? "Não iniciado" : `${c.released} de ${c.total} liberadas · ${c.mastered} dominadas`}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <EnrollControls
                  catechismId={c.id}
                  state={c.enrollment?.state ?? null}
                  perDay={c.enrollment?.per_day ?? null}
                  finished={c.released >= c.total}
                />
                <Link href={`/catecismos/${c.id}`} style={{ fontSize: 13.5, fontWeight: 500 }}>
                  Ver perguntas →
                </Link>
              </div>
            </li>
          ))}
        </ul>

        <p className="caption">
          O Catecismo de Spurgeon (1855) ainda não entrou: as cópias disponíveis trazem uma edição modernizada, com
          trechos alterados em relação ao original. Fontes e licenças de cada texto estão em{" "}
          <Link href="/fontes">Fontes e licenças</Link>.
        </p>
      </div>
    </main>
  );
}
