import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Exam = {
  id: string;
  theme_ids: string[];
  time_limit_min: number | null;
  status: "running" | "finished" | "abandoned";
  total: number;
  score: number | null;
  started_at: string;
  finished_at: string | null;
};

export type ExamAnswer = {
  position: number;
  item_id: string | null;
  theme_id: string | null;
  prompt: string;
  options: string[];
  correct_option: number;
  explanation: string | null;
  source_title: string | null;
  source_url: string | null;
  chosen: number | null;
  flagged: boolean;
  is_correct: boolean | null;
};

const EXAM_COLUMNS = "id, theme_ids, time_limit_min, status, total, score, started_at, finished_at";
const ANSWER_COLUMNS =
  "position, item_id, theme_id, prompt, options, correct_option, explanation, source_title, source_url, chosen, flagged, is_correct";

export type ThemeOption = { id: string; name: string; available: number };

/** Themes that have approved multiple-choice questions, with how many. */
export async function getExamThemes(profileId: string): Promise<{ themes: ThemeOption[]; total: number }> {
  const supabase = await createClient();
  const [{ data: themes }, { data: items }] = await Promise.all([
    supabase.from("themes").select("id, name").is("parent_id", null).order("position"),
    supabase.from("study_items").select("theme_id").eq("profile_id", profileId).eq("kind", "mcq").eq("status", "approved"),
  ]);
  const count = (id: string) => (items ?? []).filter((i) => i.theme_id === id).length;
  return {
    themes: (themes ?? []).map((t) => ({ id: t.id, name: t.name, available: count(t.id) })).filter((t) => t.available > 0),
    total: (items ?? []).length,
  };
}

export async function getExams(profileId: string): Promise<Exam[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("exams")
    .select(EXAM_COLUMNS)
    .eq("profile_id", profileId)
    .neq("status", "abandoned")
    .order("started_at", { ascending: false });
  return (data ?? []) as Exam[];
}

export async function getExam(profileId: string, id: string): Promise<{ exam: Exam; answers: ExamAnswer[] } | null> {
  const supabase = await createClient();
  const [{ data: exam }, { data: answers }] = await Promise.all([
    supabase.from("exams").select(EXAM_COLUMNS).eq("id", id).eq("profile_id", profileId).maybeSingle(),
    supabase.from("exam_answers").select(ANSWER_COLUMNS).eq("exam_id", id).order("position"),
  ]);
  if (!exam) return null;
  return { exam: exam as Exam, answers: (answers ?? []) as ExamAnswer[] };
}

export type ThemeResult = { themeId: string | null; correct: number; total: number; percent: number };

export function resultsByTheme(answers: Pick<ExamAnswer, "theme_id" | "is_correct">[]): ThemeResult[] {
  const map = new Map<string | null, { correct: number; total: number }>();
  for (const a of answers) {
    const r = map.get(a.theme_id) ?? { correct: 0, total: 0 };
    r.total++;
    if (a.is_correct) r.correct++;
    map.set(a.theme_id, r);
  }
  return [...map.entries()].map(([themeId, r]) => ({ themeId, ...r, percent: Math.round((r.correct / r.total) * 100) }));
}

/** Below this accuracy in the latest exam, a theme gets priority in the daily review. */
export const WEAK_THRESHOLD = 70;
/** The priority lasts this many days after the exam (or until a newer exam). */
export const WEAK_DAYS = 7;

export type WeakTheme = { themeId: string; name: string; percent: number; correct: number; total: number };

/** Themes of the latest finished exam below the threshold, weakest first. */
export async function getWeakThemes(profileId: string): Promise<WeakTheme[]> {
  const supabase = await createClient();
  const { data: exam } = await supabase
    .from("exams")
    .select("id, finished_at, exam_answers(theme_id, is_correct)")
    .eq("profile_id", profileId)
    .eq("status", "finished")
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!exam?.finished_at) return [];
  if (Date.now() - new Date(exam.finished_at as string).getTime() > WEAK_DAYS * 86_400_000) return [];

  const weak = resultsByTheme(exam.exam_answers as Pick<ExamAnswer, "theme_id" | "is_correct">[])
    .filter((r) => r.themeId && r.percent < WEAK_THRESHOLD)
    .sort((a, b) => a.percent - b.percent || b.total - a.total);
  if (!weak.length) return [];

  const { data: themes } = await supabase
    .from("themes")
    .select("id, name")
    .in("id", weak.map((r) => r.themeId as string));
  return weak.map((r) => ({
    themeId: r.themeId as string,
    name: themes?.find((t) => t.id === r.themeId)?.name ?? "Tema",
    percent: r.percent,
    correct: r.correct,
    total: r.total,
  }));
}

export type Trend ="subindo" | "caindo" | "estável" | "primeira medição";

export type Diagnosis = ThemeResult & { exams: number; trend: Trend; lastPercent: number };

/** Accuracy per theme over all finished exams, with the trend between the last two. */
export async function getDiagnosis(profileId: string): Promise<Diagnosis[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("exams")
    .select("id, finished_at, exam_answers(theme_id, is_correct)")
    .eq("profile_id", profileId)
    .eq("status", "finished")
    .order("finished_at");
  const exams = (data ?? []) as { id: string; exam_answers: Pick<ExamAnswer, "theme_id" | "is_correct">[] }[];

  const perTheme = new Map<string | null, { correct: number; total: number; history: number[] }>();
  for (const exam of exams) {
    for (const r of resultsByTheme(exam.exam_answers)) {
      const t = perTheme.get(r.themeId) ?? { correct: 0, total: 0, history: [] };
      t.correct += r.correct;
      t.total += r.total;
      t.history.push(r.percent);
      perTheme.set(r.themeId, t);
    }
  }
  return [...perTheme.entries()]
    .map(([themeId, t]) => {
      const last = t.history[t.history.length - 1];
      const before = t.history[t.history.length - 2];
      const trend: Trend =
        before === undefined ? "primeira medição" : last - before >= 10 ? "subindo" : before - last >= 10 ? "caindo" : "estável";
      return {
        themeId,
        correct: t.correct,
        total: t.total,
        percent: Math.round((t.correct / t.total) * 100),
        exams: t.history.length,
        trend,
        lastPercent: last,
      };
    })
    .sort((a, b) => a.percent - b.percent);
}
