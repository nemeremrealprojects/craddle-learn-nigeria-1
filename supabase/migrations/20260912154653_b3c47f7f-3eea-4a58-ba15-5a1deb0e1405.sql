-- 1. Restore enrollments from verified successful payments (idempotent, additive only)
CREATE OR REPLACE FUNCTION public.sync_my_enrollments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _added integer := 0;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.enrollments (student_id, course_id)
  SELECT DISTINCT p.student_id, p.course_id
  FROM public.payments p
  WHERE p.student_id = _uid
    AND p.status = 'success'
    AND NOT EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.student_id = p.student_id AND e.course_id = p.course_id
    );
  GET DIAGNOSTICS _added = ROW_COUNT;
  RETURN _added;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_my_enrollments() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_my_enrollments() TO authenticated;

-- One-time backfill for historical successful payments with no enrollment row
INSERT INTO public.enrollments (student_id, course_id)
SELECT DISTINCT p.student_id, p.course_id
FROM public.payments p
WHERE p.status = 'success'
  AND NOT EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.student_id = p.student_id AND e.course_id = p.course_id
  );

-- 2. Week 1 content for Primary 6 Reading Skills
WITH c AS (SELECT id FROM public.courses WHERE slug = 'p6-reading'),
ins_lesson AS (
  INSERT INTO public.lessons (course_id, title, description, video_url, sort_order, published, module_title, notes, objectives, vocabulary, duration_seconds)
  SELECT c.id,
    'What Good Readers Do',
    'Lesson 1 of Week 1 · Estimated time: 35–45 minutes. Learn what active readers do, find the main idea, use clues and check your understanding.',
    'https://www.youtube.com/watch?v=n9lDqCO0pBQ',
    1, true,
    'Week 1 — Reading Foundations',
    E'WHAT DOES IT MEAN TO BE A GOOD READER?\n\nWhen we read, our goal is not simply to say the words correctly. Our goal is to understand what the words mean.\n\nA good reader actively thinks while reading.\n\n1. THINK BEFORE READING\nGood readers look at the title and think about what the text might be about.\n\n2. ASK QUESTIONS\nGood readers ask questions such as: What is happening? Why did this happen? What might happen next?\n\n3. LOOK FOR IMPORTANT INFORMATION\nGood readers identify the main idea and the details that support it.\n\n4. USE CLUES\nWhen a reader finds an unfamiliar word or idea, they look at the surrounding words and sentences for clues.\n\n5. MAKE CONNECTIONS\nGood readers connect what they are reading to things they already know or have experienced.\n\n6. CHECK THEIR UNDERSTANDING\nReaders ask themselves: "Do I understand what I just read?" If they do not understand, they reread the section.',
    ARRAY[
      'Explain what an active reader does.',
      'Identify the main idea of a passage.',
      'Find important details in a text.',
      'Use clues in a passage to understand meaning.',
      'Check their understanding while reading.'
    ],
    ARRAY['Prediction','Main idea','Detail','Context clue','Unfamiliar','Reread'],
    2400
  FROM c
  WHERE NOT EXISTS (
    SELECT 1 FROM public.lessons l WHERE l.course_id = (SELECT id FROM c) AND l.sort_order = 1
  )
  RETURNING id, course_id
),
l AS (SELECT id, course_id FROM ins_lesson),
ins_material AS (
  INSERT INTO public.materials (course_id, lesson_id, title, description, file_url, material_type, sort_order)
  SELECT l.course_id, l.id,
    'Week 1 — Reading Foundations Worksheet',
    'Six written questions on the passage “The New School Library”. Download, print or answer in your notebook.',
    '/worksheets/p6-reading-week-1-reading-foundations.pdf', 'pdf', 1
  FROM l
  RETURNING id
),
ins_quiz AS (
  INSERT INTO public.quizzes (course_id, lesson_id, title, description, pass_score)
  SELECT l.course_id, l.id, 'Week 1 Quiz — Reading Foundations',
    'Five questions. You need 4 out of 5 to pass. Unlimited retries.', 4
  FROM l
  RETURNING id
),
ins_q AS (
  INSERT INTO public.quiz_questions (quiz_id, question, options, correct_index, sort_order)
  SELECT q.id, v.question, v.options::jsonb, v.correct_index, v.sort_order
  FROM ins_quiz q,
  (VALUES
    ('What is the main purpose of reading?', '["To pronounce every word quickly","To understand meaning","To finish a book first","To memorise every sentence"]', 1, 1),
    ('What should you do when you encounter an unfamiliar word?', '["Always skip it","Stop reading completely","Look for clues around it","Guess randomly"]', 2, 2),
    ('What is a prediction?', '["A fact that has already happened","An educated guess based on clues","A spelling mistake","A summary"]', 1, 3),
    ('What should you do if you don''t understand something you have read?', '["Ignore it","Reread and think about it","Close the book","Skip the entire chapter"]', 1, 4),
    ('Which is something an active reader does?', '["Reads without thinking","Avoids questions","Makes connections and checks understanding","Only reads the first sentence"]', 2, 5)
  ) AS v(question, options, correct_index, sort_order)
  RETURNING id
)
INSERT INTO public.assignments (course_id, lesson_id, title, instructions, max_score)
SELECT l.course_id, l.id, 'Week 1 Assignment — My Reading Strategy',
  E'Write 5–7 sentences explaining:\n\nWhat makes someone a good reader?\n\nYour answer should include at least three reading strategies you learned in this lesson.\n\nYou may upload a PDF, DOC/DOCX or a clear photo of your handwritten work.',
  10
FROM l;