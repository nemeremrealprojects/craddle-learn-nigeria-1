import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { SummerLearningCorner } from "@/components/site/SummerLearningCorner";
import { formatNaira, CRF_CONTACT } from "@/lib/brand";
import { BookOpen, Video, FileText, Award, Phone, ArrowRight, CheckCircle2, GraduationCap, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nigerian Online Nursery & Primary School — CRF Academy" },
      { name: "description", content: "Kindergarten and Primary 1–6 online courses with video lessons, PDF notes, quizzes and certificates. From ₦3,000, paid with Paystack." },
      { property: "og:title", content: "Nigerian Online Nursery & Primary School — CRF Academy" },
      { property: "og:description", content: "Video lessons, PDFs, quizzes and certificates for Nigerian Nursery & Primary pupils. From ₦3,000." },
      { property: "og:url", content: "https://craddle-learn-nigeria.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://craddle-learn-nigeria.lovable.app/" }],
  }),
  component: HomePage,
});


function HomePage() {
  const { data: featured } = useQuery({
    queryKey: ["featured-courses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, title, slug, description, level, subject, price_kobo, category")
        .eq("published", true)
        .order("sort_order")
        .limit(6);
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-hero text-navy-foreground">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,oklch(0.78_0.15_85)_0%,transparent_50%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 lg:py-28 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-gold">
              <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" /> New academic session enrolling now
            </div>
            <h1 className="mt-4 font-display text-4xl md:text-6xl font-bold leading-tight">
              Nigeria's premium <span className="text-gold">online Nursery & Primary</span> academy
            </h1>
            <p className="mt-5 text-lg opacity-90 max-w-xl">
              Learn from home with expert Nigerian teachers. Video lessons, PDF workbooks, quizzes, assignments,
              and certificates — from Kindergarten through Primary 6.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/courses" className="inline-flex items-center gap-2 rounded-lg bg-gold-gradient text-gold-foreground px-6 py-3 font-semibold shadow-gold hover:opacity-95">
                Browse courses <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/admissions" className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/5 backdrop-blur px-6 py-3 font-semibold hover:bg-white/10">
                Apply for admission
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm opacity-90">
              <span className="flex items-center gap-2"><Phone className="h-4 w-4 text-gold" /> {CRF_CONTACT.phone1}</span>
              <span className="flex items-center gap-2"><Phone className="h-4 w-4 text-gold" /> {CRF_CONTACT.phone2}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { Icon: Video, title: "Video lessons", desc: "Chaptered, resumable, on any device." },
              { Icon: FileText, title: "PDF materials", desc: "Notes, worksheets, revision packs." },
              { Icon: BookOpen, title: "Quizzes & tests", desc: "Auto-graded, instant feedback." },
              { Icon: Award, title: "Certificates", desc: "Downloadable on completion." },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="rounded-2xl bg-white/8 backdrop-blur border border-white/10 p-5">
                <Icon className="h-6 w-6 text-gold" />
                <div className="mt-3 font-semibold">{title}</div>
                <div className="text-sm opacity-80 mt-1">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-cream">
        <div className="mx-auto max-w-7xl px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { n: "34+", l: "Complete courses" },
            { n: "K–P6", l: "Full curriculum coverage" },
            { n: "₦3,000", l: "Per course, all included" },
            { n: "24/7", l: "Access to your dashboard" },
          ].map((s) => (
            <div key={s.l} className="text-center">
              <div className="font-display text-3xl md:text-4xl font-bold text-navy">{s.n}</div>
              <div className="text-xs md:text-sm text-muted-foreground mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured courses */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-sm font-semibold text-gold-foreground/60 uppercase tracking-widest">Popular</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-navy mt-1">Explore our courses</h2>
          </div>
          <Link to="/courses" className="text-sm font-semibold text-navy hover:text-gold-foreground inline-flex items-center gap-1">
            See all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(featured ?? []).map((c) => (
            <Link
              key={c.id}
              to="/courses/$slug"
              params={{ slug: c.slug }}
              className="group rounded-2xl border border-border bg-card p-6 shadow-card hover:shadow-elegant hover:-translate-y-0.5 transition"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-gold-foreground">{c.level}</span>
                <span className="text-sm font-semibold text-navy">{formatNaira(c.price_kobo)}</span>
              </div>
              <h3 className="mt-3 font-display font-bold text-xl text-navy group-hover:text-navy">{c.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{c.description}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-navy group-hover:text-gold-foreground">
                View course <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Value props */}
      <section className="bg-cream">
        <div className="mx-auto max-w-7xl px-4 py-16 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-navy">
              Everything a Nigerian child needs to <span className="text-gold-foreground">excel at school</span>.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Every course is a complete online class — not just cards on a page. Enroll once and get full access.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Recorded video lessons with previous/next navigation",
                "Downloadable PDF notes, worksheets and revision packs",
                "Auto-graded quizzes with instant feedback",
                "Assignments graded by teachers with feedback",
                "Progress tracking, resume where you left off",
                "Downloadable completion certificate",
              ].map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-gold-foreground flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { Icon: GraduationCap, t: "Expert teachers", d: "Nigerian educators who know the syllabus." },
              { Icon: Users, t: "Parent dashboard", d: "Track your child's progress and results." },
              { Icon: Award, t: "Real certificates", d: "Awarded on 100% course completion." },
              { Icon: BookOpen, t: "Common Entrance", d: "Dedicated P6 examination prep course." },
            ].map(({ Icon, t, d }) => (
              <div key={t} className="rounded-2xl border border-border bg-background p-5 shadow-card">
                <Icon className="h-6 w-6 text-gold-foreground" />
                <div className="mt-3 font-semibold text-navy">{t}</div>
                <div className="text-sm text-muted-foreground mt-1">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="rounded-3xl bg-hero text-navy-foreground p-10 md:p-14 shadow-elegant flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="font-display text-2xl md:text-3xl font-bold">Ready to enroll your child?</h3>
            <p className="opacity-90 mt-2">Start with any course from ₦3,000 — pay securely with Paystack.</p>
          </div>
          <div className="flex gap-3">
            <Link to="/courses" className="rounded-lg bg-gold-gradient text-gold-foreground font-semibold px-6 py-3 shadow-gold">
              Browse courses
            </Link>
            <Link to="/contact" className="rounded-lg border border-white/25 font-semibold px-6 py-3 hover:bg-white/10">
              Talk to us
            </Link>
          </div>
        </div>
      </section>

      <SummerLearningCorner />

      <Footer />
    </div>
  );
}
