import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { formatNaira, CATEGORY_LABEL } from "@/lib/brand";
import { useAuth } from "@/lib/auth-context";
import { initializePayment } from "@/lib/payments.functions";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock, Video, FileText, ClipboardList, Award, Loader2 } from "lucide-react";

export const Route = createFileRoute("/courses/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — CRF Online Academy` },
      { name: "description", content: "Complete online course with video lessons, PDF notes, quizzes and certificate. ₦3,000." },
    ],
  }),
  component: CourseDetail,
});

function CourseDetail() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const initPay = useServerFn(initializePayment);

  const { data: course } = useQuery({
    queryKey: ["course", slug],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").eq("slug", slug).maybeSingle();
      return data;
    },
  });

  const { data: enrolled } = useQuery({
    queryKey: ["enrollment", slug, user?.id],
    enabled: !!user && !!course,
    queryFn: async () => {
      if (!user || !course) return false;
      const { data } = await supabase.from("enrollments").select("id").eq("student_id", user.id).eq("course_id", course.id).maybeSingle();
      return !!data;
    },
  });

  async function handleEnroll() {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: `/courses/${slug}` } });
      return;
    }
    if (!course) return;
    if (enrolled) {
      navigate({ to: "/student/courses/$slug", params: { slug: course.slug } });
      return;
    }
    setLoading(true);
    try {
      const res = await initPay({ data: { courseId: course.id } });
      if (res.authorization_url) {
        window.location.href = res.authorization_url;
      } else {
        toast.error(res.error || "Could not start payment");
        setLoading(false);
      }
    } catch (e: any) {
      toast.error(e?.message || "Payment failed to start");
      setLoading(false);
    }
  }

  if (course === undefined) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-navy" /></div>
      </div>
    );
  }
  if (!course) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 grid place-items-center px-4 text-center">
          <div>
            <h1 className="font-display text-3xl font-bold text-navy">Course not found</h1>
            <Link to="/courses" className="mt-4 inline-block text-navy underline">Back to catalog</Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const objectives: string[] = course.learning_objectives ?? [
    "Complete recorded video lessons",
    "Downloadable PDF notes and worksheets",
    "Auto-graded quizzes with feedback",
    "Assignments graded by our teachers",
    "Progress tracking and certificate",
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <section className="bg-hero text-navy-foreground">
        <div className="mx-auto max-w-7xl px-4 py-14 grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            <div className="text-xs font-bold uppercase tracking-widest text-gold">
              {CATEGORY_LABEL[course.category]} · {course.level}
            </div>
            <h1 className="mt-2 font-display text-4xl md:text-5xl font-bold">{course.title}</h1>
            <p className="mt-4 opacity-90 max-w-2xl">{course.description}</p>
            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-gold" /> {course.duration_weeks} weeks</span>
              <span className="flex items-center gap-2"><Video className="h-4 w-4 text-gold" /> Video lessons</span>
              <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-gold" /> PDF materials</span>
              <span className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-gold" /> Quizzes & assignments</span>
              <span className="flex items-center gap-2"><Award className="h-4 w-4 text-gold" /> Certificate</span>
            </div>
          </div>
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/15 p-6 h-fit">
            <div className="text-sm opacity-80">One-time payment</div>
            <div className="font-display text-4xl font-bold text-gold">{formatNaira(course.price_kobo)}</div>
            <button
              onClick={handleEnroll}
              disabled={loading}
              className="mt-5 w-full rounded-lg bg-gold-gradient text-gold-foreground font-bold py-3 shadow-gold hover:opacity-95 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {enrolled ? "Go to course" : user ? "Enroll & pay with Paystack" : "Sign in to enroll"}
            </button>
            <div className="mt-4 text-xs opacity-80 text-center">Secure payment via Paystack · Naira (₦)</div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 grid lg:grid-cols-3 gap-10 flex-1">
        <div className="lg:col-span-2 space-y-10">
          <div>
            <h2 className="font-display text-2xl font-bold text-navy">What you'll get</h2>
            <ul className="mt-4 space-y-2">
              {objectives.map((o) => (
                <li key={o} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-gold-foreground flex-shrink-0 mt-0.5" />
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-navy">How the course works</h2>
            <ol className="mt-4 space-y-3">
              {[
                "Enroll and pay ₦3,000 securely with Paystack.",
                "Access all video lessons in your student dashboard.",
                "Download PDF notes, worksheets and revision packs.",
                "Complete assignments and take auto-graded quizzes.",
                "Earn your certificate on 100% completion.",
              ].map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="grid place-items-center h-7 w-7 rounded-full bg-navy text-navy-foreground text-sm font-bold flex-shrink-0">{i + 1}</span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="font-semibold text-navy">Course details</div>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Level</dt><dd className="font-semibold">{course.level}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Subject</dt><dd className="font-semibold">{course.subject}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Duration</dt><dd className="font-semibold">{course.duration_weeks} weeks</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Price</dt><dd className="font-semibold text-navy">{formatNaira(course.price_kobo)}</dd></div>
            </dl>
          </div>
        </aside>
      </section>
      <Footer />
    </div>
  );
}
