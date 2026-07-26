
CREATE TYPE public.app_role AS ENUM ('student', 'parent', 'teacher', 'admin');
CREATE TYPE public.course_category AS ENUM ('kindergarten', 'primary', 'summer');
CREATE TYPE public.payment_status AS ENUM ('pending', 'success', 'failed');
CREATE TYPE public.submission_status AS ENUM ('pending', 'graded');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- USER ROLES + has_role()
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), COALESCE(NEW.raw_user_meta_data->>'phone', ''))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- PARENT-CHILD
CREATE TABLE public.parent_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (parent_id, child_id)
);
GRANT SELECT ON public.parent_children TO authenticated;
GRANT ALL ON public.parent_children TO service_role;
ALTER TABLE public.parent_children ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parent_children_own" ON public.parent_children FOR SELECT TO authenticated USING (auth.uid() = parent_id OR public.has_role(auth.uid(), 'admin'));

-- COURSES
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  category public.course_category NOT NULL,
  level TEXT NOT NULL,
  subject TEXT NOT NULL,
  price_kobo INTEGER NOT NULL DEFAULT 300000,
  duration_weeks INTEGER NOT NULL DEFAULT 12,
  image_url TEXT,
  learning_objectives TEXT[],
  teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.courses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "courses_read" ON public.courses FOR SELECT USING (published = true OR public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "courses_write" ON public.courses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR (public.has_role(auth.uid(), 'teacher') AND teacher_id = auth.uid())) WITH CHECK (public.has_role(auth.uid(), 'admin') OR (public.has_role(auth.uid(), 'teacher') AND teacher_id = auth.uid()));

-- ENROLLMENTS (before lesson/material policies that reference it)
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, course_id)
);
GRANT SELECT ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enrollments_read" ON public.enrollments FOR SELECT TO authenticated USING (
  auth.uid() = student_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')
  OR EXISTS (SELECT 1 FROM public.parent_children pc WHERE pc.parent_id = auth.uid() AND pc.child_id = enrollments.student_id)
);

-- LESSONS
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  video_url TEXT,
  duration_seconds INTEGER DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lessons_read" ON public.lessons FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')
  OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = lessons.course_id AND e.student_id = auth.uid())
);
CREATE POLICY "lessons_write" ON public.lessons FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = lessons.course_id AND c.teacher_id = auth.uid())
) WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = lessons.course_id AND c.teacher_id = auth.uid())
);

-- MATERIALS
CREATE TABLE public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  file_url TEXT NOT NULL,
  material_type TEXT NOT NULL DEFAULT 'notes',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materials TO authenticated;
GRANT ALL ON public.materials TO service_role;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "materials_read" ON public.materials FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')
  OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = materials.course_id AND e.student_id = auth.uid())
);
CREATE POLICY "materials_write" ON public.materials FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = materials.course_id AND c.teacher_id = auth.uid())
) WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = materials.course_id AND c.teacher_id = auth.uid())
);

-- LESSON PROGRESS
CREATE TABLE public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  position_seconds INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_progress TO authenticated;
GRANT ALL ON public.lesson_progress TO service_role;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "progress_all" ON public.lesson_progress FOR ALL TO authenticated USING (
  auth.uid() = student_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')
  OR EXISTS (SELECT 1 FROM public.parent_children pc WHERE pc.parent_id = auth.uid() AND pc.child_id = lesson_progress.student_id)
) WITH CHECK (auth.uid() = student_id);

-- ASSIGNMENTS
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instructions TEXT DEFAULT '',
  due_date DATE,
  max_score INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignments TO authenticated;
GRANT ALL ON public.assignments TO service_role;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assignments_read" ON public.assignments FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')
  OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = assignments.course_id AND e.student_id = auth.uid())
);
CREATE POLICY "assignments_write" ON public.assignments FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = assignments.course_id AND c.teacher_id = auth.uid())
) WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = assignments.course_id AND c.teacher_id = auth.uid())
);

-- SUBMISSIONS
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT DEFAULT '',
  file_url TEXT,
  status public.submission_status NOT NULL DEFAULT 'pending',
  score INTEGER,
  feedback TEXT DEFAULT '',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  graded_at TIMESTAMPTZ,
  UNIQUE (assignment_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.submissions TO authenticated;
GRANT ALL ON public.submissions TO service_role;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "submissions_read" ON public.submissions FOR SELECT TO authenticated USING (
  auth.uid() = student_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')
  OR EXISTS (SELECT 1 FROM public.parent_children pc WHERE pc.parent_id = auth.uid() AND pc.child_id = submissions.student_id)
);
CREATE POLICY "submissions_student_insert" ON public.submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);
CREATE POLICY "submissions_update" ON public.submissions FOR UPDATE TO authenticated USING (
  (auth.uid() = student_id AND status = 'pending') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')
) WITH CHECK (
  auth.uid() = student_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')
);

-- QUIZZES
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  pass_score INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quizzes TO authenticated;
GRANT ALL ON public.quizzes TO service_role;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quizzes_read" ON public.quizzes FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')
  OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = quizzes.course_id AND e.student_id = auth.uid())
);
CREATE POLICY "quizzes_write" ON public.quizzes FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = quizzes.course_id AND c.teacher_id = auth.uid())
) WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = quizzes.course_id AND c.teacher_id = auth.uid())
);

CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_index INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_questions TO authenticated;
GRANT ALL ON public.quiz_questions TO service_role;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qq_read" ON public.quiz_questions FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')
  OR EXISTS (
    SELECT 1 FROM public.quizzes q JOIN public.enrollments e ON e.course_id = q.course_id
    WHERE q.id = quiz_questions.quiz_id AND e.student_id = auth.uid()
  )
);
CREATE POLICY "qq_write" ON public.quiz_questions FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.quizzes q JOIN public.courses c ON c.id = q.course_id WHERE q.id = quiz_questions.quiz_id AND c.teacher_id = auth.uid())
) WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.quizzes q JOIN public.courses c ON c.id = q.course_id WHERE q.id = quiz_questions.quiz_id AND c.teacher_id = auth.uid())
);

CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qa_read" ON public.quiz_attempts FOR SELECT TO authenticated USING (
  auth.uid() = student_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')
  OR EXISTS (SELECT 1 FROM public.parent_children pc WHERE pc.parent_id = auth.uid() AND pc.child_id = quiz_attempts.student_id)
);
CREATE POLICY "qa_insert" ON public.quiz_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);

-- PAYMENTS
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  reference TEXT NOT NULL UNIQUE,
  amount_kobo INTEGER NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'pending',
  paystack_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_read" ON public.payments FOR SELECT TO authenticated USING (
  auth.uid() = student_id OR public.has_role(auth.uid(), 'admin')
);

-- CERTIFICATES
CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, course_id)
);
GRANT SELECT, INSERT ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cert_read" ON public.certificates FOR SELECT TO authenticated USING (
  auth.uid() = student_id OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.parent_children pc WHERE pc.parent_id = auth.uid() AND pc.child_id = certificates.student_id)
);
CREATE POLICY "cert_insert" ON public.certificates FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);

-- ANNOUNCEMENTS
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'all',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ann_read" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "ann_write" ON public.announcements FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')
) WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')
);

-- ADMISSIONS (public inquiry form)
CREATE TABLE public.admissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  parent_email TEXT NOT NULL,
  child_name TEXT NOT NULL,
  child_age INTEGER,
  level TEXT NOT NULL,
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.admissions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admissions TO authenticated;
GRANT ALL ON public.admissions TO service_role;
ALTER TABLE public.admissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "adm_insert_public" ON public.admissions FOR INSERT WITH CHECK (true);
CREATE POLICY "adm_admin_read" ON public.admissions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "adm_admin_update" ON public.admissions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- SEED COURSES
INSERT INTO public.courses (title, slug, description, category, level, subject, price_kobo, duration_weeks, sort_order, learning_objectives) VALUES
('Kindergarten English', 'kg-english', 'A fun, colorful introduction to English for our youngest learners — letters, sounds, first words, and simple sentences.', 'kindergarten', 'Kindergarten', 'English', 300000, 10, 10, ARRAY['Recognize letters A–Z','Form simple words','Understand basic sentences']),
('Kindergarten Mathematics', 'kg-maths', 'Numbers, counting, shapes, and simple arithmetic through play and story.', 'kindergarten', 'Kindergarten', 'Mathematics', 300000, 10, 11, ARRAY['Count 1–100','Basic addition and subtraction','Identify shapes']),
('Kindergarten Phonics', 'kg-phonics', 'Systematic phonics — letter sounds, blends, and confident early reading.', 'kindergarten', 'Kindergarten', 'Phonics', 300000, 10, 12, ARRAY['Master letter sounds','Blend simple words','Read short sentences']),
('Kindergarten Reading Skills', 'kg-reading', 'Sight words, comprehension, and a lifelong love of reading.', 'kindergarten', 'Kindergarten', 'Reading Skills', 300000, 10, 13, ARRAY['Read simple stories','Sight-word fluency','Comprehension basics']),
('Primary 1 English Language', 'p1-english', 'Primary 1 English — grammar, vocabulary, comprehension, and composition.', 'primary', 'Primary 1', 'English', 300000, 12, 20, ARRAY['Nouns and verbs','Simple composition','Reading comprehension']),
('Primary 1 Mathematics', 'p1-maths', 'Primary 1 Mathematics — numbers up to 1000, place value, addition, subtraction.', 'primary', 'Primary 1', 'Mathematics', 300000, 12, 21, ARRAY['Numbers 1–1000','Addition and subtraction','Word problems']),
('Primary 1 Basic Science', 'p1-basic-science', 'Living and non-living things, our senses, and the world around us.', 'primary', 'Primary 1', 'Basic Science', 300000, 12, 22, ARRAY['Living vs non-living','Our five senses','Weather and seasons']),
('Primary 1 Reading Skills', 'p1-reading', 'Fluency, comprehension, and reading confidence for Primary 1.', 'primary', 'Primary 1', 'Reading Skills', 300000, 12, 23, ARRAY['Fluent reading','Vocabulary building','Comprehension']),
('Primary 2 English Language', 'p2-english', 'Primary 2 English — grammar, punctuation, comprehension, composition.', 'primary', 'Primary 2', 'English', 300000, 12, 30, NULL),
('Primary 2 Mathematics', 'p2-maths', 'Primary 2 Mathematics — multiplication, division, fractions, measurement.', 'primary', 'Primary 2', 'Mathematics', 300000, 12, 31, NULL),
('Primary 2 Basic Science', 'p2-basic-science', 'Plants, animals, human body, and simple experiments.', 'primary', 'Primary 2', 'Basic Science', 300000, 12, 32, NULL),
('Primary 2 Reading Skills', 'p2-reading', 'Reading strategies, comprehension, and vocabulary.', 'primary', 'Primary 2', 'Reading Skills', 300000, 12, 33, NULL),
('Primary 3 English Language', 'p3-english', 'Primary 3 English — tenses, parts of speech, comprehension, letter writing.', 'primary', 'Primary 3', 'English', 300000, 12, 40, NULL),
('Primary 3 Mathematics', 'p3-maths', 'Primary 3 Mathematics — long multiplication, division, fractions, geometry.', 'primary', 'Primary 3', 'Mathematics', 300000, 12, 41, NULL),
('Primary 3 Basic Science', 'p3-basic-science', 'Matter, energy, plants, animals, and the environment.', 'primary', 'Primary 3', 'Basic Science', 300000, 12, 42, NULL),
('Primary 3 Reading Skills', 'p3-reading', 'Advanced comprehension and independent reading.', 'primary', 'Primary 3', 'Reading Skills', 300000, 12, 43, NULL),
('Primary 4 English Language', 'p4-english', 'Primary 4 English — writing skills, vocabulary, comprehension, oral English.', 'primary', 'Primary 4', 'English', 300000, 12, 50, NULL),
('Primary 4 Mathematics', 'p4-maths', 'Primary 4 Mathematics — decimals, percentages, ratios, geometry.', 'primary', 'Primary 4', 'Mathematics', 300000, 12, 51, NULL),
('Primary 4 Basic Science', 'p4-basic-science', 'Living things, the human body, ecosystems, and simple physics.', 'primary', 'Primary 4', 'Basic Science', 300000, 12, 52, NULL),
('Primary 4 Reading Skills', 'p4-reading', 'Critical reading, inference, and analysis.', 'primary', 'Primary 4', 'Reading Skills', 300000, 12, 53, NULL),
('Primary 5 English Language', 'p5-english', 'Primary 5 English — advanced grammar, essay writing, comprehension.', 'primary', 'Primary 5', 'English', 300000, 12, 60, NULL),
('Primary 5 Mathematics', 'p5-maths', 'Primary 5 Mathematics — algebra basics, geometry, statistics.', 'primary', 'Primary 5', 'Mathematics', 300000, 12, 61, NULL),
('Primary 5 Basic Science', 'p5-basic-science', 'Advanced science topics — energy, force, life sciences.', 'primary', 'Primary 5', 'Basic Science', 300000, 12, 62, NULL),
('Primary 5 Reading Skills', 'p5-reading', 'Advanced comprehension, summary, and literary analysis.', 'primary', 'Primary 5', 'Reading Skills', 300000, 12, 63, NULL),
('Primary 6 English Language', 'p6-english', 'Primary 6 English — complete syllabus and Common Entrance preparation.', 'primary', 'Primary 6', 'English', 300000, 12, 70, NULL),
('Primary 6 Mathematics', 'p6-maths', 'Primary 6 Mathematics — full syllabus and Common Entrance preparation.', 'primary', 'Primary 6', 'Mathematics', 300000, 12, 71, NULL),
('Primary 6 Basic Science', 'p6-basic-science', 'Primary 6 Basic Science — full syllabus and exam preparation.', 'primary', 'Primary 6', 'Basic Science', 300000, 12, 72, NULL),
('Primary 6 Reading Skills', 'p6-reading', 'Primary 6 advanced Reading Skills and comprehension.', 'primary', 'Primary 6', 'Reading Skills', 300000, 12, 73, NULL),
('Primary 6 Examination Preparation', 'p6-exam-prep', 'Complete Common Entrance and secondary-school entrance exam preparation.', 'primary', 'Primary 6', 'Examination Preparation', 300000, 12, 74, ARRAY['Past questions','Mock exams','Test strategies']),
('Summer English Lessons', 'summer-english', 'Holiday English enrichment — grammar, vocabulary, writing.', 'summer', 'Summer', 'English', 300000, 6, 80, NULL),
('Summer Mathematics Lessons', 'summer-maths', 'Holiday Mathematics enrichment — problem solving and revision.', 'summer', 'Summer', 'Mathematics', 300000, 6, 81, NULL),
('Summer Reading Program', 'summer-reading', 'Guided summer reading with comprehension activities.', 'summer', 'Summer', 'Reading', 300000, 6, 82, NULL),
('Summer Revision Classes', 'summer-revision', 'All-subject revision for a strong start next term.', 'summer', 'Summer', 'Revision', 300000, 6, 83, NULL),
('Holiday Learning Program', 'summer-holiday', 'A fun, structured learning program across all subjects.', 'summer', 'Summer', 'General', 300000, 6, 84, NULL);
