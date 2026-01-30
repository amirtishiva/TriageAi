-- Allow clinical staff to view audit logs (not just charge nurses)
DROP POLICY IF EXISTS "Charge nurses can view audit logs" ON public.audit_logs;

CREATE POLICY "Clinical staff can view audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'nurse') OR
        public.has_role(auth.uid(), 'physician') OR
        public.has_role(auth.uid(), 'senior_physician') OR
        public.has_role(auth.uid(), 'charge_nurse')
    );

-- Enable real-time for audit_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
