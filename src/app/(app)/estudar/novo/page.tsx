import Link from "next/link";
import { ItemForm } from "../item-form";
import { getThemes } from "@/lib/queries";
import { currentProfileId } from "@/lib/session";

export const metadata = { title: "Novo item" };

export default async function NewItemPage({ searchParams }: PageProps<"/estudar/novo">) {
  const { ref, salvo } = await searchParams;
  const [themes, profileId] = await Promise.all([getThemes(), currentProfileId()]);

  return (
    <main className="page">
      <div className="page-narrow" style={{ maxWidth: 720 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Link href="/estudar" className="caption" style={{ textDecoration: "none" }}>
            ← Cards e questões
          </Link>
          <h1 className="h1">Novo item</h1>
        </div>
        {typeof salvo === "string" && (
          <div className="notice" role="status" style={{ borderColor: "var(--line-strong)" }}>
            Item salvo. Pode cadastrar o próximo.
          </div>
        )}
        {profileId ? (
          <ItemForm key={typeof salvo === "string" ? salvo : "new"} themes={themes} presetRefs={typeof ref === "string" ? ref : undefined} />
        ) : (
          <p className="lead">Escolha um perfil para cadastrar itens.</p>
        )}
      </div>
    </main>
  );
}
