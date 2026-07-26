import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Users, BookOpen, CreditCard, Inbox } from "lucide-react";
import { formatNaira } from "@/lib/brand";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin dashboard — CRF Academy" }, { name: "robots", content: "noindex" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [users, courses, payments, admissions] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("payments").select("amount_kobo, status", { count: "exact" }).eq("status", "success"),
        supabase.from("admissions").select("id", { count: "exact", head: true }),
      ]);
      const revenue = (payments.data ?? []).reduce((s, p: any) => s + p.amount_kobo, 0);
      return {
        users: users.count ?? 0,
        courses: courses.count ?? 0,
        revenue,
        payments: payments.count ?? 0,
        admissions: admissions.count ?? 0,
      };
    },
  });

  const { data: recentAdmissions = [] } = useQuery({
    queryKey: ["admin-recent-admissions"],
    queryFn: async () => (await supabase.from("admissions").select("*").order("created_at", { ascending: false }).limit(10)).data ?? [],
  });
  const { data: recentPayments = [] } = useQuery({
    queryKey: ["admin-recent-payments"],
    queryFn: async () => (await supabase.from("payments").select("*, courses(title)").order("created_at", { ascending: false }).limit(10)).data ?? [],
  });

  const s = stats.data;
  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Header />
      <section className="mx-auto max-w-7xl w-full px-4 py-10 flex-1">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-navy">Admin dashboard</h1>

        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard Icon={Users} label="Users" value={s?.users ?? "—"} />
          <StatCard Icon={BookOpen} label="Courses" value={s?.courses ?? "—"} />
          <StatCard Icon={CreditCard} label="Revenue" value={s ? formatNaira(s.revenue) : "—"} />
          <StatCard Icon={Inbox} label="Admissions" value={s?.admissions ?? "—"} />
        </div>

        <div className="mt-10 grid lg:grid-cols-2 gap-6">
          <Panel title="Recent admissions">
            {recentAdmissions.length === 0 ? <Empty>No admissions yet.</Empty> :
              <ul className="divide-y divide-border">
                {recentAdmissions.map((a) => (
                  <li key={a.id} className="py-3">
                    <div className="font-semibold text-navy">{a.parent_name} — {a.child_name}</div>
                    <div className="text-sm text-muted-foreground">{a.level} · {a.parent_phone} · {a.parent_email}</div>
                  </li>
                ))}
              </ul>}
          </Panel>
          <Panel title="Recent payments">
            {recentPayments.length === 0 ? <Empty>No payments yet.</Empty> :
              <ul className="divide-y divide-border">
                {recentPayments.map((p: any) => (
                  <li key={p.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-navy">{p.courses?.title ?? "Course"}</div>
                      <div className="text-xs text-muted-foreground">{p.reference}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-navy">{formatNaira(p.amount_kobo)}</div>
                      <StatusPill status={p.status} />
                    </div>
                  </li>
                ))}
              </ul>}
          </Panel>
        </div>
      </section>
      <Footer />
    </div>
  );
}

function StatCard({ Icon, label, value }: { Icon: any; label: string; value: any }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <Icon className="h-5 w-5 text-gold-foreground" />
      <div className="mt-3 text-sm text-muted-foreground">{label}</div>
      <div className="font-display text-3xl font-bold text-navy">{value}</div>
    </div>
  );
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <h3 className="font-display text-lg font-bold text-navy">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-muted-foreground py-6 text-center">{children}</div>;
}
function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = { success: "bg-success text-success-foreground", pending: "bg-muted text-navy", failed: "bg-destructive text-destructive-foreground" };
  return <span className={`inline-block text-xs font-bold uppercase px-2 py-0.5 rounded ${map[status] ?? "bg-muted"}`}>{status}</span>;
}
