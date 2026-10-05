"use client";

import { useState } from "react";

export function PrintActions({ plain }: { plain: string }) {
  const [copied, setCopied] = useState<"ok" | "error" | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(plain);
      setCopied("ok");
    } catch {
      setCopied("error");
    }
    setTimeout(() => setCopied(null), 2500);
  }

  return (
    <>
      <button type="button" className="btn btn-sm" onClick={copy}>
        {copied === "ok" ? "Copiado" : copied === "error" ? "Não foi possível copiar" : "Copiar como texto"}
      </button>
      <button type="button" className="btn btn-sm btn-primary" onClick={() => window.print()}>
        Imprimir ou salvar em PDF
      </button>
    </>
  );
}
