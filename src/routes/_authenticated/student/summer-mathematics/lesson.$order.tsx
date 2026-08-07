import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  LayoutDashboard,
  Loader2,
  Target,
  BookMarked,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth-context";
import { PASS_PERCENT } from "@/lib/summer-english";
import { NUMBER_VOCABULARY, SUMMER_MATHS_SLUG } from "@/lib/summer-maths";
import { YouTubeEmbed } from "@/components/summer/YouTubeEmbed";
import { NumberCards } from "@/components/summer/NumberCards";
import { LessonQuiz, type QuizData } from "@/components/summer/LessonQuiz";
import { AssignmentUpload, type AssignmentData } from "@/components/summer/AssignmentUpload";
import {
  markLessonCompleted,
  touchLesson,
  useSummerCourse,
  useSummerEnrollment,
  useSummerLessons,
  useSummerProgress,
  useTimeTracker,
} from "@/hooks/use-summer-course";

export const Route = createFileRoute("/_authenticated/student/summer-mathematics/lesson/$order")({
  head: ({ params }) => ({
    meta: [
      { title: `Lesson ${params.order} — Summer Mathematics | CRF Online Academy` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SummerMathsLessonPage,
});

function SummerMathsLessonPage() {
  const { order } = Route.useParams();
  const orderNum = Number(order);
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: course, isLoading: loadingCourse } = useSummerCourse(SUMMER_MATHS_SLUG);
  const { data: enrollment, isLoading: loadingEnroll } = useSummerEnrollment(course?.id, user?.id);
  const { data: lessons = [] } = useSummerLessons(course?.id);
  const { data: progress = [] } = useSummerProgress(course?.id, user?.id);

  const lesson = useMemo(() => lessons.find((l) => l.sort_order === orderNum) ?? null, [lessons, orderNum]);
  const index = lesson ? lessons.findIndex((l) => l.id === lesson.id) : -1;
  const prev = index > 0 ? lessons[index - 1] : null;
  const next = index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : null;

  const { data: quiz } = useQuery({
    queryKey: ["summer-quiz", lesson?.id],
    enabled: !!lesson,
    queryFn: async () => {
      const { data } = await supabase
        .from("quizzes")
        .select("id, title, description, pass_score, quiz_questions(id, question, options, sort_order)")
        .eq("lesson_id", lesson!.id)
        .maybeSingle();
      return (data as QuizData | null) ?? null;
    },
  });

  const { data: assignment } = useQuery({
    queryKey: ["summer-assignment", lesson?.id],
    enabled: !!lesson,
    queryFn: async () => {
      const { data } = await supabase
        .from("assignments")
        .select("id, title, instructions, due_date")
        .eq("lesson_id", lesson!.id)
        .maybeSingle();
      return (data as AssignmentData | null) ?? null;
    },
  });

  const { data: materials = [] } = useQuery({
    queryKey: ["summer-materials", lesson?.id],
    enabled: !!lesson,
    queryFn: async () => {
      const { data } = await supabase
        .from("materials")
        .select("id, title, description, file_url")
        .eq("lesson_id", lesson!.id)
        .order("sort_order");
      return data ?? [];
    },
  });

  const { data: bestAttempt } = useQuery({
    queryKey: ["quiz-best", quiz?.id, user?.id],
    enabled: !!quiz && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("quiz_attempts")
        .select("score, total")
        .eq("quiz_id", quiz!.id)
        .eq("student_id", user!.id)
        .order("score", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: submission } = useQuery({
    queryKey: ["submission", assignment?.id, user?.id],
    enabled: !!assignment && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("submissions")
        .select("id, status, score, feedback, submitted_at, file_url")
        .eq("assignment_id", assignment!.id)
        .eq("student_id", user!.id)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // Record "last lesson viewed" and track time spent.
  useEffect(() => {
    if (!user || !course || !lesson) return;
    void touchLesson(user.id, course.id, lesson.id).then(() => {
      qc.invalidateQueries({ queryKey: ["summer-progress"] });
    });
  }, [user, course, lesson, qc]);
  useTimeTracker(user?.id, lesson?.id);

  const quizPassed =
    !quiz ||
    (!!bestAttempt?.total && Math.round((bestAttempt.score / bestAttempt.total) * 100) >= PASS_PERCENT);
  const assignmentDone = !assignment || !!submission;
  const alreadyCompleted = !!progress.find((p) => p.lesson_id === lesson?.id && p.completed);
  const lessonComplete = quizPassed && assignmentDone;

  // Auto-record completion once the quiz is passed and the assignment submitted.
  useEffect(() => {
    if (!user || !course || !lesson) return;
    if (lessonComplete && !alreadyCompleted) {
      void markLessonCompleted(user.id, course.id, lesson.id).then(() => {
        qc.invalidateQueries({ queryKey: ["summer-progress"] });
      });
    }
  }, [lessonComplete, alreadyCompleted, user, course, lesson, qc]);

  if (loadingCourse || loadingEnroll) {
    return (
      <div className="flex min-h-screen flex-col bg-cream">
        <Header />
        <div className="grid flex-1 place-items-center">
          <Loader2 className="h-7 w-7 animate-spin text-navy" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!enrollment) {
    return (
      <div className="flex min-h-screen flex-col bg-cream">
        <Header />
        <div className="grid flex-1 place-items-center px-4 py-16 text-center">
          <div>
            <h1 className="font-display text-2xl font-bold text-navy">This lesson is locked</h1>
            <p className="mt-2 text-muted-foreground">
              Enroll in Summer Mathematics Lessons for ₦3,000 to unlock it.
            </p>
            <button
              onClick={() => navigate({ to: "/courses/$slug", params: { slug: SUMMER_MATHS_SLUG } })}
              className="mt-5 rounded-lg bg-gold-gradient px-6 py-3 font-bold text-gold-foreground shadow-gold"
            >
              Enroll now
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex min-h-screen flex-col bg-cream">
        <Header />
        <div className="grid flex-1 place-items-center px-4 py-16 text-center">
          <div>
            <h1 className="font-display text-2xl font-bold text-navy">Lesson not available yet</h1>
            <p className="mt-2 text-muted-foreground">This lesson hasn't been published. Please check back soon.</p>
            <Link
              to="/student/summer-mathematics"
              className="mt-5 inline-block rounded-lg bg-navy px-6 py-3 font-semibold text-navy-foreground"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const vocabulary = (lesson.vocabulary ?? []).map((word) => ({
    word,
    meaning: NUMBER_VOCABULARY.find((v) => v.word.toLowerCase() === word.toLowerCase())?.meaning ?? null,
  }));

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <Header />

      <section className="bg-hero text-navy-foreground">
        <div className="mx-auto max-w-4xl px-4 py-7 sm:py-9">
          {lesson.module_title && (
            <p className="text-xs font-bold uppercase tracking-widest text-gold">{lesson.module_title}</p>
          )}
          <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl md:text-4xl">
            Lesson {lesson.sort_order}: {lesson.title}
          </h1>
          {lesson.description && <p className="mt-2 text-sm text-navy-foreground/80">{lesson.description}</p>}
          {(alreadyCompleted || lessonComplete) && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gold-gradient px-3 py-1.5 text-sm font-bold text-gold-foreground">
              <CheckCircle2 className="h-4 w-4" /> Lesson Completed
            </p>
          )}
        </div>
      </section>

      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-6 sm:py-8">
        {/* Objectives */}
        {lesson.objectives && lesson.objectives.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
            <h2 className="inline-flex items-center gap-2 font-display text-xl font-bold text-navy">
              <Target className="h-5 w-5 text-gold-foreground" /> Learning objectives
            </h2>
            <ul className="mt-3 space-y-2">
              {lesson.objectives.map((o) => (
                <li key={o} className="flex gap-2 text-sm text-foreground/90 sm:text-base">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-gold-foreground" />
                  {o}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Video — privacy-enhanced, lazy-loaded, plays inside the lesson page */}
        {lesson.video_url && (
          <section className="overflow-hidden rounded-[20px] border border-border bg-card shadow-elegant">
            <div className="aspect-video bg-black">
              <YouTubeEmbed url={lesson.video_url} title={lesson.title} poster={lesson.thumbnail_url} />
            </div>
          </section>
        )}

        {/* Notes */}
        {lesson.notes && (
          <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
            <h2 className="inline-flex items-center gap-2 font-display text-xl font-bold text-navy">
              <BookMarked className="h-5 w-5 text-gold-foreground" /> Lesson notes
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 sm:text-base">
              {lesson.notes}
            </p>
          </section>
        )}

        {/* Vocabulary with child-friendly meanings */}
        {vocabulary.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
            <h2 className="font-display text-xl font-bold text-navy">Vocabulary</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {vocabulary.map((v) => (
                <li key={v.word} className="rounded-xl border border-gold/40 bg-gold/5 p-3">
                  <span className="block font-semibold text-navy">{v.word}</span>
                  {v.meaning && <span className="mt-0.5 block text-sm text-muted-foreground">{v.meaning}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Fun activity — number cards (Lesson 1) */}
        {lesson.sort_order === 1 && <NumberCards />}

        {/* Worksheet */}
        {materials.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
            <h2 className="font-display text-xl font-bold text-navy">Worksheet</h2>
            <ul className="mt-3 space-y-2">
              {materials.map((m: any) => (
                <li key={m.id}>
                  <a
                    href={m.file_url}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="flex items-center gap-3 rounded-xl border border-border p-3 transition hover:bg-accent"
                  >
                    <Download className="h-5 w-5 flex-shrink-0 text-gold-foreground" />
                    <span className="flex-1">
                      <span className="block font-semibold text-navy">{m.title}</span>
                      {m.description && <span className="block text-sm text-muted-foreground">{m.description}</span>}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Quiz */}
        {quiz && user && (
          <LessonQuiz
            quiz={quiz}
            studentId={user.id}
            onPassed={() => qc.invalidateQueries({ queryKey: ["quiz-best", quiz.id] })}
          />
        )}

        {/* Assignment */}
        {assignment && user && (
          <AssignmentUpload
            assignment={assignment}
            studentId={user.id}
            onSubmitted={() => qc.invalidateQueries({ queryKey: ["submission", assignment.id] })}
          />
        )}

        {/* Completion */}
        <section
          className={`rounded-2xl border-2 p-4 text-center sm:p-6 ${
            lessonComplete ? "border-gold bg-gold/10" : "border-dashed border-border bg-card"
          }`}
        >
          {lessonComplete ? (
            <>
              <p className="font-display text-xl font-bold text-navy">✅ Lesson Completed</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Well done! Your progress has been saved automatically.
              </p>
              {next ? (
                <Link
                  to="/student/summer-mathematics/lesson/$order"
                  params={{ order: String(next.sort_order) }}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold-gradient px-6 py-3 font-bold text-gold-foreground shadow-gold"
                >
                  Next Lesson <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <p className="mt-4 text-sm font-semibold text-navy">
                  The next lesson will unlock as soon as it's published.
                </p>
              )}
            </>
          ) : (
            <>
              <p className="font-display text-lg font-bold text-navy">Finish this lesson to unlock the next one</p>
              <ul className="mt-3 inline-block space-y-1 text-left text-sm">
                <li className={quizPassed ? "text-green-700" : "text-muted-foreground"}>
                  {quizPassed ? "✅" : "⬜"} Pass the quiz ({PASS_PERCENT}% or more)
                </li>
                <li className={assignmentDone ? "text-green-700" : "text-muted-foreground"}>
                  {assignmentDone ? "✅" : "⬜"} Submit the assignment
                </li>
              </ul>
            </>
          )}
        </section>

        {/* Navigation */}
        <nav className="grid gap-3 sm:grid-cols-3">
          {prev ? (
            <Link
              to="/student/summer-mathematics/lesson/$order"
              params={{ order: String(prev.sort_order) }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card p-3 font-semibold text-navy"
            >
              <ArrowLeft className="h-4 w-4" /> Previous Lesson
            </Link>
          ) : (
            <span className="inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
              <ArrowLeft className="h-4 w-4" /> Previous Lesson
            </span>
          )}
          <Link
            to="/student/summer-mathematics"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy p-3 font-semibold text-navy-foreground"
          >
            <LayoutDashboard className="h-4 w-4" /> Back to Dashboard
          </Link>
          {next ? (
            <Link
              to="/student/summer-mathematics/lesson/$order"
              params={{ order: String(next.sort_order) }}
              className={`inline-flex items-center justify-center gap-2 rounded-xl p-3 font-semibold ${
                lessonComplete
                  ? "bg-gold-gradient text-gold-foreground shadow-gold"
                  : "border border-border bg-card text-navy"
              }`}
            >
              Next Lesson <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <span className="inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
              Next Lesson <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </nav>
      </main>

      <Footer />
    </div>
  );
}
