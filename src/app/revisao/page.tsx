import { redirect } from "next/navigation";
import { ReviewSession } from "./session";
import { getQueue, type ReviewMode } from "@/lib/review";
import { getSession } from "@/lib/session";

export const metadata = { title: "Revisão" };

/** Full-screen review session (no navigation), as in the design. */
export default async function ReviewPage({ searchParams }: PageProps<"/revisao">) {
  const session = await getSession();
  if (session.mode === "anonymous") redirect("/entrar");
  if (session.mode === "local") redirect("/hoje");
  if (!session.profile) redirect("/perfis");

  const mode: ReviewMode = (await searchParams).modo === "erros" ? "erros" : "dia";
  const queue = await getQueue(session.profile.id, mode);
  return <ReviewSession key={mode} mode={mode} initialQueue={queue} />;
}
