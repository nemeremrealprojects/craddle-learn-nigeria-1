import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Users, BookOpen, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/teacher/")({
  head: () => ({ meta: [{ title: "Teacher dashboard — CRF Academy" }, { name: "robots", content: "noindex" }] }),
  component: TeacherDashboard,
});

function TeacherDashboard() {
  const { user } = useAuth();
  const { data: courses = [] } = useQuery({
    queryKey: ["teacher-courses", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("courses").select("id, title, slug, level, subject").eq("teacher_id", user!.id).order("sort_order")).data ?? [],
  });
  const { data: students } = useQuery({
    queryKey: ["teacher-students", user?.id, courses.length],
    enabled: !!user && courses.length > 0,
    queryFn: async () => {
      const ids = courses.map((c: any) => c.id);
      const { count } = await supabase.from("enrollments").select("id", { count: "exact", head: true }).in("course_id", ids);
      return count ?? 0;
    },
  });

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Header />
      <section className="mx-auto max-w-7xl w-full px-4 py-10 flex-1">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-navy">Teacher dashboard</h1>
        <div className="mt-6 grid sm:grid-cols-3 gap-4">
          {[
            { Icon: BookOpen, label: "Courses", value: courses.length },
            { Icon: Users, label: "Enrolled students", value: students ?? 0 },
            { Icon: GraduationCap, label: "Role", value: "Teacher" },
          ].map(({ Icon, label, value }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <Icon className="h-5 w-5 text-gold-foreground" />
              <div className="mt-3 text-sm text-muted-foreground">{label}</div>
              <div className="font-display text-3xl font-bold text-navy">{value}</div>
            </div>
          ))}
        </div>
        <h2 className="mt-10 font-display text-xl font-bold text-navy">Your courses</h2>
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          {courses.map((c: any) => (
            <div key={c.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="text-xs font-bold uppercase tracking-widest text-gold-foreground">{c.level} · {c.subject}</div>
              <h3 className="mt-1 font-display text-lg font-bold text-navy">{c.title}</h3>
              <Link to="/courses/$slug" params={{ slug: c.slug }} className="mt-3 inline-block text-sm font-semibold text-navy underline">View public page</Link>
            </div>
          ))}
          {courses.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
              You haven't been assigned any courses yet. Please contact the administrator.
            </div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}
