import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  clampNavWidth,
  NAV_COLLAPSED_COOKIE,
  NAV_COLLAPSED_WIDTH,
  NAV_DEFAULT_WIDTH,
  NAV_WIDTH_COOKIE,
} from "@/lib/nav-prefs";
import { MobileBar, NavDesktop, TopBar } from "@/components/nav";
import { getSession, initials } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();
  if (session.mode === "anonymous") redirect("/entrar");
  if (session.mode === "user" && !session.profile) redirect("/perfis");

  const profileName = session.mode === "user" ? session.profile!.name : null;
  const jar = await cookies();
  const navWidth = clampNavWidth(jar.get(NAV_WIDTH_COOKIE)?.value ?? NAV_DEFAULT_WIDTH);
  const navCollapsed = jar.get(NAV_COLLAPSED_COOKIE)?.value === "1";

  return (
    <div className="shell" style={{ "--nav-w": `${navCollapsed ? NAV_COLLAPSED_WIDTH : navWidth}px` } as React.CSSProperties}>
      <NavDesktop
        profileName={profileName}
        profileInitials={profileName ? initials(profileName) : ""}
        initialWidth={navWidth}
        initialCollapsed={navCollapsed}
      />
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
