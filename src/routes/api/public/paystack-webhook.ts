import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/public/paystack-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) return new Response("Not configured", { status: 503 });
        const raw = await request.text();
        const signature = request.headers.get("x-paystack-signature") ?? "";
        const expected = createHmac("sha512", secret).update(raw).digest("hex");
        const sig = Buffer.from(signature);
        const exp = Buffer.from(expected);
        if (sig.length !== exp.length || !timingSafeEqual(sig, exp)) {
          return new Response("Invalid signature", { status: 401 });
        }
        const event = JSON.parse(raw);
        if (event?.event === "charge.success") {
          const data = event.data;
          const reference: string = data?.reference;
          if (reference) {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const { data: payment } = await supabaseAdmin
              .from("payments").select("id, student_id, course_id, status").eq("reference", reference).maybeSingle();
            if (payment && payment.status !== "success") {
              await supabaseAdmin.from("payments").update({ status: "success", verified_at: new Date().toISOString(), paystack_response: data }).eq("id", payment.id);
              const { data: existing } = await supabaseAdmin
                .from("enrollments").select("id").eq("student_id", payment.student_id).eq("course_id", payment.course_id).maybeSingle();
              if (!existing) {
                await supabaseAdmin.from("enrollments").insert({ student_id: payment.student_id, course_id: payment.course_id });
              }
            }
          }
        }
        return new Response("ok");
      },
    },
  },
});

