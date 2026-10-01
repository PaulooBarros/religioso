"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "./icons";
import { ThemeToggle } from "./theme-toggle";
import { parseReference, chapterHref } from "@/lib/bible/reference";
import {
  clampNavWidth,
  NAV_COLLAPSED_COOKIE,
  NAV_COLLAPSED_WIDTH,
  NAV_DEFAULT_WIDTH,
  NAV_MAX_WIDTH,
  NAV_MIN_WIDTH,
  NAV_WIDTH_COOKIE,
} from "@/lib/nav-prefs";

type Item = { label: string; icon: IconName; href?: string; stage?: number };

/** Items without href belong to a later stage and are shown disabled. */
const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Estudar",
    items: [
      { label: "Hoje", icon: "hoje", href: "/hoje" },
      { label: "Cards e questões", icon: "simulados", href: "/estudar" },
      { label: "Trilha de sistemática", icon: "trilha", href: "/trilha" },
      { label: "Fé batista", icon: "batista", stage: 5 },
      { label: "Catecismos", icon: "catecismos", href: "/catecismos" },
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

function NavItem({ item, pathname, collapsed }: { item: Item; pathname: string; collapsed: boolean }) {
  if (!item.href) {
    return (
      <span className="nav-item" aria-disabled="true" title={`${item.label} · chega na etapa ${item.stage}`}>
        <Icon name={item.icon} stroke={1.4} />
        <span className="nav-label">{item.label}</span>
        <span className="nav-soon">em breve</span>
      </span>
    );
  }
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      className="nav-item"
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
    >
      <Icon name={item.icon} stroke={active ? 1.6 : 1.4} />
      <span className="nav-label">{item.label}</span>
    </Link>
  );
}

function saveCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
}

/** Applies the sidebar width to the shell, so other fixed elements can follow it. */
function applyWidth(px: number) {
  document.querySelector<HTMLElement>(".shell")?.style.setProperty("--nav-w", `${px}px`);
}

export function NavDesktop({
  profileName,
  profileInitials,
  initialWidth,
  initialCollapsed,
}: {
  profileName: string | null;
  profileInitials: string;
  initialWidth: number;
  initialCollapsed: boolean;
}) {
  const pathname = usePathname();
  const [width, setWidth] = useState(initialWidth);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [dragging, setDragging] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    applyWidth(collapsed ? NAV_COLLAPSED_WIDTH : width);
  }, [collapsed, width]);

  function commitWidth(px: number) {
    const w = clampNavWidth(px);
    setWidth(w);
    saveCookie(NAV_WIDTH_COOKIE, String(w));
  }

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    saveCookie(NAV_COLLAPSED_COOKIE, next ? "1" : "0");
  }

  function startDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (collapsed) return;
    e.preventDefault();
    const left = navRef.current?.getBoundingClientRect().left ?? 0;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    setDragging(true);
    let last = width;
    const move = (ev: PointerEvent) => {
      last = clampNavWidth(ev.clientX - left);
      setWidth(last);
    };
    const up = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
      target.removeEventListener("pointercancel", up);
      setDragging(false);
      commitWidth(last);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
    target.addEventListener("pointercancel", up);
  }

  return (
    <nav
      ref={navRef}
      className={`nav${collapsed ? " collapsed" : ""}${dragging ? " dragging" : ""}`}
      aria-label="Navegação principal"
      style={{ width: collapsed ? NAV_COLLAPSED_WIDTH : width }}
    >
      <div className="nav-head">
        <Link href="/hoje" className="nav-brand" title="Estúdio Teológico">
          {collapsed ? "ET" : "Estúdio Teológico"}
        </Link>
        <button
          type="button"
          className="nav-toggle"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
          title={collapsed ? "Expandir" : "Recolher"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 4h16v16H4zM9 4v16" />
            <path d={collapsed ? "M13 10l2 2-2 2" : "M16 10l-2 2 2 2"} />
          </svg>
        </button>
      </div>
      <div className="nav-groups">
        {GROUPS.map((g) => (
          <div className="nav-group" key={g.title}>
            <div className="nav-group-title">{g.title}</div>
            {g.items.map((it) => (
              <NavItem key={it.label} item={it} pathname={pathname} collapsed={collapsed} />
            ))}
          </div>
        ))}
      </div>
      <div className="nav-footer">
        <Link
          href="/fontes"
          className="nav-item"
          aria-current={isActive(pathname, "/fontes") ? "page" : undefined}
          title={collapsed ? "Fontes e licenças" : undefined}
          aria-label={collapsed ? "Fontes e licenças" : undefined}
        >
          <Icon name="fontes" stroke={1.4} />
          <span className="nav-label">Fontes e licenças</span>
        </Link>
        {profileName !== null && (
          <Link href="/perfis" className="nav-profile" aria-label={`Trocar perfil (atual: ${profileName})`} title={collapsed ? profileName : undefined}>
            <span className="avatar">{profileInitials}</span>
            <span className="nav-label" style={{ flex: 1 }}>
              {profileName}
            </span>
            <svg className="nav-label" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)" }} aria-hidden="true">
              <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />
            </svg>
          </Link>
        )}
      </div>
      {!collapsed && (
        <div
          className="nav-resize"
          role="separator"
          aria-orientation="vertical"
          aria-label="Largura da barra lateral"
          aria-valuemin={NAV_MIN_WIDTH}
          aria-valuemax={NAV_MAX_WIDTH}
          aria-valuenow={width}
          tabIndex={0}
          title="Arraste para ajustar a largura · clique duplo volta ao padrão"
          onPointerDown={startDrag}
          onDoubleClick={() => commitWidth(NAV_DEFAULT_WIDTH)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") commitWidth(width - 16);
            else if (e.key === "ArrowRight") commitWidth(width + 16);
            else if (e.key === "Home") commitWidth(NAV_MIN_WIDTH);
            else if (e.key === "End") commitWidth(NAV_MAX_WIDTH);
            else return;
            e.preventDefault();
          }}
        />
      )}
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
      <ThemeToggle withLabel className="btn btn-sm" />
    </header>
  );
}

const MOBILE: { label: string; icon: IconName; href: string }[] = [
  { label: "Hoje", icon: "hoje", href: "/hoje" },
  { label: "Bíblia", icon: "biblia", href: "/biblia" },
  { label: "Estudar", icon: "trilha", href: "/estudar" },
  { label: "Notas", icon: "notas", href: "/notas" },
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
