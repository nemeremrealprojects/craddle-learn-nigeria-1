import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { verifyPayment } from "@/lib/payments.functions";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { SUMMER_ENGLISH_SLUG } from "@/lib/summer-english";
import { SUMMER_MATHS_SLUG } from "@/lib/summer-maths";



export const Route = createFileRoute("/payment/callback")({
  validateSearch: (s: Record<string, unknown>) => ({
    reference: typeof s.reference === "string" ? s.reference : (typeof s.trxref === "string" ? s.trxref : ""),
  }),
  head: () => ({ meta: [{ title: "Confirming payment — CRF Academy" }, { name: "robots", content: "noindex" }] }),
  component: PaymentCallback,
});

function PaymentCallback() {
  const { reference } = Route.useSearch();
  const verify = useServerFn(verifyPayment);
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "success" | "failed" | "error">("loading");
  const [message, setMessage] = useState("");
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) { setState("error"); setMessage("Missing payment reference."); return; }
    verify({ data: { reference } })
      .then((r) => {
        if (r.status === "success") {
          setState("success");
          setSlug(r.slug ?? null);
          if (r.slug === SUMMER_ENGLISH_SLUG) {
            navigate({ to: "/student/summer-english", replace: true });
          } else if (r.slug === SUMMER_MATHS_SLUG) {
            navigate({ to: "/student/summer-mathematics", replace: true });
          }

        }
        else if (r.status === "failed") { setState("failed"); setMessage(r.message ?? "Payment failed"); }
        else { setState("error"); setMessage(r.message ?? "Verification error"); }
      })
      .catch((e) => { setState("error"); setMessage(e?.message ?? "Could not verify"); });
  }, [reference, verify, navigate]);


  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <section className="flex-1 grid place-items-center px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-elegant text-center">
          {state === "loading" && (<><Loader2 className="h-10 w-10 mx-auto text-navy animate-spin" /><h1 className="mt-4 font-display text-2xl font-bold text-navy">Confirming your payment…</h1></>)}
          {state === "success" && (
            <>
              <CheckCircle2 className="h-12 w-12 mx-auto text-success-foreground" />
              <h1 className="mt-4 font-display text-2xl font-bold text-navy">Payment successful!</h1>
              <p className="mt-2 text-muted-foreground">You now have full access to your course.</p>
              <button onClick={() => slug ? navigate({ to: "/student/courses/$slug", params: { slug } }) : navigate({ to: "/student" })} className="mt-6 rounded-lg bg-gold-gradient text-gold-foreground font-bold px-6 py-3 shadow-gold">
                Start learning
              </button>
            </>
          )}
          {(state === "failed" || state === "error") && (
            <>
              <XCircle className="h-12 w-12 mx-auto text-destructive" />
              <h1 className="mt-4 font-display text-2xl font-bold text-navy">Payment not completed</h1>
              <p className="mt-2 text-muted-foreground">{message}</p>
              <Link to="/courses" className="mt-6 inline-block rounded-lg bg-navy text-navy-foreground font-semibold px-6 py-3">Back to courses</Link>
            </>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}

