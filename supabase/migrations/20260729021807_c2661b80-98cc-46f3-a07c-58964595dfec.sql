
-- 1. CERTIFICATES: remove direct student insert, add SECURITY DEFINER issuer
DROP POLICY IF EXISTS cert_insert ON public.certificates;

CREATE OR REPLACE FUNCTION public.issue_certificate(_course_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _lessons int;
  _completed int;
  _cert_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.enrollments WHERE student_id=_uid AND course_id=_course_id) THEN
    RAISE EXCEPTION 'not enrolled';
  END IF;
  SELECT count(*) INTO _lessons FROM public.lessons WHERE course_id=_course_id;
  IF _lessons = 0 THEN RAISE EXCEPTION 'course has no lessons'; END IF;
  SELECT count(*) INTO _completed FROM public.lesson_progress lp
    JOIN public.lessons l ON l.id=lp.lesson_id
    WHERE lp.student_id=_uid AND l.course_id=_course_id AND lp.completed=true;
  IF _completed < _lessons THEN RAISE EXCEPTION 'course not fully completed'; END IF;

  INSERT INTO public.certificates(student_id, course_id) VALUES (_uid, _course_id)
  ON CONFLICT (student_id, course_id) DO UPDATE SET student_id=EXCLUDED.student_id
  RETURNING id INTO _cert_id;
  RETURN _cert_id;
END;
$$;
REVOKE ALL ON FUNCTION public.issue_certificate(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_certificate(uuid) TO authenticated;


-- 2. QUIZ_ATTEMPTS: remove direct insert, add grading function
DROP POLICY IF EXISTS qa_insert ON public.quiz_attempts;

CREATE OR REPLACE FUNCTION public.submit_quiz(_quiz_id uuid, _answers jsonb)
RETURNS TABLE(attempt_id uuid, score int, total int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _course_id uuid;
  _score int := 0;
  _total int := 0;
  _attempt uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT course_id INTO _course_id FROM public.quizzes WHERE id=_quiz_id;
  IF _course_id IS NULL THEN RAISE EXCEPTION 'quiz not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.enrollments WHERE student_id=_uid AND course_id=_course_id) THEN
    RAISE EXCEPTION 'not enrolled';
  END IF;

  SELECT
    count(*),
    count(*) FILTER (
      WHERE (_answers->>(qq.id::text))::int = qq.correct_index
    )
  INTO _total, _score
  FROM public.quiz_questions qq
  WHERE qq.quiz_id = _quiz_id;

  INSERT INTO public.quiz_attempts(quiz_id, student_id, score, total, answers)
  VALUES (_quiz_id, _uid, _score, _total, _answers)
  RETURNING id INTO _attempt;

  RETURN QUERY SELECT _attempt, _score, _total;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_quiz(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_quiz(uuid, jsonb) TO authenticated;


-- 3. SUBMISSIONS: prevent students from writing grading columns
DROP POLICY IF EXISTS submissions_update ON public.submissions;

CREATE POLICY submissions_student_update ON public.submissions
FOR UPDATE TO authenticated
USING (auth.uid() = student_id AND status = 'pending'::submission_status)
WITH CHECK (auth.uid() = student_id AND status = 'pending'::submission_status);

CREATE POLICY submissions_staff_update ON public.submissions
FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'teacher'::app_role))
WITH CHECK (private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'teacher'::app_role));

CREATE OR REPLACE FUNCTION public.submissions_guard_student_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'teacher'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.score IS DISTINCT FROM OLD.score
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.feedback IS DISTINCT FROM OLD.feedback
     OR NEW.graded_at IS DISTINCT FROM OLD.graded_at
     OR NEW.student_id IS DISTINCT FROM OLD.student_id
     OR NEW.assignment_id IS DISTINCT FROM OLD.assignment_id THEN
    RAISE EXCEPTION 'students cannot modify grading fields';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS submissions_guard_student_columns ON public.submissions;
CREATE TRIGGER submissions_guard_student_columns
BEFORE UPDATE ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.submissions_guard_student_columns();


-- 4. ANNOUNCEMENTS: filter by audience + role
DROP POLICY IF EXISTS ann_read ON public.announcements;
CREATE POLICY ann_read ON public.announcements
FOR SELECT TO authenticated
USING (
  audience = 'all'
  OR (audience = 'students' AND private.has_role(auth.uid(),'student'::app_role))
  OR (audience = 'parents'  AND private.has_role(auth.uid(),'parent'::app_role))
  OR (audience = 'teachers' AND private.has_role(auth.uid(),'teacher'::app_role))
  OR private.has_role(auth.uid(),'admin'::app_role)
);


-- 5. ADMISSIONS: ensure anon cannot read
REVOKE SELECT ON public.admissions FROM anon;


-- 6. QUIZ_QUESTIONS: hide correct_index from students; add helper for per-answer feedback
REVOKE SELECT (correct_index) ON public.quiz_questions FROM authenticated;
REVOKE SELECT (correct_index) ON public.quiz_questions FROM anon;
GRANT SELECT (correct_index) ON public.quiz_questions TO service_role;

CREATE OR REPLACE FUNCTION public.check_quiz_answer(_question_id uuid, _answer int)
RETURNS TABLE(is_correct boolean, correct_index int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _quiz_id uuid;
  _course_id uuid;
  _correct int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT qq.quiz_id, qq.correct_index INTO _quiz_id, _correct
  FROM public.quiz_questions qq WHERE qq.id = _question_id;
  IF _quiz_id IS NULL THEN RAISE EXCEPTION 'question not found'; END IF;
  SELECT q.course_id INTO _course_id FROM public.quizzes q WHERE q.id = _quiz_id;
  IF NOT (
       private.has_role(_uid,'admin'::app_role)
    OR private.has_role(_uid,'teacher'::app_role)
    OR EXISTS (SELECT 1 FROM public.enrollments WHERE student_id=_uid AND course_id=_course_id)
  ) THEN
    RAISE EXCEPTION 'not enrolled';
  END IF;
  RETURN QUERY SELECT (_answer = _correct), _correct;
END;
$$;
REVOKE ALL ON FUNCTION public.check_quiz_answer(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_quiz_answer(uuid, int) TO authenticated;
