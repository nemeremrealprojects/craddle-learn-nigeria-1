import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const initSchema = z.object({ courseId: z.string().uuid() });

export const initializePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => initSchema.parse(d))
  .handler(async ({ data, context }) => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return { error: "Paystack is not configured yet. Please contact the academy administrator." } as const;

    const { supabase, userId } = context;

    const { data: course, error: cErr } = await supabase
      .from("courses").select("id, title, price_kobo, slug").eq("id", data.courseId).maybeSingle();
    if (cErr || !course) return { error: "Course not found" } as const;

    const { data: existing } = await supabase
      .from("enrollments").select("id").eq("student_id", userId).eq("course_id", course.id).maybeSingle();
    if (existing) return { authorization_url: `${getOrigin(context)}/student/courses/${course.slug}`, alreadyEnrolled: true } as const;

    const { data: userInfo } = await supabase.auth.getUser();
    const email = userInfo.user?.email;
    if (!email) return { error: "Could not read your account email" } as const;

    const origin = getOrigin(context);
    const reference = `crf_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    const psRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        amount: course.price_kobo,
        currency: "NGN",
        reference,
        callback_url: `${origin}/payment/callback?reference=${reference}`,
        metadata: { user_id: userId, course_id: course.id, course_slug: course.slug },
      }),
    });
    const psJson = (await psRes.json()) as any;
    if (!psRes.ok || !psJson?.status) {
      console.error("Paystack init failed", psJson);
      return { error: psJson?.message || "Could not start payment" } as const;
    }

    await supabase.from("payments").insert({
      student_id: userId,
      course_id: course.id,
      amount_kobo: course.price_kobo,
      reference,
      status: "pending",
    });

    return { authorization_url: psJson.data.authorization_url as string, reference } as const;
  });

const verifySchema = z.object({ reference: z.string().min(4).max(120) });

export const verifyPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => verifySchema.parse(d))
  .handler(async ({ data, context }) => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return { status: "error" as const, message: "Paystack not configured" };
    const { supabase, userId } = context;

    const psRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(data.reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const psJson = (await psRes.json()) as any;
    if (!psRes.ok || !psJson?.status) return { status: "error" as const, message: psJson?.message || "Verify failed" };

    const txn = psJson.data;
    const paid = txn?.status === "success";
    const { data: payment } = await supabase
      .from("payments").select("id, course_id, student_id, status").eq("reference", data.reference).maybeSingle();
    if (!payment) return { status: "error" as const, message: "Payment record not found" };
    if (payment.student_id !== userId) return { status: "error" as const, message: "Forbidden" };

    if (paid) {
      await supabase.from("payments").update({ status: "success", verified_at: new Date().toISOString(), paystack_response: txn }).eq("id", payment.id);
      const { data: existing } = await supabase.from("enrollments").select("id").eq("student_id", userId).eq("course_id", payment.course_id).maybeSingle();
      if (!existing) {
        await supabase.from("enrollments").insert({ student_id: userId, course_id: payment.course_id });
      }
      const { data: course } = await supabase.from("courses").select("slug").eq("id", payment.course_id).maybeSingle();
      return { status: "success" as const, slug: course?.slug };
    }
    await supabase.from("payments").update({ status: "failed", paystack_response: txn }).eq("id", payment.id);
    return { status: "failed" as const, message: "Payment was not successful" };
  });

function getOrigin(context: any): string {
  const req: Request | undefined = context?.request;
  const hdr = req?.headers?.get?.("origin") || req?.headers?.get?.("referer");
  if (hdr) {
    try { return new URL(hdr).origin; } catch {}
  }
  return process.env.APP_ORIGIN || "http://localhost:8080";
}
