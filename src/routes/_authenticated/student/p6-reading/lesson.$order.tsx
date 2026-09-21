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
  MAIN_IDEA_CHECK,
  MAIN_IDEA_STATEMENTS,
  WEEK_TWO_COMPREHENSION,
  WEEK_TWO_INTRO,
  WEEK_TWO_PASSAGE,
  WEEK_TWO_VOCABULARY,
} from "@/lib/p6-reading";
import { YouTubeEmbed } from "@/components/summer/YouTubeEmbed";
import { ReadingActivity } from "@/components/reading/ReadingActivity";
import { MainIdeaActivity, type MainIdeaChoice } from "@/components/reading/MainIdeaActivity";
import { LessonQuiz, type QuizData } from "@/components/summer/LessonQuiz";
import { AssignmentUpload, type AssignmentData } from "@/components/summer/AssignmentUpload";
import { useEnrollmentSync } from "@/hooks/use-enrollment-sync";
import { Button } from "@/components/ui/button";
import {
  markLessonCompleted,
  saveLessonResponses,
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
  const [videoWatched, setVideoWatched] = useState(false);
  const [readingPracticeDone, setReadingPracticeDone] = useState(false);
  const [savingActivity, setSavingActivity] = useState(false);

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
  const lessonProgress = progress.find((p) => p.lesson_id === lesson?.id);
  const isLessonTwo = lesson?.sort_order === 2;
  const storedResponses = lessonProgress?.responses && typeof lessonProgress.responses === "object" && !Array.isArray(lessonProgress.responses)
    ? lessonProgress.responses
    : {};
  const storedWeekTwo = typeof storedResponses.weekTwo === "object" && storedResponses.weekTwo !== null && !Array.isArray(storedResponses.weekTwo)
    ? storedResponses.weekTwo as { mainIdeaAnswers?: Record<string, MainIdeaChoice>; mainIdeaComplete?: boolean }
    : {};
  const persistedVideoWatched = !!storedResponses.videoWatched;
  const persistedReadConfirmed = !!storedResponses.readConfirmed;
  const persistedReadingPracticeDone = !!storedResponses.readingPracticeDone;
  const mainIdeaDone = !!storedWeekTwo.mainIdeaComplete;
  const weekTwoRequirements = [videoWatched || persistedVideoWatched, readConfirmed || persistedReadConfirmed, readingPracticeDone || persistedReadingPracticeDone, mainIdeaDone, quizPassed, assignmentDone];
  const weekOneRequirements = [readConfirmed, quizPassed, assignmentDone];
  const requirements = isLessonTwo ? weekTwoRequirements : weekOneRequirements;
  const canComplete = requirements.every(Boolean);
  const completedSteps = alreadyCompleted ? requirements.length : requirements.filter(Boolean).length;
  const weekProgress = Math.round((completedSteps / requirements.length) * 100);
  const courseProgress = Math.round((progress.filter((row) => row.completed).length / 12) * 100);

  async function completeLesson() {
    if (!user || !course || !lesson) return;
    await markLessonCompleted(user.id, course.id, lesson.id);
    qc.invalidateQueries({ queryKey: ["summer-progress"] });
  }

  async function saveMainIdeaActivity(answers: Record<number, MainIdeaChoice>) {
    if (!user || !course || !lesson) return;
    setSavingActivity(true);
    await saveLessonResponses(user.id, course.id, lesson.id, {
      ...storedResponses,
      weekTwo: { mainIdeaAnswers: answers, mainIdeaComplete: true },
    });
    await qc.invalidateQueries({ queryKey: ["summer-progress", course.id, user.id] });
    setSavingActivity(false);
  }

  async function saveWeekTwoResponse(key: "videoWatched" | "readConfirmed" | "readingPracticeDone") {
    if (!user || !course || !lesson) return;
    await saveLessonResponses(user.id, course.id, lesson.id, { ...storedResponses, [key]: true });
    await qc.invalidateQueries({ queryKey: ["summer-progress", course.id, user.id] });
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
  if (!isLessonOne && !isLessonTwo) {
    return null;
  }
  const weekNumber = isLessonTwo ? 2 : 1;
  const moduleName = isLessonTwo ? "Reading for Main Idea and Supporting Details" : "Reading Foundations";
  const estimatedTime = isLessonTwo ? "40–50 minutes" : "35–45 minutes";
  const displayProgress = isLessonTwo ? courseProgress : weekProgress;
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
             <span>Week {weekNumber} of 12</span><span aria-hidden="true">•</span><span>{moduleName}</span><span aria-hidden="true">•</span><span>Lesson {lesson.sort_order}</span>
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">{lesson.title}</h1>
           <p className="mt-2 text-sm text-navy-foreground/80">Estimated time: {estimatedTime}</p>
           <div className="mt-6 max-w-xl" aria-label={`${isLessonTwo ? "Course" : `Week ${weekNumber}`} progress: ${displayProgress}%`}>
            <div className="mb-2 flex items-center justify-between gap-4 text-sm font-semibold">
                <span>{isLessonTwo ? "Course progress" : `Week ${weekNumber} progress`}</span>
               <span>{displayProgress}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-navy-foreground/20">
               <div className="h-full rounded-full bg-gold transition-[width] duration-500" style={{ width: `${displayProgress}%` }} />
            </div>
          </div>
           {alreadyCompleted && <p className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-gold"><CheckCircle2 className="h-4 w-4" /> Week {weekNumber} completed</p>}
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
        {isLessonTwo && (
          <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
            <h2 className="font-display text-xl font-bold text-navy">Lesson introduction</h2>
            <p className="mt-3 text-sm leading-relaxed text-foreground/90 sm:text-base">{WEEK_TWO_INTRO}</p>
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
                title={isLessonTwo ? "Finding the Main Idea and Supporting Details" : "Reading Comprehension for Kids | How to Read for Meaning"}
                poster={lesson.thumbnail_url}
                onPlay={isLessonTwo ? () => { setVideoWatched(true); void saveWeekTwoResponse("videoWatched"); } : undefined}
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
               {isLessonTwo ? "Finding the Main Idea and Supporting Details" : "Reading Comprehension for Kids | How to Read for Meaning"}
            </p>
          </section>
        )}

        {/* Teaching material */}
        {lesson.notes && isLessonOne && (
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
            ) : null}
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

        {isLessonTwo && (
          <>
            <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
              <h2 className="font-display text-xl font-bold uppercase text-navy">What is the main idea?</h2>
              <p className="mt-3 text-sm leading-relaxed text-foreground/90 sm:text-base">The main idea tells what a passage is mostly about. It is the most important message the writer wants you to understand.</p>
              <h2 className="mt-6 font-display text-xl font-bold uppercase text-navy">What are supporting details?</h2>
              <p className="mt-3 text-sm leading-relaxed text-foreground/90 sm:text-base">Supporting details give information that helps the reader understand or prove the main idea.</p>
              <div className="mt-5 border-l-4 border-gold bg-gold/5 p-4">
                <p className="text-sm font-bold uppercase text-gold-foreground">Topic: Exercise</p>
                <p className="mt-2 font-semibold text-navy">Main idea: Regular exercise helps people stay healthy.</p>
                <p className="mt-3 text-sm font-semibold text-navy">Supporting details:</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground/90 sm:text-base">
                  <li>Exercise strengthens the body.</li><li>It helps improve fitness.</li><li>It can give people more energy.</li>
                </ul>
              </div>
            </section>

            <section className="border-y-2 border-gold/40 bg-gold/5 px-4 py-6 sm:px-6">
              <h2 className="font-display text-xl font-bold uppercase text-navy">Main idea check</h2>
              <ol className="mt-4 grid gap-3 sm:grid-cols-2">
                {MAIN_IDEA_CHECK.map((prompt, index) => <li key={prompt} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 bg-card p-4 shadow-card"><span className="grid h-7 w-7 place-items-center rounded-full bg-navy text-sm font-bold text-navy-foreground">{index + 1}</span><span className="font-semibold text-navy">{prompt}</span></li>)}
              </ol>
            </section>

            <section className="border-y border-border bg-card py-6 sm:py-8">
              <p className="text-xs font-bold uppercase tracking-wide text-gold-foreground">Reading practice</p>
              <h2 className="mt-2 inline-flex items-center gap-2 font-display text-2xl font-bold text-navy"><BookOpenText className="h-5 w-5 text-gold-foreground" /> {WEEK_TWO_PASSAGE.title}</h2>
              <div className="mt-5 max-w-3xl space-y-4 text-base leading-8 text-foreground/90 sm:text-lg">{WEEK_TWO_PASSAGE.paragraphs.map((paragraph) => <p key={paragraph.slice(0, 24)}>{paragraph}</p>)}</div>
              <label className="mt-6 flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-cream p-3 text-sm font-semibold text-navy"><input type="checkbox" checked={readConfirmed || persistedReadConfirmed} onChange={(event) => { setReadConfirmed(event.target.checked); if (event.target.checked) void saveWeekTwoResponse("readConfirmed"); }} className="h-4 w-4 accent-[hsl(var(--navy))]" /> I have read the lesson and passage</label>
            </section>

            <ReadingActivity heading="Let's think about the passage" intro="Choose an answer to see instant feedback." questions={WEEK_TWO_COMPREHENSION} onComplete={() => { setReadingPracticeDone(true); void saveWeekTwoResponse("readingPracticeDone"); }} />
            <MainIdeaActivity statements={MAIN_IDEA_STATEMENTS} initialAnswers={Object.fromEntries(Object.entries(storedWeekTwo.mainIdeaAnswers ?? {}).map(([key, value]) => [Number(key), value]))} completed={mainIdeaDone} saving={savingActivity} onSubmit={saveMainIdeaActivity} />
            <ReadingActivity heading="Vocabulary activity" questions={WEEK_TWO_VOCABULARY} />
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
             <h2 className="font-display text-xl font-bold text-navy">Week {weekNumber} worksheet</h2>
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
                       <span className="block">Download Week {weekNumber} Worksheet</span>
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
              allowTextOnly={isLessonTwo}
              submittedLabel={isLessonTwo ? "Submitted — Awaiting teacher review" : undefined}
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
           <p className="text-xs font-bold uppercase tracking-wide text-gold-foreground">Week {weekNumber}</p>
           <p className="mt-1 font-display text-2xl font-bold text-navy">{alreadyCompleted ? `Week ${weekNumber} complete` : `You've reached the end of Week ${weekNumber} 🎉`}</p>
          {alreadyCompleted ? (
            <>
              <p className="mt-2 inline-flex items-center gap-2 font-semibold text-navy">
                 <CheckCircle2 className="h-5 w-5 text-gold-foreground" /> Lesson {lesson.sort_order} completed
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Your progress has been saved.</p>
              <Link to="/student/p6-reading" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-navy px-6 py-3 font-semibold text-navy-foreground"><LayoutDashboard className="h-4 w-4" /> Primary 6 Reading Skills</Link>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted-foreground">Before completing the lesson, you should have:</p>
               <ul className="mt-3 inline-block space-y-1 text-left text-sm">
                  {isLessonTwo && <li className={videoWatched || persistedVideoWatched ? "text-green-700" : "text-muted-foreground"}>{videoWatched || persistedVideoWatched ? "✅" : "⬜"} Watched lesson video</li>}
                 <li className={readConfirmed || persistedReadConfirmed ? "text-green-700" : "text-muted-foreground"}>
                    {readConfirmed || persistedReadConfirmed ? "✅" : "⬜"} Read the lesson and passage
                </li>
                 {isLessonTwo && <li className={readingPracticeDone || persistedReadingPracticeDone ? "text-green-700" : "text-muted-foreground"}>{readingPracticeDone || persistedReadingPracticeDone ? "✅" : "⬜"} Completed reading practice</li>}
                 {isLessonTwo && <li className={mainIdeaDone ? "text-green-700" : "text-muted-foreground"}>{mainIdeaDone ? "✅" : "⬜"} Completed Main Idea activity</li>}
                <li className={quizPassed ? "text-green-700" : "text-muted-foreground"}>
                   {quizPassed ? "✅" : "⬜"} Passed the Week {weekNumber} quiz (4 of 5)
                </li>
                <li className={assignmentDone ? "text-green-700" : "text-muted-foreground"}>
                   {assignmentDone ? "✅" : "⬜"} Submitted the Week {weekNumber} assignment
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
                   Complete every Week {weekNumber} requirement above to unlock this button.
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
