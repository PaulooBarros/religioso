"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BibleTabs() {
  const pathname = usePathname();
  const onBookmarks = pathname.startsWith("/biblia/marcadores");
  return (
    <div className="tabs">
      <Link href="/biblia" className="tab" aria-current={onBookmarks ? undefined : "page"}>
        Ler
      </Link>
      <Link href="/biblia/marcadores" className="tab" aria-current={onBookmarks ? "page" : undefined}>
        Marcadores
      </Link>
      <span className="tab" aria-disabled="true" title="Chega na etapa 9">
        Devocionais
      </span>
    </div>
  );
}
