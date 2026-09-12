import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Restores course access from the student's own verified successful payments.
 * Runs once per page visit; if a payment succeeded but the enrollment row was
 * never created, the enrollment is recreated server-side (never in the browser).
 */
export function useEnrollmentSync(userId?: string) {
  const qc = useQueryClient();
  const done = useRef<string | null>(null);

  useEffect(() => {
    if (!userId || done.current === userId) return;
    done.current = userId;
    void (async () => {
      const { data, error } = await supabase.rpc("sync_my_enrollments");
      if (error) return;
      if ((data as number | null) && (data as number) > 0) {
        qc.invalidateQueries({ queryKey: ["my-enrollments"] });
        qc.invalidateQueries({ queryKey: ["summer-enrolled"] });
        qc.invalidateQueries({ queryKey: ["s-enrolled"] });
      }
    })();
  }, [userId, qc]);
}
