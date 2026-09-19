import { useState } from "react";
import { CheckCircle2, HelpCircle } from "lucide-react";
import type { ActivityQuestion } from "@/lib/p6-reading";
import { Button } from "@/components/ui/button";

/**
 * Practice multiple-choice questions with instant feedback.
 * These are learning activities (not the graded quiz), so answers are checked
 * in the page and nothing is recorded against the student's score.
 */
export function ReadingActivity({
  heading,
  intro,
  questions,
}: {
  heading: string;
  intro?: string;
  questions: ActivityQuestion[];
}) {
  const [picked, setPicked] = useState<Record<number, number>>({});

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
      <h2 className="inline-flex items-center gap-2 font-display text-xl font-bold text-navy">
        <HelpCircle className="h-5 w-5 text-gold-foreground" /> {heading}
      </h2>
      {intro && <p className="mt-2 text-sm text-muted-foreground">{intro}</p>}

      <ol className="mt-4 space-y-4">
        {questions.map((q, qi) => {
          const choice = picked[qi];
          const answered = choice !== undefined;
          const correct = answered && choice === q.correctIndex;
          return (
            <li key={q.question} className="rounded-xl border border-border bg-cream/60 p-4">
              <p className="font-semibold text-navy">
                <span className="mr-1 opacity-60">{qi + 1}.</span>
                {q.question}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {q.options.map((opt, i) => {
                  const isPicked = choice === i;
                  const isAnswer = i === q.correctIndex;
                  const show = answered && (isPicked || isAnswer);
                  return (
                    <Button
                      key={opt}
                      type="button"
                      onClick={() => setPicked((p) => ({ ...p, [qi]: i }))}
                      disabled={answered}
                      variant="outline"
                      className={`h-auto min-h-11 justify-start whitespace-normal px-3 py-2 text-left text-sm ${
                        show
                          ? isAnswer
                            ? "border-green-500 bg-green-50 text-green-800"
                            : "border-red-400 bg-red-50 text-red-800"
                          : "bg-card"
                      }`}
                    >
                      <span className="mr-2 font-bold">{String.fromCharCode(65 + i)}.</span>
                      {opt}
                    </Button>
                  );
                })}
              </div>
              {answered && (
                <p className={`mt-2 text-sm font-semibold ${correct ? "text-green-700" : "text-red-700"}`}>
                  {correct
                    ? "Correct! Well reasoned 🎉"
                    : `Not quite — the correct answer is ${String.fromCharCode(65 + q.correctIndex)}.`}
                </p>
              )}
              {answered && q.explanation && (
                <p className="mt-1 inline-flex items-start gap-1.5 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-gold-foreground" />
                  {q.explanation}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
