"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BibleTabs() {
  const pathname = usePathname();
  const onBookmarks = pathname.startsWith("/biblia/marcadores");
  const onDevotionals = pathname.startsWith("/biblia/devocionais");
  return (
    <div className="tabs">
      <Link href="/biblia" className="tab" aria-current={onBookmarks || onDevotionals ? undefined : "page"}>
        Ler
      </Link>
      <Link href="/biblia/marcadores" className="tab" aria-current={onBookmarks ? "page" : undefined}>
        Marcadores
      </Link>
      <Link href="/biblia/devocionais" className="tab" aria-current={onDevotionals ? "page" : undefined}>
        Devocionais
      </Link>
    </div>
  );
}
