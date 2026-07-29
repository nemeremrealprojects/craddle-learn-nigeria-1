import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, PlayCircle, FileText, ClipboardList, Award, ChevronRight, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/_authenticated/student/courses/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — Student` }, { name: "robots", content: "noindex" }] }),
  component: StudentCoursePage,
});

function StudentCoursePage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [activeLesson, setActiveLesson] = useState<string | null>(null);

  const { data: course } = useQuery({
    queryKey: ["s-course", slug],
    queryFn: async () => (await supabase.from("courses").select("*").eq("slug", slug).maybeSingle()).data,
  });
  const { data: lessons = [] } = useQuery({
    queryKey: ["s-lessons", course?.id],
    enabled: !!course,
    queryFn: async () => (await supabase.from("lessons").select("*").eq("course_id", course!.id).order("sort_order")).data ?? [],
  });
  const { data: materials = [] } = useQuery({
    queryKey: ["s-materials", course?.id],
    enabled: !!course,
    queryFn: async () => (await supabase.from("materials").select("*").eq("course_id", course!.id).order("sort_order")).data ?? [],
  });
  const { data: quizzes = [] } = useQuery({
    queryKey: ["s-quizzes", course?.id],
    enabled: !!course,
    queryFn: async () => (await supabase.from("quizzes").select("*, quiz_questions(id, quiz_id, question, options, sort_order)").eq("course_id", course!.id)).data ?? [],
  });
  const { data: assignments = [] } = useQuery({
    queryKey: ["s-assignments", course?.id],
    enabled: !!course,
    queryFn: async () => (await supabase.from("assignments").select("*").eq("course_id", course!.id)).data ?? [],
  });
  const { data: progress = [] } = useQuery({
    queryKey: ["s-progress", course?.id, user?.id],
    enabled: !!course && !!user,
    queryFn: async () => (await supabase.from("lesson_progress").select("*").eq("student_id", user!.id).in("lesson_id", (lessons.length ? lessons.map((l: any) => l.id) : ["00000000-0000-0000-0000-000000000000"]))).data ?? [],
  });
  const { data: enrolled } = useQuery({
    queryKey: ["s-enrolled", course?.id, user?.id],
    enabled: !!course && !!user,
    queryFn: async () => !!(await supabase.from("enrollments").select("id").eq("course_id", course!.id).eq("student_id", user!.id).maybeSingle()).data,
  });

  const completed = useMemo(() => new Set(progress.filter((p: any) => p.completed).map((p: any) => p.lesson_id)), [progress]);
  const percent = lessons.length ? Math.round((completed.size / lessons.length) * 100) : 0;
  const current = lessons.find((l: any) => l.id === activeLesson) || lessons[0];

  async function markComplete(lessonId: string) {
    if (!user || !course) return;
    const { error } = await supabase.from("lesson_progress").upsert(
      { student_id: user.id, lesson_id: lessonId, course_id: course.id, completed: true },
      { onConflict: "student_id,lesson_id" }
    );
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["s-progress"] });
    toast.success("Lesson marked complete");

    if (completed.size + 1 === lessons.length) {
      const { error: certErr } = await supabase.rpc("issue_certificate", { _course_id: course.id });
      if (!certErr) toast.success("🎉 Course complete! Your certificate is ready.");
    }
  }

  if (enrolled === false) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 grid place-items-center px-4 text-center">
          <div>
            <h1 className="font-display text-2xl font-bold text-navy">You're not enrolled in this course</h1>
            <button onClick={() => navigate({ to: "/courses/$slug", params: { slug } })} className="mt-4 rounded-lg bg-navy text-navy-foreground px-5 py-2 font-semibold">Enroll now</button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Header />
      <section className="bg-hero text-navy-foreground">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="text-xs font-bold uppercase tracking-widest text-gold">{course?.level}</div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">{course?.title}</h1>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-white/15 overflow-hidden">
              <div className="h-full bg-gold-gradient" style={{ width: `${percent}%` }} />
            </div>
            <span className="text-sm font-semibold text-gold">{percent}% complete</span>
            {percent === 100 && <span className="inline-flex items-center gap-1 text-sm bg-gold-gradient text-gold-foreground px-2 py-1 rounded font-bold"><Award className="h-4 w-4" /> Certificate ready</span>}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl w-full px-4 py-8 grid lg:grid-cols-[300px_1fr] gap-6 flex-1">
        <aside className="rounded-2xl border border-border bg-card p-4 shadow-card h-fit">
          <h3 className="font-semibold text-navy text-sm uppercase tracking-wide">Lessons</h3>
          <ol className="mt-3 space-y-1">
            {lessons.map((l: any, i: number) => {
              const done = completed.has(l.id);
              const isActive = current?.id === l.id;
              return (
                <li key={l.id}>
                  <button
                    onClick={() => setActiveLesson(l.id)}
                    className={`w-full text-left flex items-start gap-2 rounded-lg px-3 py-2 text-sm transition ${isActive ? "bg-navy text-navy-foreground" : "hover:bg-accent"}`}
                  >
                    {done ? <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-gold" /> : <PlayCircle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${isActive ? "text-gold" : "text-muted-foreground"}`} />}
                    <span className="flex-1"><span className="opacity-70 mr-1">{i + 1}.</span>{l.title}</span>
                  </button>
                </li>
              );
            })}
            {lessons.length === 0 && <li className="text-sm text-muted-foreground px-3 py-2">Lessons coming soon.</li>}
          </ol>
          {materials.length > 0 && (
            <>
              <h3 className="mt-6 font-semibold text-navy text-sm uppercase tracking-wide">Materials</h3>
              <ul className="mt-2 space-y-1">
                {materials.map((m: any) => (
                  <li key={m.id}>
                    <a href={m.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent">
                      <FileText className="h-4 w-4 text-gold-foreground" /><span className="flex-1">{m.title}</span><Download className="h-4 w-4 text-muted-foreground" />
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>

        <main className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-card">
          {current ? (
            <>
              <h2 className="font-display text-2xl font-bold text-navy">{current.title}</h2>
              {current.video_url ? (
                <div className="mt-4 aspect-video overflow-hidden rounded-xl bg-black">
                  <VideoPlayer url={current.video_url} />
                </div>
              ) : (
                <div className="mt-4 aspect-video grid place-items-center rounded-xl bg-navy/5 text-muted-foreground">Video coming soon</div>
              )}
              {current.description && <p className="mt-4 text-muted-foreground whitespace-pre-wrap">{current.description}</p>}
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => markComplete(current.id)}
                  disabled={completed.has(current.id)}
                  className="rounded-lg bg-gold-gradient text-gold-foreground font-bold px-5 py-2.5 shadow-gold disabled:opacity-60"
                >
                  {completed.has(current.id) ? "Completed ✓" : "Mark as complete"}
                </button>
                <Link to="/student" className="rounded-lg border border-border px-5 py-2.5 font-semibold">Back to dashboard</Link>
              </div>

              {(() => {
                const idx = lessons.findIndex((l: any) => l.id === current.id);
                const quiz = quizzes[idx];
                const assignment = assignments[idx];
                return (
                  <>
                    {quiz && <QuizBlock quiz={quiz} />}
                    {assignment && (
                      <div className="mt-8 rounded-2xl border-2 border-gold/30 bg-gold/5 p-6">
                        <div className="flex items-center gap-2 text-navy font-display text-xl font-bold">
                          <ClipboardList className="h-5 w-5 text-gold-foreground" /> {assignment.title}
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm md:text-base text-foreground/90">{assignment.instructions}</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground">This course has no lessons published yet. Please check back soon.</p>
            </div>
          )}
        </main>
      </section>
      <Footer />
    </div>
  );
}

function VideoPlayer({ url }: { url: string }) {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
  if (yt) return <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${yt[1]}`} title="Lesson video" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />;
  return <video className="w-full h-full" src={url} controls />;
}

function QuizBlock({ quiz }: { quiz: any }) {
  const questions = [...(quiz.quiz_questions ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<Record<string, { is_correct: boolean; correct_index: number }>>({});
  const [submitted, setSubmitted] = useState<{ score: number; total: number } | null>(null);
  if (!questions.length) return null;
  const answered = questions.filter((q) => answers[q.id] !== undefined).length;
  const liveScore = Object.values(feedback).filter((f) => f.is_correct).length;

  async function pick(qid: string, i: number) {
    if (feedback[qid] !== undefined || submitted) return;
    setAnswers((a) => ({ ...a, [qid]: i }));
    const { data, error } = await supabase.rpc("check_quiz_answer", { _question_id: qid, _answer: i });
    if (error) { toast.error(error.message); return; }
    const row = Array.isArray(data) ? data[0] : data;
    if (row) setFeedback((f) => ({ ...f, [qid]: { is_correct: !!row.is_correct, correct_index: row.correct_index } }));
  }

  async function finish() {
    const { data, error } = await supabase.rpc("submit_quiz", { _quiz_id: quiz.id, _answers: answers });
    if (error) { toast.error(error.message); return; }
    const row = Array.isArray(data) ? data[0] : data;
    if (row) setSubmitted({ score: row.score, total: row.total });
  }

  return (
    <div className="mt-8 rounded-2xl border-2 border-navy/15 bg-cream p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="font-display text-xl font-bold text-navy">🎯 {quiz.title}</div>
        <div className="text-sm font-semibold text-navy">Score: <span className="text-gold-foreground">{submitted?.score ?? liveScore}</span> / {questions.length}</div>
      </div>
      {quiz.description && <p className="mt-2 text-sm text-muted-foreground">{quiz.description}</p>}
      <ol className="mt-5 space-y-5">
        {questions.map((q: any, qi: number) => {
          const chosen = answers[q.id];
          const fb = feedback[q.id];
          const opts: string[] = Array.isArray(q.options) ? q.options : [];
          return (
            <li key={q.id} className="rounded-xl bg-card border border-border p-4">
              <div className="font-semibold text-navy"><span className="mr-1 opacity-60">{qi + 1}.</span>{q.question}</div>
              <div className="mt-3 grid sm:grid-cols-2 gap-2">
                {opts.map((opt, i) => {
                  const picked = chosen === i;
                  const isCorrect = fb ? i === fb.correct_index : false;
                  const showState = fb !== undefined && (picked || isCorrect);
                  return (
                    <button
                      key={i}
                      onClick={() => pick(q.id, i)}
                      disabled={fb !== undefined}
                      className={`text-left rounded-lg border px-3 py-2 text-sm transition ${
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
                      <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
                      {fb && isCorrect && <span className="ml-2">✓</span>}
                      {picked && fb && !fb.is_correct && <span className="ml-2">✗</span>}
                    </button>
                  );
                })}
              </div>
              {fb && (
                <div className={`mt-2 text-sm font-semibold ${fb.is_correct ? "text-green-700" : "text-red-700"}`}>
                  {fb.is_correct ? "Great job! That's correct 🎉" : `Not quite — the correct answer is ${String.fromCharCode(65 + fb.correct_index)}.`}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {answered === questions.length && !submitted && (
        <button onClick={finish} className="mt-5 w-full rounded-xl bg-navy text-navy-foreground font-bold p-3">
          Submit quiz
        </button>
      )}
      {submitted && (
        <div className="mt-5 rounded-xl bg-gold-gradient text-gold-foreground font-bold p-4 text-center">
          You finished the quiz! Final score: {submitted.score} / {submitted.total} {submitted.score === submitted.total ? "— Perfect! 🌟" : submitted.score >= quiz.pass_score ? "— Well done! 👏" : "— Keep practising, you've got this! 💪"}
        </div>
      )}
    </div>
  );
}
