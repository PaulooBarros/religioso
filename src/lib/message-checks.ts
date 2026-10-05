import { extractRefs, type FoundRef, type Passage, type VerseCounts } from "./bible/extract.ts";
import { countWords, WORDS_PER_MINUTE, type MessageBlock } from "./message-templates.ts";

/** Checklist run before a message is marked as ready. Shared by server and client. */

export type CheckStatus = "ok" | "warn" | "fail";

export type AutoCheck = { key: string; label: string; status: CheckStatus; detail: string; refs?: FoundRef[] };

/** A question only the owner can answer, ticked by hand. */
export type ManualCheck = { key: string; label: string; detail?: string; done: boolean };

export type Checklist = {
  auto: AutoCheck[];
  manual: ManualCheck[];
  done: number;
  total: number;
  /** Nothing failed and every manual item is ticked. */
  complete: boolean;
};

export const MAX_CHECKS = 40;
const MAX_POINTS = 10;

/** Points of the outline: numbered lines ("1.", "2)") or, without numbers, paragraphs. */
export function splitPoints(text: string): string[] {
  const lines = text.split("\n");
  const numbered = /^\s*\d{1,2}\s*[.)]\s*\S/;
  let points: string[];
  if (lines.some((l) => numbered.test(l))) {
    points = [];
    for (const line of lines) {
      if (numbered.test(line)) points.push(line.trim());
      else if (points.length && line.trim()) points[points.length - 1] += ` ${line.trim()}`;
    }
  } else {
    points = text
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s+/g, " ").trim())
      .filter(Boolean);
  }
  return points.slice(0, MAX_POINTS);
}

/**
 * The key of a point carries its text, so editing a point clears its tick:
 * a changed point has to be checked against the passage again.
 */
export function pointKey(point: string): string {
  return `ponto:${point.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 160)}`;
}

export function buildChecklist(input: {
  blocks: MessageBlock[];
  passage: Passage;
  passageLabel: string;
  passageWords: number;
  duration: number;
  counts: VerseCounts;
  checked: string[];
}): Checklist {
  const { blocks, passage, counts } = input;
  const checked = new Set(input.checked);
  const auto: AutoCheck[] = [];

  // 1. Every reference written in the outline exists in the base.
  const refs = extractRefs(blocks.map((b) => b.text).join("\n"), counts, passage);
  const broken = refs.filter((r) => r.error);
  const outside = refs.filter((r) => r.outside);
  auto.push({
    key: "referencias",
    label: "As referências existem na base",
    status: broken.length ? "fail" : outside.length ? "warn" : "ok",
    detail: broken.length
      ? broken.map((r) => `${r.label}: ${r.error}`).join(" ")
      : outside.length
        ? `${outside.map((r) => r.label).join(", ")} ${outside.length === 1 ? "fica" : "ficam"} fora da passagem (${input.passageLabel}).`
        : refs.length
          ? `${refs.length} ${refs.length === 1 ? "referência conferida" : "referências conferidas"}.`
          : "Nenhuma referência escrita no esboço além da passagem.",
    refs,
  });

  // 2. No block left blank (the reading block already carries the passage).
  const blank = blocks.filter((b) => b.kind !== "leitura" && !b.text.trim());
  auto.push({
    key: "blocos",
    label: "Nenhum bloco em branco",
    status: blank.length ? "fail" : "ok",
    detail: blank.length ? `Em branco: ${blank.map((b) => b.title).join(", ")}. Escreva ou remova.` : "Todos os blocos têm texto.",
  });

  // 3. The outline fits the available time (a warning, not a blocker).
  const words = blocks.reduce((sum, b) => sum + countWords(b.text), 0) + input.passageWords;
  const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));
  auto.push({
    key: "tempo",
    label: "Cabe no tempo",
    status: minutes > input.duration ? "warn" : "ok",
    detail: `Cerca de ${minutes} min de fala para ${input.duration} min disponíveis.`,
  });

  const manual: ManualCheck[] = [];
  const points = blocks.filter((b) => b.kind === "pontos").flatMap((b) => splitPoints(b.text));
  const seen = new Set<string>();
  points.forEach((point, i) => {
    const key = pointKey(point);
    if (seen.has(key)) return;
    seen.add(key);
    manual.push({ key, label: `O texto sustenta o ponto ${i + 1}`, detail: point, done: checked.has(key) });
  });
  if (blocks.some((b) => b.kind === "aplicacao")) {
    manual.push({ key: "aplicacao", label: "A aplicação nasce dos pontos", done: checked.has("aplicacao") });
  }
  if (blocks.some((b) => b.kind === "perguntas")) {
    manual.push({ key: "perguntas", label: "As perguntas levam de volta ao texto", done: checked.has("perguntas") });
  }
  manual.push({
    key: "releitura",
    label: "Reli o esboço inteiro com a passagem aberta",
    done: checked.has("releitura"),
  });

  const done = manual.filter((m) => m.done).length;
  return {
    auto,
    manual,
    done,
    total: manual.length,
    complete: done === manual.length && auto.every((a) => a.status !== "fail"),
  };
}

/** Ticks that still match an item of the checklist (stale point keys are dropped). */
export function liveChecks(list: Checklist): string[] {
  return list.manual.filter((m) => m.done).map((m) => m.key);
}
