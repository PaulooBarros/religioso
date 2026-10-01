export type Testament = "OT" | "NT";

export type Book = {
  id: number;
  /** Book code used by the eBible VPL files (e.g. "ROM"). */
  code: string;
  name: string;
  abbrev: string;
  /** URL slug, e.g. "romanos", "1-corintios". */
  slug: string;
  testament: Testament;
  /** English name, used to build "read in another version" links. */
  en: string;
  /** Extra abbreviations accepted by the reference parser. */
  aliases?: string[];
};

type Row = [code: string, name: string, abbrev: string, en: string, aliases?: string[]];

const ROWS: Row[] = [
  ["GEN", "Gênesis", "Gn", "Genesis", ["gen"]],
  ["EXO", "Êxodo", "Êx", "Exodus", ["exo"]],
  ["LEV", "Levítico", "Lv", "Leviticus", ["lev"]],
  ["NUM", "Números", "Nm", "Numbers", ["num"]],
  ["DEU", "Deuteronômio", "Dt", "Deuteronomy", ["deut"]],
  ["JOS", "Josué", "Js", "Joshua", ["jos"]],
  ["JDG", "Juízes", "Jz", "Judges", ["jui"]],
  ["RUT", "Rute", "Rt", "Ruth"],
  ["1SA", "1 Samuel", "1Sm", "1 Samuel", ["1sa", "1sam"]],
  ["2SA", "2 Samuel", "2Sm", "2 Samuel", ["2sa", "2sam"]],
  ["1KI", "1 Reis", "1Rs", "1 Kings", ["1re"]],
  ["2KI", "2 Reis", "2Rs", "2 Kings", ["2re"]],
  ["1CH", "1 Crônicas", "1Cr", "1 Chronicles", ["1cro"]],
  ["2CH", "2 Crônicas", "2Cr", "2 Chronicles", ["2cro"]],
  ["EZR", "Esdras", "Ed", "Ezra", ["esd"]],
  ["NEH", "Neemias", "Ne", "Nehemiah", ["nee"]],
  ["EST", "Ester", "Et", "Esther", ["est"]],
  ["JOB", "Jó", "Jó", "Job", ["job"]],
  ["PSA", "Salmos", "Sl", "Psalms", ["sal", "salmo"]],
  ["PRO", "Provérbios", "Pv", "Proverbs", ["pr", "prov"]],
  ["ECC", "Eclesiastes", "Ec", "Ecclesiastes", ["ecl"]],
  ["SOL", "Cânticos", "Ct", "Song of Songs", ["cantares", "cantico", "cant"]],
  ["ISA", "Isaías", "Is", "Isaiah", ["isa"]],
  ["JER", "Jeremias", "Jr", "Jeremiah", ["jer"]],
  ["LAM", "Lamentações", "Lm", "Lamentations", ["lam"]],
  ["EZE", "Ezequiel", "Ez", "Ezekiel", ["eze"]],
  ["DAN", "Daniel", "Dn", "Daniel", ["dan"]],
  ["HOS", "Oseias", "Os", "Hosea", ["ose", "oseias"]],
  ["JOE", "Joel", "Jl", "Joel"],
  ["AMO", "Amós", "Am", "Amos"],
  ["OBA", "Obadias", "Ob", "Obadiah", ["abd", "abdias"]],
  ["JON", "Jonas", "Jn", "Jonah"],
  ["MIC", "Miqueias", "Mq", "Micah", ["miq"]],
  ["NAH", "Naum", "Na", "Nahum"],
  ["HAB", "Habacuque", "Hc", "Habakkuk", ["hab"]],
  ["ZEP", "Sofonias", "Sf", "Zephaniah", ["sof"]],
  ["HAG", "Ageu", "Ag", "Haggai"],
  ["ZEC", "Zacarias", "Zc", "Zechariah", ["zac"]],
  ["MAL", "Malaquias", "Ml", "Malachi", ["mal"]],
  ["MAT", "Mateus", "Mt", "Matthew", ["mat"]],
  ["MAR", "Marcos", "Mc", "Mark", ["mar"]],
  ["LUK", "Lucas", "Lc", "Luke", ["luc"]],
  ["JOH", "João", "Jo", "John", ["joa"]],
  ["ACT", "Atos", "At", "Acts", ["ato"]],
  ["ROM", "Romanos", "Rm", "Romans", ["rom"]],
  ["1CO", "1 Coríntios", "1Co", "1 Corinthians", ["1cor"]],
  ["2CO", "2 Coríntios", "2Co", "2 Corinthians", ["2cor"]],
  ["GAL", "Gálatas", "Gl", "Galatians", ["gal"]],
  ["EPH", "Efésios", "Ef", "Ephesians", ["efe"]],
  ["PHI", "Filipenses", "Fp", "Philippians", ["fil"]],
  ["COL", "Colossenses", "Cl", "Colossians", ["col"]],
  ["1TH", "1 Tessalonicenses", "1Ts", "1 Thessalonians", ["1tes"]],
  ["2TH", "2 Tessalonicenses", "2Ts", "2 Thessalonians", ["2tes"]],
  ["1TI", "1 Timóteo", "1Tm", "1 Timothy", ["1tim"]],
  ["2TI", "2 Timóteo", "2Tm", "2 Timothy", ["2tim"]],
  ["TIT", "Tito", "Tt", "Titus", ["tit"]],
  ["PHM", "Filemom", "Fm", "Philemon", ["flm", "filemon"]],
  ["HEB", "Hebreus", "Hb", "Hebrews", ["heb"]],
  ["JAM", "Tiago", "Tg", "James", ["tia"]],
  ["1PE", "1 Pedro", "1Pe", "1 Peter", ["1ped"]],
  ["2PE", "2 Pedro", "2Pe", "2 Peter", ["2ped"]],
  ["1JO", "1 João", "1Jo", "1 John", ["1joa"]],
  ["2JO", "2 João", "2Jo", "2 John", ["2joa"]],
  ["3JO", "3 João", "3Jo", "3 John", ["3joa"]],
  ["JUD", "Judas", "Jd", "Jude", ["jud"]],
  ["REV", "Apocalipse", "Ap", "Revelation", ["apo"]],
];

/** Lowercase, strip accents and spaces: "1 Coríntios" -> "1corintios". */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[\s.]+/g, "");
}

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

export const BOOKS: Book[] = ROWS.map(([code, name, abbrev, en, aliases], i) => ({
  id: i + 1,
  code,
  name,
  abbrev,
  slug: slugify(name),
  testament: i < 39 ? "OT" : "NT",
  en,
  aliases,
}));

const byId = new Map(BOOKS.map((b) => [b.id, b]));
const bySlug = new Map(BOOKS.map((b) => [b.slug, b]));
const byCode = new Map(BOOKS.map((b) => [b.code, b]));

// Lookup table for the parser. Order matters for ambiguous keys: the first
// book to claim a key keeps it ("jo" is João, "jó" normalizes to "jo" too, so
// Jó is reachable through its full name "jó" only via the "job" alias).
const byKey = new Map<string, Book>();
for (const b of BOOKS) {
  for (const k of [b.abbrev, b.name, b.slug, ...(b.aliases ?? [])]) {
    const key = normalize(k);
    if (!byKey.has(key)) byKey.set(key, b);
  }
}
// Jó and João share the normalized abbreviation "jo"; João wins (far more
// common in references), Jó stays reachable by "job" or the accented name.
byKey.set("jo", byCode.get("JOH")!);

export function bookById(id: number): Book | undefined {
  return byId.get(id);
}

export function bookBySlug(slug: string): Book | undefined {
  return bySlug.get(slug);
}

export function bookByCode(code: string): Book | undefined {
  return byCode.get(code);
}

/** Resolve a user-typed book name or abbreviation. */
export function findBook(input: string): Book | undefined {
  const raw = input.trim().toLowerCase();
  if (raw === "jó") return byCode.get("JOB");
  const key = normalize(input);
  const exact = byKey.get(key);
  if (exact) return exact;
  // Unambiguous prefix of a full name: "roma" -> Romanos.
  if (key.length >= 3) {
    const hits = BOOKS.filter((b) => normalize(b.name).startsWith(key));
    if (hits.length === 1) return hits[0];
  }
  return undefined;
}
