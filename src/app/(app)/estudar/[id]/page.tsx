import Link from "next/link";
import { notFound } from "next/navigation";
import { ItemForm } from "../item-form";
import { DeleteItem } from "./delete-item";
import { getStudyItem, getThemes } from "@/lib/queries";
import { getSubthemes } from "@/lib/trail";
import { currentProfileId } from "@/lib/session";

export const metadata = { title: "Editar item" };

export default async function EditItemPage({ params }: PageProps<"/estudar/[id]">) {
  const { id } = await params;
  const profileId = await currentProfileId();
  if (!profileId || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [themes, item, subthemes] = await Promise.all([getThemes(), getStudyItem(profileId, id), getSubthemes(profileId)]);
  if (!item) notFound();

  return (
    <main className="page">
      <div className="page-narrow" style={{ maxWidth: 720 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Link href="/estudar" className="caption" style={{ textDecoration: "none" }}>
            ← Cards e questões
          </Link>
          <h1 className="h1">Editar item</h1>
        </div>
        <ItemForm themes={themes} subthemes={subthemes} item={item} />
        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 18 }}>
          <DeleteItem id={item.id} />
        </div>
      </div>
    </main>
  );
}
