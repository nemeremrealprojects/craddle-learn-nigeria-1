import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Confirming your email — CRF Online Academy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Confirming your email…");

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const errorDescription =
          url.searchParams.get("error_description") ||
          new URLSearchParams(url.hash.replace(/^#/, "")).get("error_description");

        if (errorDescription) throw new Error(errorDescription);

        // PKCE / code exchange flow (default for modern supabase-js email links)
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          // Fallback: implicit flow leaves tokens in the URL hash; supabase-js
          // auto-detects on load, so just make sure a session exists.
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            // Give the client one tick to parse the hash.
            await new Promise((r) => setTimeout(r, 300));
          }
        }

        setMessage("Email confirmed! Redirecting…");
        toast.success("Email confirmed");
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          navigate({ to: "/student" });
        } else {
          navigate({ to: "/auth", search: { redirect: "" } });
        }
      } catch (err: any) {
        toast.error(err?.message || "Could not confirm email");
        setMessage("We couldn't confirm your email. Please try signing in again.");
        setTimeout(() => navigate({ to: "/auth", search: { redirect: "" } }), 2000);

      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen grid place-items-center bg-cream px-4">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-elegant text-center max-w-sm">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-navy" />
        <p className="mt-4 text-sm font-medium text-navy">{message}</p>
      </div>
    </div>
  );
}
