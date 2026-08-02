ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

DROP POLICY IF EXISTS lessons_read ON public.lessons;
CREATE POLICY lessons_read ON public.lessons
FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::app_role)
  OR private.has_role(auth.uid(), 'teacher'::app_role)
  OR (
    published = true
    AND EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id = lessons.course_id AND e.student_id = auth.uid()
    )
  )
);