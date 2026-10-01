import { redirect } from "next/navigation";
import { ReviewSession } from "./session";
import { getQueue, type ReviewFocus, type ReviewMode } from "@/lib/review";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Revisão" };

/** Full-screen review session (no navigation), as in the design. */
export default async function ReviewPage({ searchParams }: PageProps<"/revisao">) {
  const session = await getSession();
  if (session.mode === "anonymous") redirect("/entrar");
  if (session.mode === "local") redirect("/hoje");
  if (!session.profile) redirect("/perfis");

  const { modo, tema, sub } = await searchParams;
  const mode: ReviewMode = modo === "erros" ? "erros" : modo === "tema" && typeof tema === "string" ? "tema" : "dia";

  let focus: ReviewFocus | undefined;
  let title: string | undefined;
  let backHref = "/hoje";
  if (mode === "tema") {
    const supabase = await createClient();
    const subId = typeof sub === "string" ? sub : null;
    const [{ data: theme }, { data: subtheme }] = await Promise.all([
      supabase.from("themes").select("id, name").eq("id", tema as string).maybeSingle(),
      subId
        ? supabase.from("subthemes").select("id, name").eq("id", subId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    if (!theme) redirect("/trilha");
    focus = { themeId: theme.id, subthemeId: subtheme?.id ?? null };
    title = subtheme ? `${theme.name} · ${subtheme.name}` : theme.name;
    backHref = `/trilha/${theme.id}${subtheme ? `?sub=${subtheme.id}` : ""}`;
  }

  const queue = await getQueue(session.profile.id, mode, focus);
  return <ReviewSession key={`${mode}-${focus?.themeId}-${focus?.subthemeId}`} mode={mode} initialQueue={queue} title={title} backHref={backHref} />;
}
