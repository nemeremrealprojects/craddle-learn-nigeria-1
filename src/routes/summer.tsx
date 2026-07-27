import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { formatNaira } from "@/lib/brand";
import { Sun, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/summer")({
  head: () => ({
    meta: [
      { title: "Summer courses — CRF Online Academy" },
      { name: "description", content: "Holiday enrichment: Summer English, Mathematics, Reading, Revision and the Holiday Learning Program. ₦3,000 per course." },
      { property: "og:title", content: "Summer courses — CRF Online Academy" },
      { property: "og:description", content: "Nigerian holiday learning courses at ₦3,000 each." },
      { property: "og:url", content: "https://craddle-learn-nigeria.lovable.app/summer" },
    ],
    links: [{ rel: "canonical", href: "https://craddle-learn-nigeria.lovable.app/summer" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Summer courses — CRF Online Academy",
          description: "Nigerian holiday learning courses for Nursery and Primary pupils.",
          url: "https://craddle-learn-nigeria.lovable.app/summer",
        }),
      },
    ],
  }),
  component: SummerPage,
});


function SummerPage() {
  const { data: courses = [] } = useQuery({
    queryKey: ["summer-courses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses").select("*").eq("category", "summer").eq("published", true).order("sort_order");
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <section className="bg-hero text-navy-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_80%_20%,oklch(0.78_0.15_85)_0%,transparent_50%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-gold">
            <Sun className="h-3.5 w-3.5" /> Holiday Program
          </div>
          <h1 className="mt-4 font-display text-4xl md:text-5xl font-bold">Summer & Holiday Learning</h1>
          <p className="mt-4 max-w-2xl opacity-90">
            Keep your child learning through the break. Fun, structured, complete online courses covering English, Mathematics,
            Reading, Revision, and general enrichment — from ₦3,000.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-14 flex-1">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((c) => (
            <Link
              key={c.id}
              to="/courses/$slug"
              params={{ slug: c.slug }}
              className="group rounded-2xl border border-border bg-card p-6 shadow-card hover:shadow-elegant hover:-translate-y-0.5 transition flex flex-col"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-gold-foreground">Summer</span>
                <span className="text-sm font-semibold text-navy">{formatNaira(c.price_kobo)}</span>
              </div>
              <h3 className="mt-3 font-display font-bold text-xl text-navy">{c.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-3 flex-1">{c.description}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-navy group-hover:text-gold-foreground">
                Enroll <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}
