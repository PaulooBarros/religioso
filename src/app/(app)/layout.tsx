import { redirect } from "next/navigation";
import { MobileBar, NavDesktop, TopBar } from "@/components/nav";
import { getSession, initials } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();
  if (session.mode === "anonymous") redirect("/entrar");
  if (session.mode === "user" && !session.profile) redirect("/perfis");

  const profileName = session.mode === "user" ? session.profile!.name : null;

  return (
    <div className="shell">
      <NavDesktop profileName={profileName} profileInitials={profileName ? initials(profileName) : ""} />
      <div className="main-col">
        <TopBar />
        {session.mode === "local" && (
          <div className="notice" style={{ margin: "16px 28px 0", borderColor: "var(--line-strong)" }} role="status">
            <span>
              <b style={{ fontWeight: 600 }}>Modo de leitura local.</b> O Supabase ainda não está configurado: dá para ler
              a Bíblia, mas notas, marcadores e perfis ficam desativados até conectar o banco (veja o README).
            </span>
          </div>
        )}
        {children}
      </div>
      <MobileBar />
    </div>
  );
}
