"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteStudyItem } from "@/lib/actions/study";

export function DeleteItem({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <button
        type="button"
        className="btn btn-ghost"
        style={{ paddingLeft: 0 }}
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Apagar este item? Isso não pode ser desfeito.")) return;
          start(async () => {
            const res = await deleteStudyItem(id);
            if (res.ok) router.push("/estudar");
            else setError(res.error);
          });
        }}
      >
        {pending ? "Apagando…" : "Apagar item"}
      </button>
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
