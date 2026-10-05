import Link from "next/link";
import { NewSeries } from "./new-series";
import { currentProfileId } from "@/lib/session";

export const metadata = { title: "Nova série" };

export default async function NewSeriesPage() {
  const profileId = await currentProfileId();

  return (
    <main className="page">
      <div className="page-narrow" style={{ maxWidth: 720 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Link href="/celula" className="caption" style={{ textDecoration: "none" }}>
            ← Célula
          </Link>
          <h1 className="h1">Nova série</h1>
          <p className="lead">Um livro ou tema dividido em semanas. Cada semana vira uma mensagem com os blocos do modelo.</p>
        </div>
        {profileId ? <NewSeries /> : <p className="lead">Escolha um perfil para preparar séries.</p>}
      </div>
    </main>
  );
}
