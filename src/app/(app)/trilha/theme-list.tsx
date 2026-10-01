import Link from "next/link";
import type { Progress, ThemeSummary } from "@/lib/trail";

export function DomainBar({ percent }: { percent: number }) {
  return (
    <div className="domain-bar" role="presentation">
      <div style={{ width: `${percent}%` }} />
    </div>
  );
}

export function progressLabel(p: Progress) {
  if (p.total === 0) return "Sem itens";
  if (p.started === 0) return "Não iniciado";
  return `${p.percent}%`;
}

export function ThemeList({ themes, current }: { themes: ThemeSummary[]; current?: string }) {
  return (
    <nav className="trail-list" aria-label="Temas">
      <h2>Temas</h2>
      {themes.map((t, i) => (
        <Link key={t.id} href={`/trilha/${t.id}`} className="trail-theme" aria-current={t.id === current ? "page" : undefined}>
          <div className="trail-theme-head">
            <b style={{ fontWeight: t.id === current ? 600 : 400 }}>
              {i + 1}. {t.name}
            </b>
            <span>{progressLabel(t.progress)}</span>
          </div>
          <DomainBar percent={t.progress.percent} />
        </Link>
      ))}
    </nav>
  );
}
