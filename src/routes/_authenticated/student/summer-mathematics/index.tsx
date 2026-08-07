import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, BookOpen, Clock, PlayCircle, CheckCircle2, ListChecks, Loader2 } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth-context";
import { formatDuration } from "@/lib/summer-english";
import { SUMMER_MATHS_SLUG, SUMMER_MATHS_TOTAL_LESSONS } from "@/lib/summer-maths";
import {
  summarise,
  useSummerCourse,
  useSummerEnrollment,
  useSummerLessons,
  useSummerProgress,
} from "@/hooks/use-summer-course";

export const Route = createFileRoute("/_authenticated/student/summer-mathematics/")({
  head: () => ({
    meta: [
      { title: "Summer Mathematics Dashboard — CRF Online Academy" },
      {
        name: "description",
        content: "Your 6-week Summer Mathematics Lessons dashboard: progress, lessons and certificate status.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SummerMathsDashboard,
});

function SummerMathsDashboard() {
  const { user } = useAuth();
  const { data: course, isLoading: loadingCourse } = useSummerCourse(SUMMER_MATHS_SLUG);
  const { data: enrollment, isLoading: loadingEnroll } = useSummerEnrollment(course?.id, user?.id);
  const { data: lessons = [] } = useSummerLessons(course?.id);
  const { data: progress = [] } = useSummerProgress(course?.id, user?.id);

  const stats = summarise(lessons, progress, SUMMER_MATHS_TOTAL_LESSONS);
  const firstName = (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] || "there";

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
            <h1 className="font-display text-2xl font-bold text-navy">
              You're not enrolled in Summer Mathematics yet
            </h1>
            <p className="mt-2 text-muted-foreground">Enroll for ₦3,000 to unlock all six weeks of lessons.</p>
            <Link
              to="/courses/$slug"
              params={{ slug: SUMMER_MATHS_SLUG }}
              className="mt-5 inline-block rounded-lg bg-gold-gradient px-6 py-3 font-bold text-gold-foreground shadow-gold"
            >
              Enroll now
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <Header />

      <section className="bg-hero text-navy-foreground">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
          <p className="text-sm font-semibold text-gold">Welcome back, {firstName}! 👋</p>
          <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">Summer Mathematics Lessons</h1>
          <p className="mt-2 text-sm text-navy-foreground/80">
            Duration: 6 Weeks · {lessons.length} lesson{lessons.length === 1 ? "" : "s"} available now
          </p>

          <div className="mt-6">
            <div className="flex items-center gap-3">
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-gold-gradient transition-all"
                  style={{ width: `${stats.percent}%` }}
                />
              </div>
              <span className="text-sm font-bold text-gold">{stats.percent}%</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat icon={<CheckCircle2 className="h-4 w-4" />} label="Lessons completed" value={String(stats.completedCount)} />
            <Stat icon={<ListChecks className="h-4 w-4" />} label="Lessons remaining" value={String(stats.remaining)} />
            <Stat icon={<Clock className="h-4 w-4" />} label="Time spent learning" value={formatDuration(stats.timeSpentSeconds)} />
            <Stat icon={<Award className="h-4 w-4" />} label="Certificate" value={stats.certificateReady ? "Ready" : "Locked"} />
          </div>

          {stats.nextLesson && (
            <Link
              to="/student/summer-mathematics/lesson/$order"
              params={{ order: String(stats.nextLesson.sort_order) }}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gold-gradient px-6 py-3 font-bold text-gold-foreground shadow-gold"
            >
              <PlayCircle className="h-5 w-5" /> Continue learning
            </Link>
          )}
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoCard title="Last lesson viewed">
            {stats.lastViewed ? (
              <Link
                to="/student/summer-mathematics/lesson/$order"
                params={{ order: String(stats.lastViewed.sort_order) }}
                className="font-semibold text-navy underline-offset-2 hover:underline"
              >
                Lesson {stats.lastViewed.sort_order}: {stats.lastViewed.title}
              </Link>
            ) : (
              <span className="text-muted-foreground">You haven't started a lesson yet — begin with Lesson 1.</span>
            )}
          </InfoCard>
          <InfoCard title="Certificate status">
            {stats.certificateReady ? (
              <span className="font-semibold text-navy">🎓 Ready — all lessons completed!</span>
            ) : (
              <span className="text-muted-foreground">
                Locked. Your certificate unlocks when every lesson in the 6-week course is completed, all quizzes are
                passed and all assignments are submitted.
              </span>
            )}
          </InfoCard>
        </div>

        <h2 className="mt-10 font-display text-2xl font-bold text-navy">Course lessons</h2>
        <ol className="mt-4 space-y-3">
          {lessons.map((l) => {
            const done = stats.completedIds.has(l.id);
            return (
              <li key={l.id}>
                <Link
                  to="/student/summer-mathematics/lesson/$order"
                  params={{ order: String(l.sort_order) }}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-elegant sm:p-5"
                >
                  <span className="mt-0.5">
                    {done ? (
                      <CheckCircle2 className="h-6 w-6 text-gold-foreground" />
                    ) : (
                      <PlayCircle className="h-6 w-6 text-navy" />
                    )}
                  </span>
                  <span className="flex-1">
                    {l.module_title && (
                      <span className="block text-xs font-bold uppercase tracking-widest text-gold-foreground">
                        {l.module_title}
                      </span>
                    )}
                    <span className="mt-0.5 block font-display text-lg font-bold text-navy">
                      Lesson {l.sort_order}: {l.title}
                    </span>
                    {l.description && (
                      <span className="mt-1 block text-sm text-muted-foreground line-clamp-2">{l.description}</span>
                    )}
                    <span className="mt-2 inline-block text-xs font-semibold text-navy/70">
                      {done ? "✅ Lesson completed" : "Not completed yet"}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
          {lessons.length === 0 && (
            <li className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <BookOpen className="mx-auto h-8 w-8 text-gold-foreground" />
              <p className="mt-2 text-muted-foreground">Lessons are being published — please check back soon.</p>
            </li>
          )}
        </ol>
      </section>

      <Footer />
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/5 p-3">
      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold">
        {icon} {label}
      </div>
      <div className="mt-1 font-display text-xl font-bold">{value}</div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <h3 className="text-xs font-bold uppercase tracking-widest text-gold-foreground">{title}</h3>
      <p className="mt-2 text-sm">{children}</p>
    </div>
  );
}
