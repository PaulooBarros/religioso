"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { restoreVersion } from "@/lib/actions/messages";

export function RestoreVersion({ messageId, version }: { messageId: string; version: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
      <button
        type="button"
        className="btn btn-sm btn-primary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await restoreVersion(messageId, version);
            if (!r.ok) return setError(r.error);
            router.push(`/celula/${messageId}`);
          })
        }
      >
        {pending ? "Restaurando…" : "Restaurar esta versão"}
      </button>
      {error && (
        <span className="form-error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
