import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth-context";
import { ArrowUp, ArrowDown, Eye, EyeOff, Pencil, Trash2, Plus, Loader2, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/videos")({
  head: () => ({
    meta: [
      { title: "Course Videos — CRF Academy admin" },
      { name: "description", content: "Add, edit, reorder and publish YouTube lesson videos for CRF Academy courses." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CourseVideosPage,
});

/** Extracts the 11-char YouTube id from any common YouTube URL form. */
export function youtubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([A-Za-z0-9_-]{11})/,
    /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube-nocookie\.com\/embed\/)([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  if (/^[A-Za-z0-9_-]{11}$/.test(url.trim())) return url.trim();
  return null;
}

type LessonRow = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  sort_order: number;
  published: boolean;
};

const emptyForm = { title: "", description: "", video_url: "", thumbnail_url: "", sort_order: "", published: true };

function CourseVideosPage() {
  const { roles, loading } = useAuth();
  const isAdmin = roles.includes("admin");
  const qc = useQueryClient();
  const [courseId, setCourseId] = useState<string>("");
  const [editing, setEditing] = useState<LessonRow | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: courses = [] } = useQuery({
    queryKey: ["admin-courses"],
    enabled: isAdmin,
    queryFn: async () =>
      (await supabase.from("courses").select("id, title, slug, category, level").order("sort_order")).data ?? [],
  });

  useEffect(() => {
    if (!courseId && courses.length) setCourseId(courses[0].id);
  }, [courses, courseId]);

  const lessonsQuery = useQuery({
    queryKey: ["admin-lessons", courseId],
    enabled: isAdmin && !!courseId,
    queryFn: async () =>
      ((await supabase.from("lessons").select("*").eq("course_id", courseId).order("sort_order")).data ?? []) as LessonRow[],
  });
  const lessons = lessonsQuery.data ?? [];
  const activeCourse = courses.find((c: any) => c.id === courseId);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-lessons", courseId] });
    qc.invalidateQueries({ queryKey: ["s-lessons"] });
  }

  const save = useMutation({
    mutationFn: async () => {
      const id = youtubeId(form.video_url);
      if (!form.title.trim()) throw new Error("Lesson title is required");
      if (!id) throw new Error("Paste a valid YouTube URL");
      const payload = {
        course_id: courseId,
        title: form.title.trim().slice(0, 160),
        description: form.description.trim().slice(0, 1000) || null,
        video_url: `https://www.youtube.com/watch?v=${id}`,
        thumbnail_url: form.thumbnail_url.trim() || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        sort_order: form.sort_order === "" ? lessons.length + 1 : Number(form.sort_order),
        published: form.published,
      };
      if (editing) {
        const { error } = await supabase.from("lessons").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lessons").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Lesson updated" : "Lesson added to the course");
      setEditing(null);
      setForm(emptyForm);
      refresh();
    },
    onError: (e: any) => toast.error(e?.message || "Could not save lesson"),
  });

  const patch = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<LessonRow> }) => {
      const { error } = await supabase.from("lessons").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: any) => toast.error(e?.message || "Update failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lessons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lesson deleted");
      refresh();
    },
    onError: (e: any) => toast.error(e?.message || "Delete failed"),
  });

  async function move(index: number, dir: -1 | 1) {
    const a = lessons[index];
    const b = lessons[index + dir];
    if (!a || !b) return;
    await patch.mutateAsync({ id: a.id, values: { sort_order: b.sort_order } });
    await patch.mutateAsync({ id: b.id, values: { sort_order: a.sort_order } });
  }

  function startEdit(l: LessonRow) {
    setEditing(l);
    setForm({
      title: l.title,
      description: l.description ?? "",
      video_url: l.video_url ?? "",
      thumbnail_url: l.thumbnail_url ?? "",
      sort_order: String(l.sort_order),
      published: l.published,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-cream">
        <Header />
        <div className="flex-1 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-navy" /></div>
        <Footer />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-cream">
        <Header />
        <section className="mx-auto max-w-3xl w-full px-4 py-20 flex-1 text-center">
          <h1 className="font-display text-3xl font-bold text-navy">Administrators only</h1>
          <p className="mt-3 text-muted-foreground">You do not have permission to manage course videos.</p>
          <Link to="/" className="mt-6 inline-block rounded-lg bg-navy text-navy-foreground font-bold px-5 py-2.5">Back to home</Link>
        </section>
        <Footer />
      </div>
    );
  }

  const previewId = youtubeId(form.video_url);

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Header />
      <section className="mx-auto max-w-7xl w-full px-4 py-10 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-navy">Course Videos</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Add YouTube lessons to any existing course. Saved lessons appear on the course page instantly.
            </p>
          </div>
          <Link to="/admin" className="text-sm font-semibold text-navy underline">Back to admin dashboard</Link>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card">
          <label className="block text-sm font-semibold text-navy" htmlFor="course-select">Select course</label>
          <select
            id="course-select"
            value={courseId}
            onChange={(e) => { setCourseId(e.target.value); setEditing(null); setForm(emptyForm); }}
            className="mt-2 w-full md:max-w-xl rounded-lg border border-border bg-background px-3 py-2.5"
          >
            {courses.map((c: any) => (
              <option key={c.id} value={c.id}>{c.title} — {c.level}</option>
            ))}
          </select>
          {activeCourse && (
            <Link to="/courses/$slug" params={{ slug: (activeCourse as any).slug }} className="mt-2 inline-block text-xs text-navy underline">
              View public course page
            </Link>
          )}
        </div>

        <div className="mt-6 grid lg:grid-cols-5 gap-6">
          <form
            onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
            className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-card h-fit space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-navy">{editing ? "Edit lesson" : "Add new lesson"}</h2>
              {editing && (
                <button type="button" onClick={() => { setEditing(null); setForm(emptyForm); }} className="text-xs text-muted-foreground flex items-center gap-1">
                  <X className="h-3 w-3" /> Cancel
                </button>
              )}
            </div>

            <Field label="YouTube video URL">
              <input
                required
                value={form.video_url}
                onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
                maxLength={300}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5"
              />
            </Field>
            {form.video_url && !previewId && <p className="text-xs text-destructive">That does not look like a YouTube link.</p>}
            {previewId && (
              <div className="aspect-video w-full overflow-hidden rounded-lg border border-border">
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube.com/embed/${previewId}`}
                  title="Lesson video preview"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}

            <Field label="Lesson title">
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={160}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5"
              />
            </Field>
            <Field label="Short description">
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                maxLength={1000}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5"
              />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Order / position">
                <input
                  type="number"
                  min={1}
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                  placeholder={String(lessons.length + 1)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5"
                />
              </Field>
              <Field label="Thumbnail URL (optional)">
                <input
                  value={form.thumbnail_url}
                  onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
                  placeholder="Auto from YouTube"
                  maxLength={500}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5"
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-navy">
              <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
              Published (visible to enrolled students)
            </label>

            <button
              type="submit"
              disabled={save.isPending || !courseId}
              className="w-full rounded-lg bg-gold-gradient text-gold-foreground font-bold py-3 shadow-gold hover:opacity-95 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {editing ? "Save changes" : "Save lesson"}
            </button>
          </form>

          <div className="lg:col-span-3 rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="font-display text-lg font-bold text-navy">
              Lessons in this course {lessons.length ? `(${lessons.length})` : ""}
            </h2>
            {lessonsQuery.isLoading ? (
              <div className="py-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-navy" /></div>
            ) : lessons.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No lessons yet. Add the first video on the left.</p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {lessons.map((l, i) => {
                  const vid = youtubeId(l.video_url ?? "");
                  return (
                    <li key={l.id} className="py-4 flex gap-4">
                      <div className="h-16 w-28 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                        {(l.thumbnail_url || vid) && (
                          <img
                            src={l.thumbnail_url || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`}
                            alt={`${l.title} thumbnail`}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground">#{l.sort_order}</span>
                          <span className="font-semibold text-navy truncate">{l.title}</span>
                          {!l.published && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-muted text-navy">Hidden</span>
                          )}
                        </div>
                        {l.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{l.description}</p>}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                          <button onClick={() => move(i, -1)} disabled={i === 0} className="flex items-center gap-1 text-navy disabled:opacity-40"><ArrowUp className="h-3.5 w-3.5" /> Up</button>
                          <button onClick={() => move(i, 1)} disabled={i === lessons.length - 1} className="flex items-center gap-1 text-navy disabled:opacity-40"><ArrowDown className="h-3.5 w-3.5" /> Down</button>
                          <button onClick={() => patch.mutate({ id: l.id, values: { published: !l.published } })} className="flex items-center gap-1 text-navy">
                            {l.published ? <><EyeOff className="h-3.5 w-3.5" /> Hide</> : <><Eye className="h-3.5 w-3.5" /> Publish</>}
                          </button>
                          <button onClick={() => startEdit(l)} className="flex items-center gap-1 text-navy"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                          <button
                            onClick={() => { if (window.confirm(`Delete "${l.title}"?`)) remove.mutate(l.id); }}
                            className="flex items-center gap-1 text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-navy">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
