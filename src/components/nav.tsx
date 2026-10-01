"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "./icons";
import { parseReference, chapterHref } from "@/lib/bible/reference";

type Item = { label: string; icon: IconName; href?: string; stage?: number };

/** Items without href belong to a later stage and are shown disabled. */
const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Estudar",
    items: [
      { label: "Hoje", icon: "hoje", href: "/hoje" },
      { label: "Trilha de sistemática", icon: "trilha", stage: 3 },
      { label: "Fé batista", icon: "batista", stage: 5 },
      { label: "Catecismos", icon: "catecismos", stage: 2 },
      { label: "Simulados", icon: "simulados", stage: 3 },
    ],
  },
  {
    title: "Ler",
    items: [
      { label: "Bíblia", icon: "biblia", href: "/biblia" },
      { label: "História e confissões", icon: "historia", stage: 5 },
      { label: "Teólogos e movimentos", icon: "teologos", stage: 6 },
      { label: "Comparador", icon: "comparador", stage: 6 },
    ],
  },
  { title: "Ensinar", items: [{ label: "Célula", icon: "celula", stage: 4 }] },
  { title: "Meu material", items: [{ label: "Notas e biblioteca", icon: "notas", href: "/notas" }] },
  { title: "Perguntar", items: [{ label: "Chat de estudo", icon: "chat", stage: 7 }] },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItem({ item, pathname }: { item: Item; pathname: string }) {
  if (!item.href) {
    return (
      <span className="nav-item" aria-disabled="true" title={`Chega na etapa ${item.stage}`}>
        <Icon name={item.icon} stroke={1.4} />
        <span>{item.label}</span>
        <span className="nav-soon">em breve</span>
      </span>
    );
  }
  const active = isActive(pathname, item.href);
  return (
    <Link href={item.href} className="nav-item" aria-current={active ? "page" : undefined}>
      <Icon name={item.icon} stroke={active ? 1.6 : 1.4} />
      <span>{item.label}</span>
    </Link>
  );
}

export function NavDesktop({ profileName, profileInitials }: { profileName: string | null; profileInitials: string }) {
  const pathname = usePathname();
  return (
    <nav className="nav" aria-label="Navegação principal">
      <Link href="/hoje" className="nav-brand">
        Estúdio Teológico
      </Link>
      <div className="nav-groups">
        {GROUPS.map((g) => (
          <div className="nav-group" key={g.title}>
            <div className="nav-group-title">{g.title}</div>
            {g.items.map((it) => (
              <NavItem key={it.label} item={it} pathname={pathname} />
            ))}
          </div>
        ))}
      </div>
      <div className="nav-footer">
        <Link href="/fontes" className="nav-item" aria-current={isActive(pathname, "/fontes") ? "page" : undefined}>
          <Icon name="fontes" stroke={1.4} />
          <span>Fontes e licenças</span>
        </Link>
        {profileName !== null && (
          <Link href="/perfis" className="nav-profile" aria-label="Trocar perfil">
            <span className="avatar">{profileInitials}</span>
            <span style={{ flex: 1 }}>{profileName}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)" }} aria-hidden="true">
              <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />
            </svg>
          </Link>
        )}
      </div>
    </nav>
  );
}

/** Passage search ("Ir para"). Ctrl+K focuses it. */
export function PassageSearch({ placeholder, autoFocusKey = true }: { placeholder: string; autoFocusKey?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!autoFocusKey) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [autoFocusKey]);

  return (
    <form
      role="search"
      className="search"
      onSubmit={(e) => {
        e.preventDefault();
        const ref_ = parseReference(value);
        if (!ref_) {
          setError(true);
          return;
        }
        setError(false);
        setValue("");
        ref.current?.blur();
        router.push(chapterHref(ref_.book, ref_.chapter, ref_.verse));
      }}
    >
      <Icon name="busca" size={16} />
      <label className="visually-hidden" htmlFor="passage-search">
        Buscar passagem
      </label>
      <input
        id="passage-search"
        ref={ref}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(false);
        }}
        placeholder={placeholder}
        autoComplete="off"
        aria-invalid={error}
        aria-describedby={error ? "passage-search-error" : undefined}
      />
      {error ? (
        <span id="passage-search-error" role="alert" style={{ fontSize: 12, color: "var(--accent)", whiteSpace: "nowrap" }}>
          Referência não encontrada
        </span>
      ) : (
        autoFocusKey && <span className="kbd">Ctrl K</span>
      )}
    </form>
  );
}

export function TopBar() {
  return (
    <header className="topbar">
      <PassageSearch placeholder="Ir para uma passagem, ex.: Rm 8:28" />
      <div style={{ flex: 1 }} />
    </header>
  );
}

const MOBILE: { label: string; icon: IconName; href: string }[] = [
  { label: "Hoje", icon: "hoje", href: "/hoje" },
  { label: "Bíblia", icon: "biblia", href: "/biblia" },
  { label: "Notas", icon: "notas", href: "/notas" },
  { label: "Fontes", icon: "fontes", href: "/fontes" },
  { label: "Mais", icon: "mais", href: "/mais" },
];

export function MobileBar() {
  const pathname = usePathname();
  return (
    <nav className="mobilebar" aria-label="Navegação">
      {MOBILE.map((it) => {
        const active = isActive(pathname, it.href);
        return (
          <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined}>
            <Icon name={it.icon} size={22} stroke={it.icon === "mais" ? 2.2 : active ? 1.8 : 1.4} />
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
