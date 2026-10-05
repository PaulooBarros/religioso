import Link from "next/link";
import { Icon } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOut } from "@/lib/actions/auth";
import { getSession, initials } from "@/lib/session";

export const metadata = { title: "Mais" };

const LATER = [
  ["Fé batista", 5],
  ["História e confissões", 5],
  ["Teólogos e movimentos", 6],
  ["Comparador", 6],
  ["Chat de estudo", 7],
] as const;

export default async function MorePage() {
  const session = await getSession();
  const profile = session.mode === "user" ? session.profile : null;

  return (
    <main className="page">
      <div className="page-narrow" style={{ maxWidth: 560, gap: 18 }}>
        <h1 className="h2">Mais</h1>
        {profile && (
          <Link
            href="/perfis"
            className="card"
            style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", textDecoration: "none", color: "var(--ink)" }}
          >
            <span className="avatar avatar-lg">{initials(profile.name)}</span>
            <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 16, fontWeight: 500 }}>{profile.name}</span>
              <span className="muted" style={{ fontSize: 12.5 }}>
                Trocar perfil
              </span>
            </span>
            <Icon name="direita" size={18} />
          </Link>
        )}
        <nav style={{ display: "flex", flexDirection: "column", borderTop: "1px solid var(--line)" }}>
          {[
            ["/biblia/marcadores", "Marcadores"],
            ["/biblia/plano", "Plano de leitura"],
            ["/biblia/devocionais", "Devocionais"],
            ["/trilha", "Trilha de sistemática"],
            ["/catecismos", "Catecismos"],
            ["/simulados", "Simulados"],
            ["/celula", "Célula"],
            ["/notas", "Notas"],
            ["/fontes", "Fontes e licenças"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              style={{ display: "flex", alignItems: "center", minHeight: 52, borderBottom: "1px solid var(--line)", textDecoration: "none", color: "var(--ink)", fontSize: 15 }}
            >
              <span style={{ flex: 1 }}>{label}</span>
              <Icon name="direita" size={16} />
            </Link>
          ))}
          {LATER.map(([label, stage]) => (
            <span
              key={label}
              style={{ display: "flex", alignItems: "center", minHeight: 52, borderBottom: "1px solid var(--line)", color: "var(--faint)", fontSize: 15 }}
            >
              <span style={{ flex: 1 }}>{label}</span>
              <span style={{ fontSize: 12.5 }}>etapa {stage}</span>
            </span>
          ))}
        </nav>
        <div>
          <ThemeToggle withLabel className="btn" />
        </div>
        {session.mode === "user" && (
          <form action={signOut}>
            <button type="submit" className="btn btn-ghost" style={{ paddingLeft: 0 }}>
              Sair da conta ({session.email})
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
