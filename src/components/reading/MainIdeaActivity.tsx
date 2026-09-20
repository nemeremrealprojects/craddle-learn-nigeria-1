import { useEffect, useState } from "react";
import { CheckCircle2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

export type MainIdeaChoice = "main" | "detail";

export interface MainIdeaStatement {
  text: string;
  answer: MainIdeaChoice;
}

export function MainIdeaActivity({
  statements,
  initialAnswers,
  completed,
  saving,
  onSubmit,
}: {
  statements: MainIdeaStatement[];
  initialAnswers: Record<number, MainIdeaChoice>;
  completed: boolean;
  saving: boolean;
  onSubmit: (answers: Record<number, MainIdeaChoice>) => Promise<void>;
}) {
  const [answers, setAnswers] = useState<Record<number, MainIdeaChoice>>(initialAnswers);
  const [submitted, setSubmitted] = useState(completed);

  useEffect(() => {
    setAnswers(initialAnswers);
    setSubmitted(completed);
  }, [initialAnswers, completed]);

  const answeredCount = statements.filter((_, index) => answers[index]).length;
  const score = statements.filter((statement, index) => answers[index] === statement.answer).length;

  async function submit() {
    await onSubmit(answers);
    setSubmitted(true);
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
      <h2 className="font-display text-xl font-bold uppercase text-navy">Main idea or detail?</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Decide whether each statement is the main idea or a supporting detail, then submit your answers.
      </p>
      <ol className="mt-5 space-y-4">
        {statements.map((statement, index) => {
          const selected = answers[index];
          const correct = selected === statement.answer;
          return (
            <li key={statement.text} className="rounded-lg border border-border bg-cream/60 p-4">
              <p className="font-semibold text-navy"><span className="mr-1 opacity-60">{index + 1}.</span>{statement.text}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(["main", "detail"] as const).map((choice) => (
                  <Button
                    key={choice}
                    type="button"
                    variant="outline"
                    disabled={submitted}
                    onClick={() => setAnswers((current) => ({ ...current, [index]: choice }))}
                    className={`min-h-11 whitespace-normal ${selected === choice ? "border-navy bg-navy/5" : "bg-card"}`}
                  >
                    {choice === "main" ? "Main idea" : "Supporting detail"}
                  </Button>
                ))}
              </div>
              {submitted && (
                <p className={`mt-2 text-sm font-semibold ${correct ? "text-green-700" : "text-red-700"}`}>
                  {correct ? "Correct ✓" : `Correct answer: ${statement.answer === "main" ? "Main idea" : "Supporting detail"}.`}
                </p>
              )}
            </li>
          );
        })}
      </ol>
      {submitted ? (
        <div className="mt-5 rounded-lg bg-gold/10 p-4 text-center text-navy">
          <CheckCircle2 className="mx-auto h-5 w-5 text-gold-foreground" />
          <p className="mt-1 font-bold">Activity complete — {score}/{statements.length} correct</p>
          <p className="mt-1 text-sm text-muted-foreground">Your responses have been saved.</p>
        </div>
      ) : (
        <Button
          type="button"
          disabled={answeredCount !== statements.length || saving}
          onClick={submit}
          className="mt-5 h-11 w-full bg-navy font-bold text-navy-foreground sm:w-auto"
        >
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Submit activity"}
        </Button>
      )}
    </section>
  );
}