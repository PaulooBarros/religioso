"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/biblia/marcadores", label: "Marcadores" },
  { href: "/biblia/plano", label: "Plano de leitura" },
  { href: "/biblia/devocionais", label: "Devocionais" },
];

export function BibleTabs() {
  const pathname = usePathname();
  const current = TABS.find((t) => pathname.startsWith(t.href));
  return (
    <div className="tabs">
      <Link href="/biblia" className="tab" aria-current={current ? undefined : "page"}>
        Ler
      </Link>
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className="tab" aria-current={current === t ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}
