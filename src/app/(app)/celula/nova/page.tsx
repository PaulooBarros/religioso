import Link from "next/link";
import { NewMessage } from "./new-message";
import { currentProfileId } from "@/lib/session";

export const metadata = { title: "Nova mensagem" };

export default async function NewMessagePage({ searchParams }: PageProps<"/celula/nova">) {
  const { ref } = await searchParams;
  const profileId = await currentProfileId();

  return (
    <main className="page">
      <div className="page-narrow" style={{ maxWidth: 720 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Link href="/celula" className="caption" style={{ textDecoration: "none" }}>
            ← Célula
          </Link>
          <h1 className="h1">Nova mensagem</h1>
        </div>
        {profileId ? (
          <NewMessage presetPassage={typeof ref === "string" ? ref : undefined} />
        ) : (
          <p className="lead">Escolha um perfil para preparar mensagens.</p>
        )}
      </div>
    </main>
  );
}
