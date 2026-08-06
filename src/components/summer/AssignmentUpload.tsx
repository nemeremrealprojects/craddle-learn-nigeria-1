import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ClipboardList, Upload, CheckCircle2, FileUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  ACCEPTED_UPLOAD_LABEL,
  ACCEPTED_UPLOAD_TYPES,
  MAX_UPLOAD_BYTES,
  SUBMISSION_BUCKET,
} from "@/lib/summer-english";

export interface AssignmentData {
  id: string;
  title: string;
  instructions: string | null;
  due_date?: string | null;
}

/** Assignment card with a file upload (PDF / DOCX / JPG / PNG) into private storage. */
export function AssignmentUpload({
  assignment,
  studentId,
  onSubmitted,
}: {
  assignment: AssignmentData;
  studentId: string;
  onSubmitted?: () => void;
}) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: submission } = useQuery({
    queryKey: ["submission", assignment.id, studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("submissions")
        .select("id, status, score, feedback, submitted_at, file_url")
        .eq("assignment_id", assignment.id)
        .eq("student_id", studentId)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  async function submit() {
    const file = fileRef.current?.files?.[0];
    if (!file) return toast.error("Please choose your work to upload first.");
    if (!ACCEPTED_UPLOAD_TYPES.includes(file.type)) return toast.error(`Please upload a ${ACCEPTED_UPLOAD_LABEL} file.`);
    if (file.size > MAX_UPLOAD_BYTES) return toast.error("That file is larger than 10MB. Please upload a smaller one.");

    setBusy(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "dat";
    const path = `${studentId}/${assignment.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(SUBMISSION_BUCKET).upload(path, file, { upsert: false });
    if (upErr) {
      setBusy(false);
      return toast.error(upErr.message);
    }
    const { error } = await supabase.from("submissions").insert({
      assignment_id: assignment.id,
      student_id: studentId,
      content: note || null,
      file_url: path,
      status: "pending",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (fileRef.current) fileRef.current.value = "";
    setNote("");
    qc.invalidateQueries({ queryKey: ["submission", assignment.id] });
    toast.success("Assignment submitted! Your teacher will review it.");
    onSubmitted?.();
  }

  return (
    <section className="rounded-2xl border-2 border-gold/30 bg-gold/5 p-4 sm:p-6">
      <h3 className="inline-flex items-center gap-2 font-display text-xl font-bold text-navy">
        <ClipboardList className="h-5 w-5 text-gold-foreground" /> {assignment.title}
      </h3>
      {assignment.instructions && (
        <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90 md:text-base">{assignment.instructions}</p>
      )}

      {submission ? (
        <div className="mt-4 rounded-xl border border-green-300 bg-green-50 p-4">
          <div className="inline-flex items-center gap-2 font-semibold text-green-800">
            <CheckCircle2 className="h-5 w-5" /> Assignment submitted
          </div>
          <p className="mt-1 text-sm text-green-800/80">
            Sent on {new Date(submission.submitted_at).toLocaleDateString()} ·{" "}
            {submission.status === "graded"
              ? `Graded${submission.score !== null ? `: ${submission.score}` : ""}`
              : "Waiting for your teacher's feedback"}
          </p>
          {submission.feedback && <p className="mt-2 text-sm text-green-900">Teacher: {submission.feedback}</p>}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-sm font-semibold text-navy">Upload your work ({ACCEPTED_UPLOAD_LABEL})</span>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.jpg,.jpeg,.png"
              className="mt-1 block w-full cursor-pointer rounded-lg border border-border bg-card p-2.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-navy file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-navy-foreground"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-navy">Note for your teacher (optional)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={500}
              className="mt-1 block w-full rounded-lg border border-border bg-card p-2.5 text-sm"
              placeholder="I read the alphabet to my mum!"
            />
          </label>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold-gradient p-3 font-bold text-gold-foreground shadow-gold disabled:opacity-60 sm:w-auto sm:px-6"
          >
            {busy ? <Upload className="h-4 w-4 animate-pulse" /> : <FileUp className="h-4 w-4" />}
            {busy ? "Uploading…" : "Submit assignment"}
          </button>
        </div>
      )}
    </section>
  );
}
