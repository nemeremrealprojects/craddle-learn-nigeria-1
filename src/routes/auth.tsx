import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, primaryRole } from "@/lib/auth-context";


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
  const [pendingEmail, setPendingEmail] = useState("");
  const [pasted, setPasted] = useState("");

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
        // Always send confirmation links to the stable production URL so
        // links don't break when preview URLs change, and Gmail is less
        // likely to flag them as suspicious.
        const productionOrigin = "https://craddle-learn-nigeria.lovable.app";
        const isLocalDev =
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1";
        const redirectBase = isLocalDev ? window.location.origin : productionOrigin;
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            emailRedirectTo: `${redirectBase}/auth/callback`,
            data: { full_name: form.full_name, phone: form.phone },
          },
        });
        if (error) throw error;
        setPendingEmail(form.email);
        toast.success("Account created! Check your email to confirm.");
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

  async function resend() {
    if (!pendingEmail) return;
    setBusy(true);
    try {
      const productionOrigin = "https://craddle-learn-nigeria.lovable.app";
      const isLocalDev =
        window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      const redirectBase = isLocalDev ? window.location.origin : productionOrigin;
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: pendingEmail,
        options: { emailRedirectTo: `${redirectBase}/auth/callback` },
      });
      if (error) throw error;
      toast.success("Verification email sent again");
    } catch (err: any) {
      toast.error(err?.message || "Could not resend the email");
    } finally {
      setBusy(false);
    }
  }

  // Lets the learner finish verification by pasting the link (or the 6-digit
  // code) from the email — useful on Android Gmail, which can suppress taps on
  // links from shared senders.
  async function verifyPasted() {
    const value = pasted.trim();
    if (!value) return toast.error("Paste the link or code from your email first");
    setBusy(true);
    try {
      if (/^https?:\/\//i.test(value)) {
        const url = new URL(value);
        const params = new URLSearchParams(url.search);
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
        const get = (k: string) => params.get(k) ?? hashParams.get(k);

        const tokenHash = get("token_hash");
        const code = get("code");
        const token = get("token");
        const type = (get("type") || "signup") as "signup" | "email" | "recovery" | "magiclink";

        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (error) throw error;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (token) {
          const { error } = await supabase.auth.verifyOtp({
            token,
            type: type === "recovery" ? "recovery" : "signup",
            email: pendingEmail || form.email,
          });
          if (error) throw error;
        } else {
          // A tracking/redirect link we can't decode here — open it directly.
          window.open(value, "_blank", "noopener");
          toast.message("Opening the verification link in a new tab…");
          return;
        }
      } else {
        const codeOnly = value.replace(/\s+/g, "");
        if (!/^\d{6}$/.test(codeOnly)) throw new Error("That doesn't look like a valid link or 6-digit code");
        const { error } = await supabase.auth.verifyOtp({
          email: pendingEmail || form.email,
          token: codeOnly,
          type: "signup",
        });
        if (error) throw error;
      }

      toast.success("Email confirmed! Signing you in…");
      const { data } = await supabase.auth.getUser();
      if (data.user) navigate({ to: "/student" });
    } catch (err: any) {
      toast.error(err?.message || "Could not verify with that link or code");
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

          <div className="mt-6 rounded-xl border border-border bg-muted/40 p-4">
            <div className="flex items-center gap-2 text-navy">
              <MailCheck className="h-4 w-4 text-gold" />
              <span className="text-sm font-semibold">Trouble with the “Verify Email” button?</span>
            </div>
            <ol className="mt-2 space-y-1 text-xs text-muted-foreground list-decimal pl-4">
              <li>Open the email and <strong>long-press</strong> the “Verify Email” button.</li>
              <li>Tap <strong>Copy link address</strong> (or “Open link”).</li>
              <li>Paste it below and tap <strong>Verify now</strong>.</li>
            </ol>
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              rows={2}
              placeholder="Paste the verification link or 6-digit code"
              className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={verifyPasted}
                disabled={busy}
                className="flex-1 min-w-[8rem] rounded-md bg-navy text-navy-foreground text-xs font-semibold py-2 disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {busy && <Loader2 className="h-3 w-3 animate-spin" />} Verify now
              </button>
              <button
                type="button"
                onClick={resend}
                disabled={busy || !(pendingEmail || form.email)}
                onMouseDown={() => { if (!pendingEmail && form.email) setPendingEmail(form.email); }}
                className="rounded-md border border-border bg-background text-xs font-semibold px-3 py-2 disabled:opacity-60"
              >
                Resend email
              </button>
            </div>
          </div>

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
