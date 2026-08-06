import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RotateCcw, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PASS_PERCENT } from "@/lib/summer-english";

export interface QuizQuestion {
  id: string;
  question: string;
  options: unknown;
  sort_order: number;
}

export interface QuizData {
  id: string;
  title: string;
  description: string | null;
  pass_score: number;
  quiz_questions?: QuizQuestion[];
}

/** Lesson quiz with instant feedback, immediate score and unlimited retries. */
export function LessonQuiz({
  quiz,
  studentId,
  onPassed,
}: {
  quiz: QuizData;
  studentId: string;
  onPassed?: () => void;
}) {
  const qc = useQueryClient();
  const questions = [...(quiz.quiz_questions ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<Record<string, { is_correct: boolean; correct_index: number }>>({});
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: best } = useQuery({
    queryKey: ["quiz-best", quiz.id, studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("quiz_attempts")
        .select("score, total, taken_at")
        .eq("quiz_id", quiz.id)
        .eq("student_id", studentId)
        .order("score", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  if (!questions.length) return null;

  const answered = questions.filter((q) => answers[q.id] !== undefined).length;
  const liveScore = Object.values(feedback).filter((f) => f.is_correct).length;
  const passMark = Math.ceil((PASS_PERCENT / 100) * questions.length);
  const bestPercent = best?.total ? Math.round((best.score / best.total) * 100) : null;
  const alreadyPassed = bestPercent !== null && bestPercent >= PASS_PERCENT;

  async function pick(qid: string, i: number) {
    if (feedback[qid] !== undefined || result) return;
    setAnswers((a) => ({ ...a, [qid]: i }));
    const { data, error } = await supabase.rpc("check_quiz_answer", { _question_id: qid, _answer: i });
    if (error) return toast.error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    if (row) setFeedback((f) => ({ ...f, [qid]: { is_correct: !!row.is_correct, correct_index: row.correct_index } }));
  }

  async function finish() {
    setBusy(true);
    const { data, error } = await supabase.rpc("submit_quiz", { _quiz_id: quiz.id, _answers: answers });
    setBusy(false);
    if (error) return toast.error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return;
    setResult({ score: row.score, total: row.total });
    qc.invalidateQueries({ queryKey: ["quiz-best", quiz.id] });
    const percent = row.total ? Math.round((row.score / row.total) * 100) : 0;
    if (percent >= PASS_PERCENT) {
      toast.success(`Quiz passed with ${percent}%! 🎉`);
      onPassed?.();
    } else {
      toast.error(`You scored ${percent}%. You need ${PASS_PERCENT}% — try again!`);
    }
  }

  function retry() {
    setAnswers({});
    setFeedback({});
    setResult(null);
  }

  const shownScore = result?.score ?? liveScore;
  const resultPercent = result?.total ? Math.round((result.score / result.total) * 100) : 0;

  return (
    <section className="rounded-2xl border-2 border-navy/15 bg-cream p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 font-display text-xl font-bold text-navy">
          <Target className="h-5 w-5 text-gold-foreground" /> {quiz.title}
        </h3>
        <div className="text-sm font-semibold text-navy">
          Score: <span className="text-gold-foreground">{shownScore}</span> / {questions.length}
        </div>
      </div>
      {quiz.description && <p className="mt-2 text-sm text-muted-foreground">{quiz.description}</p>}
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-navy/70">
        Pass mark {PASS_PERCENT}% ({passMark} of {questions.length}) · unlimited retries
        {bestPercent !== null && ` · best so far ${bestPercent}%`}
        {alreadyPassed && " ✅ passed"}
      </p>

      <ol className="mt-5 space-y-4">
        {questions.map((q, qi) => {
          const chosen = answers[q.id];
          const fb = feedback[q.id];
          const opts: string[] = Array.isArray(q.options) ? (q.options as string[]) : [];
          return (
            <li key={q.id} className="rounded-xl border border-border bg-card p-4">
              <div className="font-semibold text-navy">
                <span className="mr-1 opacity-60">{qi + 1}.</span>
                {q.question}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {opts.map((opt, i) => {
                  const picked = chosen === i;
                  const isCorrect = fb ? i === fb.correct_index : false;
                  const showState = fb !== undefined && (picked || isCorrect);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => pick(q.id, i)}
                      disabled={fb !== undefined || !!result}
                      className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                        showState
                          ? isCorrect
                            ? "border-green-500 bg-green-50 text-green-800"
                            : picked
                              ? "border-red-400 bg-red-50 text-red-800"
                              : "border-border"
                          : picked
                            ? "border-navy bg-navy/5"
                            : "border-border hover:bg-accent"
                      }`}
                    >
                      <span className="mr-2 font-bold">{String.fromCharCode(65 + i)}.</span>
                      {opt}
                      {fb && isCorrect && <span className="ml-2">✓</span>}
                      {picked && fb && !fb.is_correct && <span className="ml-2">✗</span>}
                    </button>
                  );
                })}
              </div>
              {fb && (
                <div className={`mt-2 text-sm font-semibold ${fb.is_correct ? "text-green-700" : "text-red-700"}`}>
                  {fb.is_correct
                    ? "Great job! That's correct 🎉"
                    : `Not quite — the correct answer is ${String.fromCharCode(65 + fb.correct_index)}.`}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {answered === questions.length && !result && (
        <button
          type="button"
          onClick={finish}
          disabled={busy}
          className="mt-5 w-full rounded-xl bg-navy p-3 font-bold text-navy-foreground disabled:opacity-60"
        >
          {busy ? "Submitting…" : "Submit quiz"}
        </button>
      )}

      {result && (
        <div className="mt-5 space-y-3">
          <div
            className={`rounded-xl p-4 text-center font-bold ${
              resultPercent >= PASS_PERCENT
                ? "bg-gold-gradient text-gold-foreground"
                : "border border-red-300 bg-red-50 text-red-800"
            }`}
          >
            {resultPercent >= PASS_PERCENT
              ? `Passed! You scored ${result.score} / ${result.total} (${resultPercent}%) 🌟`
              : `You scored ${result.score} / ${result.total} (${resultPercent}%). You need ${PASS_PERCENT}% — keep practising, you've got this! 💪`}
          </div>
          <button
            type="button"
            onClick={retry}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card p-3 font-semibold text-navy"
          >
            <RotateCcw className="h-4 w-4" /> Try the quiz again
          </button>
        </div>
      )}
    </section>
  );
}
