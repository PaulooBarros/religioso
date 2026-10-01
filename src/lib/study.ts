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
  created_at: string;
  updated_at: string;
};

export const STUDY_ITEM_COLUMNS =
  "id, kind, prompt, answer, options, correct_option, explanation, theme_id, level, source_title, source_url, bible_refs, origin, status, created_at, updated_at";

export const MAX_OPTIONS = 6;
