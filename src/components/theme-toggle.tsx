"use client";

import { useSyncExternalStore } from "react";
import { THEME_COOKIE } from "@/lib/theme";

const THEME_EVENT = "et:theme";

function currentTheme(): "light" | "dark" {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", onChange);
  window.addEventListener(THEME_EVENT, onChange);
  return () => {
    mq.removeEventListener("change", onChange);
    window.removeEventListener(THEME_EVENT, onChange);
  };
}

const SUN = "M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z";
const MOON = "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z";

/** Switches between light and dark; the choice is kept in a cookie so the server renders it. */
export function ThemeToggle({ withLabel = false, className = "aa-btn" }: { withLabel?: boolean; className?: string }) {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => "light" as const);
  const next = theme === "dark" ? "light" : "dark";
  const label = next === "dark" ? "Modo escuro" : "Modo claro";

  return (
    <button
      type="button"
      className={className}
      aria-label={withLabel ? undefined : label}
      title={label}
      onClick={() => {
        document.documentElement.dataset.theme = next;
        document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        window.dispatchEvent(new Event(THEME_EVENT));
      }}
      style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={next === "dark" ? MOON : SUN} />
      </svg>
      {withLabel && <span style={{ fontFamily: "var(--font-sans)", fontSize: 15 }}>{label}</span>}
    </button>
  );
}
