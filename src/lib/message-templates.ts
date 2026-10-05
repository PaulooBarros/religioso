/** Structure templates of a cell-group message. Shared by server and client. */

export type BlockKind = "abertura" | "leitura" | "contexto" | "pontos" | "aplicacao" | "perguntas" | "oracao" | "livre";

export type MessageBlock = { id: string; kind: BlockKind; title: string; text: string };

export type TemplateId = "expositiva" | "tematica" | "narrativa";

type TemplateBlock = { kind: Exclude<BlockKind, "livre">; title: string; hint: string };

export type Template = { id: TemplateId; name: string; summary: string; blocks: TemplateBlock[] };

const OPENING: TemplateBlock = {
  kind: "abertura",
  title: "Abertura",
  hint: "Uma pergunta ou situação do dia a dia que leve o grupo ao assunto do texto.",
};
const APPLICATION: TemplateBlock = {
  kind: "aplicacao",
  title: "Aplicação",
  hint: "O que muda nesta semana, para o grupo e para cada um, à luz dos pontos acima.",
};
const QUESTIONS: TemplateBlock = {
  kind: "perguntas",
  title: "Perguntas para discussão",
  hint: "Uma pergunta por linha. Prefira perguntas abertas, que levem o grupo de volta ao texto.",
};
const PRAYER: TemplateBlock = {
  kind: "oracao",
  title: "Oração",
  hint: "Motivos de gratidão e de pedido que nascem do texto e das necessidades do grupo.",
};

export const TEMPLATES: Template[] = [
  {
    id: "expositiva",
    name: "Expositiva",
    summary: "Segue a passagem na ordem em que ela foi escrita, trecho por trecho.",
    blocks: [
      OPENING,
      { kind: "leitura", title: "Leitura", hint: "Como será a leitura: em voz alta, por quantos leitores, com que ênfase." },
      { kind: "contexto", title: "Contexto", hint: "Quem escreve, para quem, e o que vem antes e depois da passagem." },
      { kind: "pontos", title: "Pontos principais", hint: "Um ponto por trecho, na ordem do texto, numerados (1., 2., 3.) e com os versículos que sustentam cada um." },
      APPLICATION,
      QUESTIONS,
      PRAYER,
    ],
  },
  {
    id: "tematica",
    name: "Temática",
    summary: "Parte de um tema e reúne o que a passagem-base e outros textos dizem sobre ele.",
    blocks: [
      OPENING,
      { kind: "leitura", title: "Leitura do texto-base", hint: "O texto-base e, se houver, os outros textos que serão lidos." },
      { kind: "contexto", title: "O tema", hint: "O que o tema significa e por que o texto-base é um bom ponto de partida." },
      { kind: "pontos", title: "Pontos principais", hint: "Um aspecto do tema por ponto, numerados (1., 2., 3.), cada um apoiado em um texto bíblico." },
      APPLICATION,
      QUESTIONS,
      PRAYER,
    ],
  },
  {
    id: "narrativa",
    name: "Narrativa",
    summary: "Acompanha uma história bíblica cena por cena, até o desfecho.",
    blocks: [
      OPENING,
      { kind: "leitura", title: "Leitura", hint: "Como a história será lida ou contada ao grupo." },
      { kind: "contexto", title: "Cenário", hint: "Quem são os personagens, onde e quando a história acontece, e o que veio antes." },
      { kind: "pontos", title: "A história em cenas", hint: "Situação, tensão, virada e desfecho: cenas numeradas (1., 2., 3.), cada uma com os seus versículos." },
      APPLICATION,
      QUESTIONS,
      PRAYER,
    ],
  },
];

export function templateOf(id: string): Template {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

export function isTemplateId(id: string): id is TemplateId {
  return TEMPLATES.some((t) => t.id === id);
}

export const BLOCK_KINDS: BlockKind[] = ["abertura", "leitura", "contexto", "pontos", "aplicacao", "perguntas", "oracao", "livre"];

/** Empty blocks of a template, ready for a new message. */
export function blocksFor(id: TemplateId, makeId: () => string): MessageBlock[] {
  return templateOf(id).blocks.map((b) => ({ id: makeId(), kind: b.kind, title: b.title, text: "" }));
}

/** Writing hint for a block, according to the template in use. */
export function hintFor(template: string, kind: BlockKind): string {
  return templateOf(template).blocks.find((b) => b.kind === kind)?.hint ?? "Texto livre.";
}

/**
 * When the template changes, blocks that still carry the old template's
 * default title take the new one. Titles edited by the owner are kept.
 */
export function retitle(blocks: MessageBlock[], from: string, to: string): MessageBlock[] {
  const before = templateOf(from);
  const after = templateOf(to);
  return blocks.map((b) => {
    const old = before.blocks.find((t) => t.kind === b.kind);
    const next = after.blocks.find((t) => t.kind === b.kind);
    return old && next && b.title === old.title ? { ...b, title: next.title } : b;
  });
}

export const MAX_BLOCKS = 20;
export const MAX_BLOCK_TEXT = 20_000;

/** Speaking pace used for the time estimate. */
export const WORDS_PER_MINUTE = 130;

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/** Validates blocks coming from the client or the database. */
export function parseBlocks(value: unknown): MessageBlock[] | null {
  if (!Array.isArray(value) || value.length > MAX_BLOCKS) return null;
  const out: MessageBlock[] = [];
  const seen = new Set<string>();
  for (const v of value) {
    if (!v || typeof v !== "object") return null;
    const { id, kind, title, text } = v as Record<string, unknown>;
    if (typeof id !== "string" || !id || id.length > 64 || seen.has(id)) return null;
    if (typeof kind !== "string" || !BLOCK_KINDS.includes(kind as BlockKind)) return null;
    if (typeof title !== "string" || typeof text !== "string" || text.length > MAX_BLOCK_TEXT) return null;
    seen.add(id);
    out.push({ id, kind: kind as BlockKind, title: title.trim().slice(0, 80) || "Bloco", text });
  }
  return out;
}
