import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { BookOpen, Award, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student/")({
  head: () => ({ meta: [{ title: "My learning — CRF Academy" }, { name: "robots", content: "noindex" }] }),
  component: StudentHome,
});

function StudentHome() {
  const { user } = useAuth();
  const { data: enrollments = [] } = useQuery({
    queryKey: ["my-enrollments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("id, enrolled_at, courses!inner(id, title, slug, level, subject, category)")
        .eq("student_id", user!.id)
        .order("enrolled_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Header />
      <section className="mx-auto max-w-7xl w-full px-4 py-10 flex-1">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-navy">My learning</h1>
            <p className="text-muted-foreground mt-1">Continue where you left off, or explore new courses.</p>
          </div>
          <Link to="/courses" className="rounded-lg bg-navy text-navy-foreground font-semibold px-4 py-2">Browse courses</Link>
        </div>

        {enrollments.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <BookOpen className="h-8 w-8 mx-auto text-gold-foreground" />
            <h3 className="mt-3 font-display text-xl font-bold text-navy">No courses yet</h3>
            <p className="mt-1 text-muted-foreground">Enroll in your first course to start learning.</p>
            <Link to="/courses" className="mt-4 inline-block rounded-lg bg-gold-gradient text-gold-foreground font-bold px-6 py-3 shadow-gold">See catalog</Link>
          </div>
        ) : (
          <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrollments.map((e: any) => (
              <Link
                key={e.id}
                to="/student/courses/$slug"
                params={{ slug: e.courses.slug }}
                className="group rounded-2xl border border-border bg-card p-6 shadow-card hover:shadow-elegant hover:-translate-y-0.5 transition"
              >
                <div className="text-xs font-bold uppercase tracking-widest text-gold-foreground">{e.courses.level}</div>
                <h3 className="mt-2 font-display text-lg font-bold text-navy">{e.courses.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{e.courses.subject}</p>
                <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-navy group-hover:text-gold-foreground">
                  Continue <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
}
