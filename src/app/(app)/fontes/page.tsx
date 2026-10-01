import { FromYourBase } from "@/components/icons";
import { BIBLIA_LIVRE_SOURCE } from "@/lib/bible/source";
import { getSources } from "@/lib/queries";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata = { title: "Fontes e licenças" };

type Source = {
  slug: string;
  name: string;
  author: string | null;
  year: string | null;
  license: string;
  license_url: string | null;
  url: string;
  verified_at: string;
  required_credit: string | null;
  notes: string | null;
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

export default async function SourcesPage() {
  const fromDb = isSupabaseConfigured() ? ((await getSources()) as Source[]) : [];
  // Before the import runs, show the source the local text came from.
  const sources: Source[] = fromDb.length ? fromDb : [BIBLIA_LIVRE_SOURCE];

  return (
    <main className="page">
      <div className="page-narrow" style={{ maxWidth: 760 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h1 className="h1">Fontes e licenças</h1>
          <p className="lead">
            Todo texto guardado no sistema tem origem e licença registradas aqui. Só entram textos em domínio público ou
            com licença livre. Versões e traduções com direitos autorais aparecem apenas como link externo ou como
            anotação sua.
          </p>
        </div>

        {sources.map((s) => (
          <section key={s.slug} className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
              <h2 className="serif" style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>
                {s.name}
              </h2>
              <FromYourBase />
            </div>
            <dl
              style={{
                margin: 0,
                display: "grid",
                gridTemplateColumns: "minmax(110px, 160px) 1fr",
                gap: "8px 20px",
                fontSize: 14,
                lineHeight: 1.55,
              }}
            >
              {s.author && (
                <>
                  <dt className="muted">Autor ou tradutor</dt>
                  <dd style={{ margin: 0 }}>{s.author}</dd>
                </>
              )}
              {s.year && (
                <>
                  <dt className="muted">Ano</dt>
                  <dd style={{ margin: 0 }}>{s.year}</dd>
                </>
              )}
              <dt className="muted">Licença</dt>
              <dd style={{ margin: 0 }}>
                {s.license_url ? (
                  <a href={s.license_url} target="_blank" rel="noopener noreferrer">
                    {s.license}
                  </a>
                ) : (
                  s.license
                )}
              </dd>
              <dt className="muted">Origem</dt>
              <dd style={{ margin: 0, overflowWrap: "anywhere" }}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.url}
                </a>
              </dd>
              <dt className="muted">Verificado em</dt>
              <dd style={{ margin: 0 }}>{formatDate(s.verified_at)}</dd>
              {s.notes && (
                <>
                  <dt className="muted">Observações</dt>
                  <dd style={{ margin: 0 }}>{s.notes}</dd>
                </>
              )}
            </dl>
            {s.required_credit && (
              <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                <span className="label">Crédito exigido</span>
                <p className="serif" style={{ margin: 0, fontSize: 15, lineHeight: 1.6 }}>
                  {s.required_credit}
                </p>
              </div>
            )}
          </section>
        ))}

        {fromDb.length === 0 && (
          <p className="caption">
            O banco ainda não foi conectado ou o texto ainda não foi importado. Esta ficha vem da configuração do
            projeto e passa a ser lida do banco depois da importação.
          </p>
        )}
      </div>
    </main>
  );
}
