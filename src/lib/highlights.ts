export const HIGHLIGHT_COLORS = [
  { id: "amarelo", label: "Amarelo" },
  { id: "verde", label: "Verde" },
  { id: "azul", label: "Azul" },
  { id: "rosa", label: "Rosa" },
] as const;

export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number]["id"];

/** verse -> color, for one chapter. */
export type ChapterHighlights = Record<number, HighlightColor>;
