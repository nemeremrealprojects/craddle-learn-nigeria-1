import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { formatNaira, CATEGORY_LABEL } from "@/lib/brand";
import { ArrowRight, Search } from "lucide-react";

export const Route = createFileRoute("/courses/")({
  head: () => ({
    meta: [
      { title: "All courses — CRF Online Academy" },
      { name: "description", content: "Full catalog: Kindergarten and Primary 1–6 English, Mathematics, Basic Science, Reading Skills, Phonics and Exam Prep. ₦3,000 per course." },
      { property: "og:title", content: "All courses — CRF Online Academy" },
      { property: "og:description", content: "Kindergarten and Primary 1–6 courses at ₦3,000 each." },
    ],
  }),
  component: CoursesPage,
});

function CoursesPage() {
  const [category, setCategory] = useState<string>("all");
  const [q, setQ] = useState("");

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, title, slug, description, level, subject, price_kobo, category")
        .eq("published", true)
        .order("sort_order");
      return data ?? [];
    },
  });

  const filtered = courses.filter((c) => {
    if (category !== "all" && c.category !== category) return false;
    if (q && !(c.title.toLowerCase().includes(q.toLowerCase()) || c.level.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  const cats = [
    { id: "all", label: "All" },
    { id: "kindergarten", label: "Kindergarten" },
    { id: "primary", label: "Primary 1–6" },
    { id: "summer", label: "Summer" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <section className="bg-hero text-navy-foreground">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <h1 className="font-display text-4xl md:text-5xl font-bold">Full course catalog</h1>
          <p className="mt-3 opacity-90 max-w-2xl">
            Every course is a complete online class — video lessons, PDFs, quizzes, assignments and a certificate.
            ₦3,000 per course, one-time payment.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-10 flex-1">
        <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
          <div className="flex gap-2 flex-wrap">
            {cats.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition ${category === c.id ? "bg-navy text-navy-foreground" : "bg-accent text-navy hover:bg-accent/70"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search courses..."
              className="pl-9 pr-4 py-2 rounded-full border border-border bg-background text-sm w-64"
            />
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((c) => (
            <Link
              key={c.id}
              to="/courses/$slug"
              params={{ slug: c.slug }}
              className="group rounded-2xl border border-border bg-card p-6 shadow-card hover:shadow-elegant hover:-translate-y-0.5 transition flex flex-col"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-gold-foreground">{CATEGORY_LABEL[c.category] ?? c.level}</span>
                <span className="text-sm font-semibold text-navy">{formatNaira(c.price_kobo)}</span>
              </div>
              <h3 className="mt-3 font-display font-bold text-xl text-navy">{c.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-3 flex-1">{c.description}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-navy group-hover:text-gold-foreground">
                Enroll <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-foreground">No courses match your filters.</div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}
