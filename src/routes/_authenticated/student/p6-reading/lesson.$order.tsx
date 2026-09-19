import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookMarked,
  BookOpenText,
  CheckCircle2,
  Download,
  FileDown,
  LayoutDashboard,
  Lightbulb,
  Loader2,
  PlayCircle,
  Target,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth-context";
import { PASS_PERCENT } from "@/lib/summer-english";
import {
  BEFORE_YOU_READ,
  COMPREHENSION_QUESTIONS,
  P6_READING_SLUG,
  READER_STRATEGIES,
  READING_INTRO,
  READING_PASSAGE,
  READING_VOCABULARY,
  REREAD_NOTE,
  STOP_THINK_CHECK,
  VOCABULARY_QUESTIONS,
} from "@/lib/p6-reading";
import { YouTubeEmbed } from "@/components/summer/YouTubeEmbed";
import { ReadingActivity } from "@/components/reading/ReadingActivity";
import { LessonQuiz, type QuizData } from "@/components/summer/LessonQuiz";
import { AssignmentUpload, type AssignmentData } from "@/components/summer/AssignmentUpload";
import { useEnrollmentSync } from "@/hooks/use-enrollment-sync";
import { Button } from "@/components/ui/button";
import {
  markLessonCompleted,
  touchLesson,
  useSummerCourse,
  useSummerEnrollment,
  useSummerLessons,
  useSummerProgress,
  useTimeTracker,
} from "@/hooks/use-summer-course";

export const Route = createFileRoute("/_authenticated/student/p6-reading/lesson/$order")({
  head: ({ params }) => ({
    meta: [
      { title: `Lesson ${params.order} — Primary 6 Reading Skills | CRF Online Academy` },
      { name: "description", content: "Primary 6 Reading Skills Week 1 lesson: What Good Readers Do." },
      { property: "og:title", content: `Lesson ${params.order} — Primary 6 Reading Skills | CRF Online Academy` },
      { property: "og:description", content: "Primary 6 Reading Skills Week 1 lesson: What Good Readers Do." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: P6ReadingLessonPage,
});

function P6ReadingLessonPage() {
  const { order } = Route.useParams();
  const orderNum = Number(order);
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  useEnrollmentSync(user?.id);

  const [readConfirmed, setReadConfirmed] = useState(false);

  const { data: course, isLoading: loadingCourse } = useSummerCourse(P6_READING_SLUG);
  const { data: enrollment, isLoading: loadingEnroll } = useSummerEnrollment(course?.id, user?.id);
  const { data: lessons = [] } = useSummerLessons(course?.id);
  const { data: progress = [] } = useSummerProgress(course?.id, user?.id);

  const lesson = useMemo(() => lessons.find((l) => l.sort_order === orderNum) ?? null, [lessons, orderNum]);

  const { data: quiz } = useQuery({
    queryKey: ["p6-quiz", lesson?.id],
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
    queryKey: ["p6-assignment", lesson?.id],
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
    queryKey: ["p6-materials", lesson?.id],
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

  useEffect(() => {
    if (!user || !course || !lesson) return;
    void touchLesson(user.id, course.id, lesson.id).then(() => {
      qc.invalidateQueries({ queryKey: ["summer-progress"] });
    });
  }, [user, course, lesson, qc]);
  useTimeTracker(user?.id, lesson?.id);

  const quizPercent = bestAttempt?.total ? Math.round((bestAttempt.score / bestAttempt.total) * 100) : null;
  const quizPassed = !!quiz && quizPercent !== null && quizPercent >= PASS_PERCENT;
  const assignmentDone = !!assignment && !!submission;
  const alreadyCompleted = !!progress.find((p) => p.lesson_id === lesson?.id && p.completed);
  const canComplete = readConfirmed && quizPassed && assignmentDone;
  const completedSteps = alreadyCompleted ? 3 : [readConfirmed, quizPassed, assignmentDone].filter(Boolean).length;
  const weekProgress = Math.round((completedSteps / 3) * 100);

  async function completeLesson() {
    if (!user || !course || !lesson) return;
    await markLessonCompleted(user.id, course.id, lesson.id);
    qc.invalidateQueries({ queryKey: ["summer-progress"] });
  }

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
            <p className="mt-2 text-muted-foreground">Enroll in Primary 6 Reading Skills for ₦3,000 to unlock it.</p>
            <Button
              onClick={() => navigate({ to: "/courses/$slug", params: { slug: P6_READING_SLUG } })}
              className="mt-5 h-11 bg-gold-gradient px-6 font-bold text-gold-foreground shadow-gold"
            >
              Enroll now
            </Button>
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
              to="/student/p6-reading"
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

  const isLessonOne = lesson.sort_order === 1;
  const vocabulary = (lesson.vocabulary ?? []).map((word) => ({
    word,
    meaning: READING_VOCABULARY[word] ?? null,
  }));

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <Header />

      <section className="bg-hero text-navy-foreground">
        <div className="mx-auto max-w-4xl px-4 py-7 sm:py-10">
          <p className="text-sm font-semibold text-gold">Primary 6 Reading Skills</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold uppercase tracking-wide text-navy-foreground/75 sm:text-sm">
            <span>Week 1 of 12</span><span aria-hidden="true">•</span><span>Reading Foundations</span><span aria-hidden="true">•</span><span>Lesson 1</span>
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">{lesson.title}</h1>
          <p className="mt-2 text-sm text-navy-foreground/80">Estimated time: 35–45 minutes</p>
          <div className="mt-6 max-w-xl" aria-label={`Week 1 progress: ${weekProgress}%`}>
            <div className="mb-2 flex items-center justify-between gap-4 text-sm font-semibold">
              <span>Week 1 progress</span>
              <span>{weekProgress}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-navy-foreground/20">
              <div className="h-full rounded-full bg-gold transition-[width] duration-500" style={{ width: `${weekProgress}%` }} />
            </div>
          </div>
          {alreadyCompleted && <p className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-gold"><CheckCircle2 className="h-4 w-4" /> Week 1 completed</p>}
        </div>
      </section>

      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-6 sm:py-8">
        {/* Introduction */}
        {isLessonOne && (
          <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
            <h2 className="font-display text-xl font-bold text-navy">Lesson introduction</h2>
            <p className="mt-3 text-sm leading-relaxed text-foreground/90 sm:text-base">{READING_INTRO}</p>
          </section>
        )}

        {/* Objectives */}
        {lesson.objectives && lesson.objectives.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
            <h2 className="inline-flex items-center gap-2 font-display text-xl font-bold text-navy">
              <Target className="h-5 w-5 text-gold-foreground" /> Learning objectives
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">By the end of this lesson, students should be able to:</p>
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

        {/* Video */}
        {lesson.video_url && (
          <section aria-labelledby="watch-lesson-heading">
            <h2 id="watch-lesson-heading" className="mb-3 inline-flex items-center gap-2 font-display text-xl font-bold uppercase text-navy">
              <PlayCircle className="h-5 w-5 text-gold-foreground" /> Watch the lesson
            </h2>
            <div className="aspect-video overflow-hidden rounded-lg bg-navy shadow-elegant">
              <YouTubeEmbed
                url={lesson.video_url}
                title="Reading Comprehension for Kids | How to Read for Meaning"
                poster={lesson.thumbnail_url}
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Reading Comprehension for Kids | How to Read for Meaning
            </p>
          </section>
        )}

        {/* Teaching material */}
        {lesson.notes && (
          <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
            <h2 className="inline-flex items-center gap-2 font-display text-xl font-bold text-navy">
              <BookMarked className="h-5 w-5 text-gold-foreground" /> What does it mean to be a good reader?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-foreground/90 sm:text-base">
              When we read, our goal is not simply to say the words correctly. Our goal is to understand what the words
              mean. A good reader actively thinks while reading.
            </p>
            {isLessonOne ? (
              <ol className="mt-5 divide-y divide-border border-y border-border">
                {READER_STRATEGIES.map((s) => (
                  <li key={s.title} className="grid gap-1 py-4 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] sm:gap-6">
                    <span className="font-display font-bold text-navy">{s.title.replace(/^\d+\.\s*/, "")}</span>
                    <span className="text-sm leading-relaxed text-foreground/90 sm:text-base">{s.body}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 sm:text-base">
                {lesson.notes}
              </p>
            )}
          </section>
        )}

        {isLessonOne && (
          <>
            {/* Before you read */}
            <section className="rounded-2xl border-2 border-navy/15 bg-cream p-4 sm:p-6">
              <h2 className="inline-flex items-center gap-2 font-display text-xl font-bold text-navy">
                <Lightbulb className="h-5 w-5 text-gold-foreground" /> Before you read
              </h2>
              <p className="mt-2 font-semibold text-navy">{BEFORE_YOU_READ.title}</p>
              <ul className="mt-3 space-y-2">
                {BEFORE_YOU_READ.prompts.map((p) => (
                  <li key={p} className="rounded-xl border border-border bg-card p-3 text-sm text-foreground/90">
                    {p}
                  </li>
                ))}
              </ul>
              <p className="mt-3 rounded-xl bg-gold/10 p-3 text-sm font-semibold text-navy">{BEFORE_YOU_READ.note}</p>
            </section>

            {/* Reading passage */}
            <section className="border-y border-border bg-card py-6 sm:py-8">
              <p className="text-xs font-bold uppercase tracking-wide text-gold-foreground">Reading practice</p>
              <h2 className="mt-2 inline-flex items-center gap-2 font-display text-2xl font-bold text-navy">
                <BookOpenText className="h-5 w-5 text-gold-foreground" /> {READING_PASSAGE.title}
              </h2>
              <div className="mt-5 max-w-3xl space-y-4 text-base leading-8 text-foreground/90 sm:text-lg">
                {READING_PASSAGE.paragraphs.map((p) => (
                  <p key={p.slice(0, 24)}>{p}</p>
                ))}
              </div>
              <label className="mt-6 flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-cream p-3 text-sm font-semibold text-navy">
                <input
                  type="checkbox"
                  checked={readConfirmed}
                  onChange={(e) => setReadConfirmed(e.target.checked)}
                  className="h-4 w-4 accent-[hsl(var(--navy))]"
                />
                I have read the passage
              </label>
            </section>

            {/* Comprehension activity */}
            <ReadingActivity
              heading="Let's think about the passage"
              intro="Choose an answer to see instant feedback. This is practice — it does not affect your quiz score."
              questions={COMPREHENSION_QUESTIONS}
            />

            {/* Reading strategy */}
            <section className="border-y-2 border-gold/40 bg-gold/5 px-4 py-6 sm:px-6">
              <h2 className="font-display text-xl font-bold text-navy">Remember: STOP — THINK — CHECK</h2>
              <ol className="mt-4 grid gap-3 sm:grid-cols-3">
                {STOP_THINK_CHECK.map((s, stepIndex) => (
                  <li key={s.title} className="border-l-4 border-gold bg-card p-4 shadow-card">
                    <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Step {stepIndex + 1}</span>
                    <span className="mt-1 block font-display text-xl font-bold text-navy">{s.title}</span>
                    <span className="mt-1 block text-sm text-foreground/90">{s.body}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-sm font-semibold text-navy">{REREAD_NOTE}</p>
            </section>

            {/* Vocabulary activity */}
            <ReadingActivity heading="Vocabulary activity" questions={VOCABULARY_QUESTIONS} />
          </>
        )}

        {/* Vocabulary list */}
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

        {/* Worksheet */}
        {materials.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
            <h2 className="font-display text-xl font-bold text-navy">Week 1 worksheet</h2>
            <ul className="mt-4 space-y-2">
              {materials.map((m: any) => (
                <li key={m.id}>
                  <a
                    href={m.file_url}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="flex min-h-12 items-center gap-3 rounded-lg bg-navy px-4 py-3 font-semibold text-navy-foreground transition hover:bg-navy/90"
                  >
                    <FileDown className="h-5 w-5 flex-shrink-0 text-gold" />
                    <span className="flex-1">
                      <span className="block">Download Week 1 Worksheet</span>
                      {m.description && <span className="block text-xs font-normal text-navy-foreground/75">{m.description}</span>}
                    </span>
                    <Download className="h-4 w-4 flex-shrink-0" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Auto-graded quiz */}
        {quiz && user && (
          <>
            <LessonQuiz
              quiz={quiz}
              studentId={user.id}
              completionLabel="Quiz complete"
              onPassed={() => qc.invalidateQueries({ queryKey: ["quiz-best", quiz.id] })}
            />
          </>
        )}

        {/* Assignment */}
        {assignment && user && (
          <>
            <AssignmentUpload
              assignment={assignment}
              studentId={user.id}
              pendingLabel="Awaiting teacher review"
              onSubmitted={() => qc.invalidateQueries({ queryKey: ["submission", assignment.id] })}
            />
          </>
        )}

        {/* Completion */}
        <section
          className={`border-y-2 p-4 text-center sm:p-7 ${
            alreadyCompleted ? "border-gold bg-gold/10" : "border-dashed border-border bg-card"
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-wide text-gold-foreground">Week 1</p>
          <p className="mt-1 font-display text-2xl font-bold text-navy">{alreadyCompleted ? "Week 1 complete" : "Complete Week 1"}</p>
          {alreadyCompleted ? (
            <>
              <p className="mt-2 inline-flex items-center gap-2 font-semibold text-navy">
                <CheckCircle2 className="h-5 w-5 text-gold-foreground" /> Week 1 completed
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Your progress has been saved.</p>
              <Link to="/student/p6-reading" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-navy px-6 py-3 font-semibold text-navy-foreground"><LayoutDashboard className="h-4 w-4" /> Primary 6 Reading Skills</Link>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted-foreground">Before completing the lesson, you should have:</p>
              <ul className="mt-3 inline-block space-y-1 text-left text-sm">
                <li className={readConfirmed ? "text-green-700" : "text-muted-foreground"}>
                  {readConfirmed ? "✅" : "⬜"} Read the lesson and the passage
                </li>
                <li className={quizPassed ? "text-green-700" : "text-muted-foreground"}>
                  {quizPassed ? "✅" : "⬜"} Passed the Week 1 quiz (4 of 5)
                </li>
                <li className={assignmentDone ? "text-green-700" : "text-muted-foreground"}>
                  {assignmentDone ? "✅" : "⬜"} Submitted the Week 1 assignment
                </li>
              </ul>
              <Button
                type="button"
                onClick={completeLesson}
                disabled={!canComplete}
                className="mt-5 h-12 w-full bg-navy px-8 font-bold text-navy-foreground sm:mx-auto sm:w-auto"
              >
                Mark lesson complete
              </Button>
              {!canComplete && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Confirm that you have read the passage, pass the quiz and submit your assignment to unlock this button.
                </p>
              )}
            </>
          )}
        </section>

        {/* Navigation */}
        <nav className="grid gap-3 sm:grid-cols-2">
          <Link
            to="/student/p6-reading"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy p-3 font-semibold text-navy-foreground sm:col-span-2"
          >
            <LayoutDashboard className="h-4 w-4" /> Primary 6 Reading Skills
          </Link>
        </nav>
      </main>

      <Footer />
    </div>
  );
}
