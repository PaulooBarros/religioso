import Link from "next/link";
import { ThemeList } from "./theme-list";
import { currentProfileId } from "@/lib/session";
import { getTrail } from "@/lib/trail";

export const metadata = { title: "Trilha de sistemática" };

export default async function TrailPage() {
  const profileId = await currentProfileId();
  if (!profileId) {
    return (
      <main className="page">
        <p className="lead">Escolha um perfil para usar a trilha.</p>
      </main>
    );
  }
  const themes = await getTrail(profileId);
  const total = themes.reduce((s, t) => s + t.progress.total, 0);
  const mastered = themes.reduce((s, t) => s + t.progress.mastered, 0);
  const firstStarted = themes.find((t) => t.progress.started > 0 && t.progress.percent < 100) ?? themes.find((t) => t.progress.total > 0);

  return (
    <div className="trail">
      <ThemeList themes={themes} />
      <main className="trail-main desktop-only">
        <div className="trail-body">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span className="label">Estudar</span>
            <h1 className="h1">Trilha de sistemática</h1>
            <p className="lead">
              Percorra cada tema pelos subtemas, com leituras, notas e as questões aprovadas. Um item conta como
              dominado quando o intervalo dele na revisão chega a 21 dias.
            </p>
          </div>
          <p className="serif" style={{ margin: 0, fontSize: 20 }}>
            {mastered} de {total} itens dominados.
          </p>
          {firstStarted && (
            <div>
              <Link href={`/trilha/${firstStarted.id}`} className="btn btn-primary">
                Continuar em {firstStarted.name}
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
