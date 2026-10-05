/** Bank of illustrations and discussion questions. Shared by server and client. */

export type SnippetKind = "ilustracao" | "pergunta";

export type Snippet = {
  id: string;
  kind: SnippetKind;
  body: string;
  topic: string | null;
  bible_ref: string | null;
  source_title: string | null;
  source_url: string | null;
  updated_at: string;
  /** Messages this snippet was inserted into. */
  used_in: string[];
};

export const SNIPPET_KINDS: { id: SnippetKind; name: string; plural: string }[] = [
  { id: "ilustracao", name: "Ilustração", plural: "Ilustrações" },
  { id: "pergunta", name: "Pergunta de discussão", plural: "Perguntas" },
];

export const MAX_SNIPPET_BODY = 4000;

export function isSnippetKind(value: string): value is SnippetKind {
  return value === "ilustracao" || value === "pergunta";
}

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** Filters by kind and by words typed (every word must appear; accents and case ignored). */
export function filterSnippets<T extends Omit<Snippet, "used_in" | "id" | "updated_at">>(list: T[], kind: SnippetKind | null, query: string): T[] {
  const words = fold(query).split(" ").filter(Boolean);
  return list.filter((s) => {
    if (kind && s.kind !== kind) return false;
    const hay = fold([s.body, s.topic, s.bible_ref, s.source_title].filter(Boolean).join(" "));
    return words.every((w) => hay.includes(w));
  });
}

/** Text placed in the outline. An illustration carries its source along. */
export function snippetText(s: Pick<Snippet, "kind" | "body" | "source_title">): string {
  return s.kind === "ilustracao" && s.source_title ? `${s.body.trim()}\n(Fonte: ${s.source_title})` : s.body.trim();
}

/** Appends a snippet to the text of a block. Questions go one per line. */
export function appendSnippet(text: string, s: Pick<Snippet, "kind" | "body" | "source_title">): string {
  const current = text.trimEnd();
  if (!current) return snippetText(s);
  return `${current}${s.kind === "pergunta" ? "\n" : "\n\n"}${snippetText(s)}`;
}

/**
 * What a block of the outline offers to the bank: in a questions block, one
 * question per line (list markers removed); elsewhere, the whole text as one
 * illustration. Bodies already in the bank are left out.
 */
export function snippetsFromBlock(blockKind: string, text: string, existing: Pick<Snippet, "kind" | "body">[]): { kind: SnippetKind; body: string }[] {
  const kind: SnippetKind = blockKind === "perguntas" ? "pergunta" : "ilustracao";
  const bodies =
    kind === "pergunta"
      ? text.split("\n").map((l) => l.replace(/^\s*(?:\d{1,2}\s*[.)]|[-•*])\s*/, "").trim())
      : [text.trim()];
  const known = new Set(existing.filter((s) => s.kind === kind).map((s) => fold(s.body)));
  const out: { kind: SnippetKind; body: string }[] = [];
  for (const body of bodies) {
    if (!body || known.has(fold(body))) continue;
    known.add(fold(body));
    out.push({ kind, body: body.slice(0, MAX_SNIPPET_BODY) });
  }
  return out;
}
