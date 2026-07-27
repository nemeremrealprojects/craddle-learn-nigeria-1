import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { GraduationCap, Heart, Target, Users } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — CRF Online Academy" },
      { name: "description", content: "Craddle Reading Foundation Online Academy is Nigeria's online Nursery and Primary school." },
      { property: "og:title", content: "About — CRF Online Academy" },
      { property: "og:description", content: "Our story and mission for Nigerian pupils." },
      { property: "og:url", content: "https://craddle-learn-nigeria.lovable.app/about" },
    ],
    links: [{ rel: "canonical", href: "https://craddle-learn-nigeria.lovable.app/about" }],
  }),
  component: AboutPage,
});


function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <section className="bg-hero text-navy-foreground">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <h1 className="font-display text-4xl md:text-5xl font-bold">About CRF Academy</h1>
          <p className="mt-4 max-w-2xl opacity-90">
            Craddle Reading Foundation Online Academy is a fully online Nigerian Nursery and Primary school
            built for the modern parent — flexible, rigorous, and rooted in the Nigerian curriculum.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-14 grid md:grid-cols-2 gap-10 flex-1">
        <div>
          <h2 className="font-display text-2xl font-bold text-navy">Our story</h2>
          <p className="mt-3 text-muted-foreground">
            We started CRF Academy to give every Nigerian child access to excellent Nursery and Primary
            education — no matter where they live. Our platform blends video-first teaching with printable
            workbooks, quizzes and one-on-one teacher feedback so learning at home feels just as complete
            as a classroom.
          </p>
          <h2 className="font-display text-2xl font-bold text-navy mt-8">What we believe</h2>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li>Every child deserves world-class basic education.</li>
            <li>Reading is the foundation of every academic subject.</li>
            <li>Parents are partners — not spectators — in learning.</li>
            <li>Technology should serve teachers, not replace them.</li>
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-4 self-start">
          {[
            { Icon: GraduationCap, t: "Curriculum-aligned", d: "Nigerian Nursery & Primary syllabus." },
            { Icon: Heart, t: "Child-centered", d: "Fun, colorful, age-appropriate teaching." },
            { Icon: Target, t: "Common Entrance ready", d: "Dedicated P6 examination prep." },
            { Icon: Users, t: "Parent partnership", d: "Progress dashboards for every parent." },
          ].map(({ Icon, t, d }) => (
            <div key={t} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <Icon className="h-6 w-6 text-gold-foreground" />
              <div className="mt-3 font-semibold text-navy">{t}</div>
              <div className="text-sm text-muted-foreground mt-1">{d}</div>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}
