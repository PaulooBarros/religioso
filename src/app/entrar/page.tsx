import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { getSession } from "@/lib/session";

export const metadata = { title: "Entrar" };

export default async function LoginPage() {
  const session = await getSession();
  if (session.mode === "local") redirect("/hoje");
  if (session.mode === "user") redirect("/perfis");

  return (
    <main style={{ minHeight: "100dvh", display: "flex", justifyContent: "center", padding: "72px 24px 40px" }}>
      <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 28 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span className="label label-accent">Estúdio Teológico</span>
          <h1 className="serif" style={{ margin: 0, fontSize: 30, fontWeight: 400, lineHeight: 1.25 }}>
            Um livro de estudo, não um app.
          </h1>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
