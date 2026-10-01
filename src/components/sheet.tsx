"use client";

import { useEffect, useRef } from "react";

/** Dialog on desktop, bottom sheet on mobile. Closes on Esc and backdrop click. */
export function Sheet({
  title,
  onClose,
  children,
}: {
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>("input, textarea, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, []);

  return (
    <div
      className="sheet-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close.current();
      }}
    >
      <div ref={panel} className="sheet" role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined}>
        <div className="sheet-handle" />
        <div className="sheet-title">{title}</div>
        {children}
      </div>
    </div>
  );
}
