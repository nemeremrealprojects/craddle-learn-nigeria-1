CREATE POLICY "submissions_own_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'submissions' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "submissions_own_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'submissions' AND ((storage.foldername(name))[1] = auth.uid()::text
  OR private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'teacher'::app_role)));

CREATE POLICY "submissions_own_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'submissions' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'submissions' AND (storage.foldername(name))[1] = auth.uid()::text);