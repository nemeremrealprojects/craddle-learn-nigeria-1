-- Fix public course listing: split the courses_read policy so anonymous users
-- don't need to execute the has_role() security-definer function.
DROP POLICY IF EXISTS courses_read ON public.courses;

CREATE POLICY courses_read_anon ON public.courses
  FOR SELECT TO anon
  USING (published = true);

CREATE POLICY courses_read_auth ON public.courses
  FOR SELECT TO authenticated
  USING (
    published = true
    OR public.has_role(auth.uid(), 'teacher')
    OR public.has_role(auth.uid(), 'admin')
  );

-- Restore the trigger that auto-creates profiles and default student roles on signup.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
