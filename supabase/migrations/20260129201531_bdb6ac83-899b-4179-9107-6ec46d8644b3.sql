-- Fix audit_logs insert policy to be more restrictive
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;

CREATE POLICY "Authenticated users can insert own audit logs"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());