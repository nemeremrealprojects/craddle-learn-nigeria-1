
-- 1) Move has_role out of the exposed public schema
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 2) Lock down handle_new_user; used only by trigger as owner
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- 3) Announcements: restrict read to authenticated users
DROP POLICY IF EXISTS ann_read ON public.announcements;
CREATE POLICY ann_read ON public.announcements
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.announcements FROM anon;

-- 4) Profiles: only own row or admins
DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR private.has_role(auth.uid(), 'admin'::public.app_role));

-- 5) Admissions insert: require non-empty required fields (remove always-true check)
DROP POLICY IF EXISTS adm_insert_public ON public.admissions;
CREATE POLICY adm_insert_public ON public.admissions
  FOR INSERT
  WITH CHECK (
    length(btrim(parent_name)) > 0
    AND length(btrim(parent_email)) > 3
    AND parent_email LIKE '%_@_%.__%'
    AND length(btrim(parent_phone)) > 0
    AND length(btrim(child_name)) > 0
    AND length(btrim(level)) > 0
  );
