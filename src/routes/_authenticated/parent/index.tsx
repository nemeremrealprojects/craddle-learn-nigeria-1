import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Heart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/parent/")({
  head: () => ({ meta: [{ title: "Parent dashboard — CRF Academy" }, { name: "robots", content: "noindex" }] }),
  component: ParentDashboard,
});

function ParentDashboard() {
  const { user } = useAuth();
  const { data: children = [] } = useQuery({
    queryKey: ["parent-children", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("parent_children").select("child_id, profiles:child_id(full_name)").eq("parent_id", user!.id)).data ?? [],
  });

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Header />
      <section className="mx-auto max-w-5xl w-full px-4 py-10 flex-1">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-navy">Parent dashboard</h1>
        <p className="text-muted-foreground mt-1">Monitor your child's learning progress.</p>
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-card">
          <Heart className="h-5 w-5 text-gold-foreground" />
          <h3 className="mt-2 font-display text-xl font-bold text-navy">Linked children</h3>
          {children.length === 0 ? (
            <p className="mt-2 text-muted-foreground text-sm">
              No child accounts linked yet. Please contact CRF Academy to link your parent account to your child's learner profile.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {children.map((c: any) => (
                <li key={c.child_id} className="rounded-lg border border-border p-3">
                  <div className="font-semibold text-navy">{c.profiles?.full_name ?? "Child"}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}
