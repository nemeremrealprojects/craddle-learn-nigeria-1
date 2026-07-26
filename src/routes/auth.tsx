import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, primaryRole } from "@/lib/auth-context";
import { Link as LinkIcon } from "lucide-react";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({ redirect: typeof s.redirect === "string" ? s.redirect : undefined }),
  head: () => ({
    meta: [
      { title: "Sign in — CRF Online Academy" },
      { name: "description", content: "Sign in or create your CRF Academy account to access your courses." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect: redirectTo } = Route.useSearch();
  const navigate = useNavigate();
  const { user, roles, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [form, setForm] = useState({ email: "", password: "", full_name: "", phone: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    if (redirectTo && redirectTo.startsWith("/")) {
      navigate({ to: redirectTo });
    } else {
      const r = primaryRole(roles);
      navigate({ to: r === "admin" ? "/admin" : r === "teacher" ? "/teacher" : r === "parent" ? "/parent" : "/student" });
    }
  }, [user, authLoading, roles, redirectTo, navigate]);

  const schema = mode === "signup"
    ? z.object({
        full_name: z.string().trim().min(2, "Enter your full name").max(100),
        phone: z.string().trim().min(6, "Enter a valid phone number").max(20),
        email: z.string().email("Enter a valid email").max(200),
        password: z.string().min(6, "Password must be at least 6 characters").max(100),
      })
    : z.object({
        email: z.string().email(),
        password: z.string().min(1),
        full_name: z.string().optional(),
        phone: z.string().optional(),
      });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: form.full_name, phone: form.phone },
          },
        });
        if (error) throw error;
        toast.success("Account created!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (err: any) {
      toast.error(err?.message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-cream">
      <div className="hidden lg:flex flex-col justify-between bg-hero text-navy-foreground p-12">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="grid place-items-center h-9 w-9 rounded-lg bg-white/10">
            <GraduationCap className="h-5 w-5 text-gold" />
          </span>
          CRF Academy
        </Link>
        <div>
          <h2 className="font-display text-4xl font-bold leading-tight">
            Welcome to Nigeria's premium <span className="text-gold">online Nursery & Primary</span> school.
          </h2>
          <p className="mt-4 opacity-90 max-w-md">
            Sign in to access your courses, watch video lessons, download materials, take quizzes, and monitor progress.
          </p>
        </div>
        <div className="text-sm opacity-70">© {new Date().getFullYear()} CRF Online Academy</div>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-elegant">
          <div className="flex gap-2 mb-6 p-1 rounded-lg bg-muted">
            <button onClick={() => setMode("signin")} className={`flex-1 py-2 rounded-md text-sm font-semibold ${mode === "signin" ? "bg-background shadow" : "text-muted-foreground"}`}>Sign in</button>
            <button onClick={() => setMode("signup")} className={`flex-1 py-2 rounded-md text-sm font-semibold ${mode === "signup" ? "bg-background shadow" : "text-muted-foreground"}`}>Create account</button>
          </div>
          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <>
                <Field label="Full name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
                <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              </>
            )}
            <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <Field label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
            <button disabled={busy} className="w-full mt-2 rounded-lg bg-navy text-navy-foreground font-semibold py-3 shadow-elegant hover:opacity-95 disabled:opacity-60 inline-flex items-center justify-center gap-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} {mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you agree to our terms and privacy policy.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-navy">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
    </label>
  );
}
