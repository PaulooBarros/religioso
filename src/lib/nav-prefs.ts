// Sidebar preferences, kept in cookies so the server renders the saved layout.
export const NAV_WIDTH_COOKIE = "et_nav_w";
export const NAV_COLLAPSED_COOKIE = "et_nav_c";

export const NAV_DEFAULT_WIDTH = 232;
export const NAV_MIN_WIDTH = 200;
export const NAV_MAX_WIDTH = 360;
export const NAV_COLLAPSED_WIDTH = 64;

export function clampNavWidth(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return NAV_DEFAULT_WIDTH;
  return Math.round(Math.min(NAV_MAX_WIDTH, Math.max(NAV_MIN_WIDTH, n)));
}
