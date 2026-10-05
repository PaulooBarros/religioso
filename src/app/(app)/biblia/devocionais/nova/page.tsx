import Link from "next/link";
import { NewDevotionalSeries } from "./new-series";
import { currentProfileId } from "@/lib/session";

export const metadata = { title: "Nova série de devocionais" };

export default async function NewDevotionalSeriesPage() {
  const profileId = await currentProfileId();
  return (
    <main className="page">
      <div className="page-narrow" style={{ maxWidth: 720 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Link href="/biblia/devocionais" className="caption" style={{ textDecoration: "none" }}>
            ← Devocionais
          </Link>
          <h1 className="h1">Nova série de devocionais</h1>
          <p className="lead">
            A série nasce como rascunho, com os dias em branco na estrutura do modelo. Você escreve os dias e ativa quando quiser.
          </p>
        </div>
        {profileId ? <NewDevotionalSeries /> : <p className="lead">Escolha um perfil para criar séries.</p>}
      </div>
    </main>
  );
}
