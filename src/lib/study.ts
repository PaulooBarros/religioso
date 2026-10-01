export type ItemKind = "card" | "mcq";

export const KIND_LABEL: Record<ItemKind, string> = {
  card: "Card",
  mcq: "Múltipla escolha",
};

export const LEVELS = [
  { value: 1, label: "Básico" },
  { value: 2, label: "Intermediário" },
  { value: 3, label: "Avançado" },
] as const;

export function levelLabel(level: number): string {
  return LEVELS.find((l) => l.value === level)?.label ?? "Básico";
}

export type Theme = { id: string; name: string };

export type StudyItem = {
  id: string;
  kind: ItemKind;
  prompt: string;
  answer: string | null;
  options: string[] | null;
  correct_option: number | null;
  explanation: string | null;
  theme_id: string | null;
  level: number;
  source_title: string | null;
  source_url: string | null;
  bible_refs: string[];
  origin: "manual" | "catecismo" | "ia";
  status: "draft" | "approved";
  subtopic: string | null;
  machine_translated: boolean;
  review_note: string | null;
  /** Last link check: true = opened, false = did not open, null = not checked. */
  source_ok: boolean | null;
  created_at: string;
  updated_at: string;
};

export const STUDY_ITEM_COLUMNS =
  "id, kind, prompt, answer, options, correct_option, explanation, theme_id, level, source_title, source_url, bible_refs, origin, status, subtopic, machine_translated, review_note, source_ok, created_at, updated_at";

/** AI drafts need a verified source before they can be approved (principle 1). */
export function approvalBlocker(item: Pick<StudyItem, "origin" | "source_url" | "source_ok">): string | null {
  if (item.origin !== "ia") return null;
  if (!item.source_url) return "Acrescente uma fonte com link antes de aprovar.";
  if (item.source_ok !== true) return "O link da fonte não abriu. Corrija a fonte antes de aprovar.";
  return null;
}

export const MAX_OPTIONS = 6;
