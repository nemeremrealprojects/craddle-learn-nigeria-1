import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PASS_PERCENT, SUMMER_ENGLISH_SLUG, SUMMER_ENGLISH_TOTAL_LESSONS } from "@/lib/summer-english";

export interface SummerLesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  sort_order: number;
  module_title: string | null;
  notes: string | null;
  objectives: string[] | null;
  vocabulary: string[] | null;
  duration_seconds: number | null;
}

export interface SummerProgressRow {
  lesson_id: string;
  completed: boolean;
  position_seconds: number;
  updated_at: string;
}

export function useSummerCourse() {
  return useQuery({
    queryKey: ["summer-course"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, title, slug, level, description, duration_weeks, image_url")
        .eq("slug", SUMMER_ENGLISH_SLUG)
        .maybeSingle();
      return data;
    },
  });
}

export function useSummerEnrollment(courseId?: string, userId?: string) {
  return useQuery({
    queryKey: ["summer-enrolled", courseId, userId],
    enabled: !!courseId && !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("id, enrolled_at")
        .eq("course_id", courseId!)
        .eq("student_id", userId!)
        .maybeSingle();
      return data;
    },
  });
}

export function useSummerLessons(courseId?: string) {
  return useQuery({
    queryKey: ["summer-lessons", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data } = await supabase
        .from("lessons")
        .select(
          "id, title, description, video_url, thumbnail_url, sort_order, module_title, notes, objectives, vocabulary, duration_seconds",
        )
        .eq("course_id", courseId!)
        .eq("published", true)
        .order("sort_order");
      return (data ?? []) as SummerLesson[];
    },
  });
}

export function useSummerProgress(courseId?: string, userId?: string) {
  return useQuery({
    queryKey: ["summer-progress", courseId, userId],
    enabled: !!courseId && !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("lesson_progress")
        .select("lesson_id, completed, position_seconds, updated_at")
        .eq("course_id", courseId!)
        .eq("student_id", userId!)
        .order("updated_at", { ascending: false });
      return (data ?? []) as SummerProgressRow[];
    },
  });
}

/** Aggregated course stats used by the dashboard. */
export function summarise(lessons: SummerLesson[], progress: SummerProgressRow[]) {
  const completedIds = new Set(progress.filter((p) => p.completed).map((p) => p.lesson_id));
  const totalPlanned = Math.max(SUMMER_ENGLISH_TOTAL_LESSONS, lessons.length);
  const completedCount = completedIds.size;
  const remaining = Math.max(0, totalPlanned - completedCount);
  const percent = totalPlanned ? Math.round((completedCount / totalPlanned) * 100) : 0;
  const timeSpentSeconds = progress.reduce((sum, p) => sum + (p.position_seconds || 0), 0);
  const lastViewed = progress[0] ? lessons.find((l) => l.id === progress[0].lesson_id) ?? null : null;
  const nextLesson =
    lessons.find((l) => !completedIds.has(l.id)) ?? (lastViewed || lessons[0]) ?? null;
  const certificateReady = completedCount >= totalPlanned && totalPlanned > 0;
  return {
    completedIds,
    completedCount,
    remaining,
    percent,
    totalPlanned,
    timeSpentSeconds,
    lastViewed,
    nextLesson,
    certificateReady,
  };
}

/** Records that a lesson was opened (last lesson viewed) without touching completion. */
export async function touchLesson(studentId: string, courseId: string, lessonId: string) {
  const { data } = await supabase
    .from("lesson_progress")
    .update({ updated_at: new Date().toISOString() })
    .eq("student_id", studentId)
    .eq("lesson_id", lessonId)
    .select("lesson_id");
  if (!data || data.length === 0) {
    await supabase
      .from("lesson_progress")
      .insert({ student_id: studentId, course_id: courseId, lesson_id: lessonId, completed: false, position_seconds: 0 });
  }
}

/** Adds learning time (seconds) to the lesson's running total. */
export async function addTimeSpent(studentId: string, lessonId: string, seconds: number) {
  const { data } = await supabase
    .from("lesson_progress")
    .select("position_seconds")
    .eq("student_id", studentId)
    .eq("lesson_id", lessonId)
    .maybeSingle();
  if (!data) return;
  await supabase
    .from("lesson_progress")
    .update({ position_seconds: (data.position_seconds || 0) + seconds })
    .eq("student_id", studentId)
    .eq("lesson_id", lessonId);
}

export async function markLessonCompleted(studentId: string, courseId: string, lessonId: string) {
  await supabase
    .from("lesson_progress")
    .upsert(
      { student_id: studentId, course_id: courseId, lesson_id: lessonId, completed: true },
      { onConflict: "student_id,lesson_id" },
    );
}

/** Tracks time on the lesson page and saves it in 30-second slices. */
export function useTimeTracker(studentId?: string, lessonId?: string) {
  const qc = useQueryClient();
  const pending = useRef(0);
  useEffect(() => {
    if (!studentId || !lessonId) return;
    let cancelled = false;
    const tick = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      pending.current += 30;
    }, 30_000);
    const flush = setInterval(async () => {
      const secs = pending.current;
      if (!secs || cancelled) return;
      pending.current = 0;
      await addTimeSpent(studentId, lessonId, secs);
      qc.invalidateQueries({ queryKey: ["summer-progress"] });
    }, 60_000);
    return () => {
      cancelled = true;
      clearInterval(tick);
      clearInterval(flush);
      const secs = pending.current;
      pending.current = 0;
      if (secs) void addTimeSpent(studentId, lessonId, secs);
    };
  }, [studentId, lessonId, qc]);
}

export const SUMMER_PASS_PERCENT = PASS_PERCENT;
