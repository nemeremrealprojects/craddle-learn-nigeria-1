import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { CRF_CONTACT } from "@/lib/brand";

export const Route = createFileRoute("/admissions")({
  head: () => ({
    meta: [
      { title: "Admissions — CRF Online Academy" },
      { name: "description", content: "Apply for admission to CRF Online Academy — Nursery and Primary online school in Nigeria." },
      { property: "og:title", content: "Admissions — CRF Online Academy" },
      { property: "og:description", content: "Enroll your child in our online Nursery or Primary program." },
    ],
  }),
  component: AdmissionsPage,
});

function AdmissionsPage() {
  const [form, setForm] = useState({ parent_name: "", parent_phone: "", parent_email: "", child_name: "", child_age: "", level: "Primary 1", notes: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("admissions").insert({ ...form, child_age: form.child_age ? Number(form.child_age) : null });
    setLoading(false);
    if (error) return toast.error("Could not submit. Please try again.");
    setDone(true);
    toast.success("Application received!");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <section className="bg-hero text-navy-foreground">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <h1 className="font-display text-4xl md:text-5xl font-bold">Admissions</h1>
          <p className="mt-3 opacity-90 max-w-2xl">
            Applications are open for the current session. Complete the form below and our admissions team will
            contact you within 24 hours on {CRF_CONTACT.phone1}.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 py-14 flex-1">
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-card">
          {done ? (
            <div className="text-center py-10">
              <div className="grid place-items-center h-14 w-14 mx-auto rounded-full bg-success text-success-foreground">✓</div>
              <h3 className="mt-4 font-display text-2xl font-bold text-navy">Application received</h3>
              <p className="mt-2 text-muted-foreground">
                Thank you! Our admissions officer will call you shortly on the phone you provided.
              </p>
              <p className="mt-3 text-sm">Call us: <b>{CRF_CONTACT.phone1}</b> · <b>{CRF_CONTACT.phone2}</b></p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <h2 className="font-display text-2xl font-bold text-navy">Application form</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Parent/Guardian name" value={form.parent_name} onChange={(v) => setForm({ ...form, parent_name: v })} required />
                <Field label="Phone number" value={form.parent_phone} onChange={(v) => setForm({ ...form, parent_phone: v })} required />
                <Field label="Email" type="email" value={form.parent_email} onChange={(v) => setForm({ ...form, parent_email: v })} required />
                <Field label="Child's full name" value={form.child_name} onChange={(v) => setForm({ ...form, child_name: v })} required />
                <Field label="Child's age" type="number" value={form.child_age} onChange={(v) => setForm({ ...form, child_age: v })} />
                <div>
                  <label className="text-sm font-semibold text-navy">Class applying for</label>
                  <select className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                    {["Kindergarten","Primary 1","Primary 2","Primary 3","Primary 4","Primary 5","Primary 6","Summer Program"].map((l) => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-navy">Notes (optional)</label>
                  <textarea className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-24" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <button disabled={loading} className="rounded-lg bg-navy text-navy-foreground font-semibold px-6 py-3 shadow-elegant hover:opacity-95 disabled:opacity-60 inline-flex items-center gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Submit application
              </button>
            </form>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-navy">{label}</span>
      <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
    </label>
  );
}
