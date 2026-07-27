import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Phone, Mail, MessageSquare, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { CRF_CONTACT } from "@/lib/brand";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — CRF Online Academy" },
      { name: "description", content: `Call or WhatsApp us on ${CRF_CONTACT.phone1} or ${CRF_CONTACT.phone2}.` },
      { property: "og:title", content: "Contact — CRF Online Academy" },
      { property: "og:description", content: "Get in touch with the CRF Academy team." },
      { property: "og:url", content: "https://craddle-learn-nigeria.lovable.app/contact" },
    ],
    links: [{ rel: "canonical", href: "https://craddle-learn-nigeria.lovable.app/contact" }],
  }),
  component: ContactPage,
});


function ContactPage() {
  const [form, setForm] = useState({ parent_name: "", parent_phone: "", parent_email: "", child_name: "", level: "Primary 1", notes: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("admissions").insert({ ...form, child_age: null });
    setLoading(false);
    if (error) {
      toast.error("Could not send. Please try again.");
      return;
    }
    setDone(true);
    toast.success("Message sent. We'll get back within 24 hours.");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <section className="bg-hero text-navy-foreground">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <h1 className="font-display text-4xl md:text-5xl font-bold">Talk to us</h1>
          <p className="mt-3 opacity-90 max-w-2xl">
            Call, WhatsApp, or send us a message. Our team responds to every parent inquiry within 24 hours.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-14 grid lg:grid-cols-3 gap-10 flex-1">
        <div className="space-y-4">
          {[
            { Icon: Phone, t: "Call or WhatsApp", d: CRF_CONTACT.phone1 },
            { Icon: Phone, t: "Alternate line", d: CRF_CONTACT.phone2 },
            { Icon: Mail, t: "Email", d: CRF_CONTACT.email },
            { Icon: MessageSquare, t: "Support hours", d: "Mon–Sun · 8 AM – 8 PM WAT" },
          ].map(({ Icon, t, d }) => (
            <div key={t} className="rounded-2xl border border-border bg-card p-5 shadow-card flex gap-3 items-start">
              <span className="grid place-items-center h-10 w-10 rounded-lg bg-navy text-navy-foreground">
                <Icon className="h-5 w-5 text-gold" />
              </span>
              <div>
                <div className="font-semibold text-navy">{t}</div>
                <div className="text-sm text-muted-foreground">{d}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 md:p-8 shadow-card">
          {done ? (
            <div className="text-center py-10">
              <div className="grid place-items-center h-14 w-14 mx-auto rounded-full bg-success text-success-foreground">✓</div>
              <h3 className="mt-4 font-display text-2xl font-bold text-navy">Thank you!</h3>
              <p className="mt-2 text-muted-foreground">We've received your message and will call or email you shortly.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <h2 className="font-display text-2xl font-bold text-navy">Send us a message</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Your name" value={form.parent_name} onChange={(v) => setForm({ ...form, parent_name: v })} required />
                <Field label="Phone number" value={form.parent_phone} onChange={(v) => setForm({ ...form, parent_phone: v })} required />
                <Field label="Email" type="email" value={form.parent_email} onChange={(v) => setForm({ ...form, parent_email: v })} required />
                <Field label="Child's name" value={form.child_name} onChange={(v) => setForm({ ...form, child_name: v })} required />
                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-navy">Class / level</label>
                  <select className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                    {["Kindergarten","Primary 1","Primary 2","Primary 3","Primary 4","Primary 5","Primary 6","Summer"].map((l) => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-navy">Message</label>
                  <textarea className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-32" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <button disabled={loading} className="rounded-lg bg-navy text-navy-foreground font-semibold px-6 py-3 shadow-elegant hover:opacity-95 disabled:opacity-60 inline-flex items-center gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Send message
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
