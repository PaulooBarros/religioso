import Link from "next/link";
import { redirect } from "next/navigation";
import { NewProfileForm } from "./new-profile";
import { selectProfile } from "@/lib/actions/profiles";
import { getSession, initials } from "@/lib/session";

export const metadata = { title: "Perfis" };

export default async function ProfilesPage({ searchParams }: PageProps<"/perfis">) {
  const session = await getSession();
  if (session.mode === "local") redirect("/hoje");
  if (session.mode === "anonymous") redirect("/entrar");
  const creating = (await searchParams).novo === "1" || session.profiles.length === 0;

  return (
    <main style={{ minHeight: "100dvh", display: "flex", justifyContent: "center", padding: "56px 24px 40px" }}>
      <div style={{ width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 24 }}>
        {creating ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Novo perfil</span>
              {session.profiles.length > 0 && (
                <Link href="/perfis" className="muted" style={{ fontSize: 14, textDecoration: "none" }}>
                  Cancelar
                </Link>
              )}
            </div>
            {session.profiles.length === 0 && (
              <p className="lead">Crie o primeiro perfil. Cada perfil tem seus marcadores, notas, progresso e revisões.</p>
            )}
            <NewProfileForm />
          </>
        ) : (
          <>
            <p className="serif" style={{ margin: 0, fontSize: 28 }}>
              Quem está estudando?
            </p>
            <p className="lead" style={{ marginTop: -12 }}>
              Cada perfil tem seus marcadores, notas, progresso, revisões e ajustes.
            </p>
            <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid var(--line)" }}>
              {session.profiles.map((p) => {
                const current = session.profile?.id === p.id;
                return (
                  <form key={p.id} action={selectProfile.bind(null, p.id)}>
                    <button
                      type="submit"
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        minHeight: 68,
                        border: 0,
                        borderBottom: "1px solid var(--line)",
                        background: "transparent",
                        cursor: "pointer",
                        textAlign: "left",
                        padding: 0,
                      }}
                    >
                      <span className="avatar avatar-lg" style={current ? { border: "1.5px solid var(--accent)" } : undefined}>
                        {initials(p.name)}
                      </span>
                      <span style={{ flex: 1, fontSize: 16 }}>{p.name}</span>
                      {current && <span style={{ fontSize: 12.5, fontWeight: 600 }}>✓ atual</span>}
                    </button>
                  </form>
                );
              })}
            </div>
            <Link href="/perfis?novo=1" className="btn btn-lg" style={{ borderColor: "var(--ink)" }}>
              + Criar perfil
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
