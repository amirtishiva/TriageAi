-- =============================================
-- MedTriage AI Database Schema
-- Phase 1: Core Tables, Enums, and Functions
-- =============================================

-- 1. Create custom ENUMs for type safety
CREATE TYPE public.app_role AS ENUM ('nurse', 'physician', 'senior_physician', 'charge_nurse');
CREATE TYPE public.patient_status AS ENUM ('waiting', 'in_triage', 'pending_validation', 'validated', 'assigned', 'acknowledged', 'in_treatment', 'discharged');
CREATE TYPE public.esi_level AS ENUM ('1', '2', '3', '4', '5');
CREATE TYPE public.escalation_status AS ENUM ('none', 'pending', 'level_1', 'level_2', 'level_3', 'resolved');
CREATE TYPE public.override_rationale AS ENUM ('clinical_judgment', 'additional_findings', 'patient_history', 'vital_change', 'symptom_evolution', 'family_concern', 'other');
CREATE TYPE public.escalation_reason AS ENUM ('timeout', 'unavailable', 'manual');
CREATE TYPE public.audit_action AS ENUM ('case_created', 'ai_triage_completed', 'triage_validated', 'triage_overridden', 'case_assigned', 'case_acknowledged', 'escalation_triggered', 'escalation_resolved', 'status_changed');

-- 2. Create user_roles table (RBAC - separate from profile)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    zone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- 3. Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. Create helper function to get user's zone
CREATE OR REPLACE FUNCTION public.get_user_zone(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT zone FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- 5. Create patients table
CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mrn TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
    chief_complaint TEXT NOT NULL,
    arrival_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    status patient_status NOT NULL DEFAULT 'waiting',
    is_returning BOOLEAN NOT NULL DEFAULT false,
    allergies TEXT[],
    medications TEXT[],
    medical_history TEXT[],
    fhir_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Create vital_signs table (time-series)
CREATE TABLE public.vital_signs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    heart_rate INTEGER,
    systolic_bp INTEGER,
    diastolic_bp INTEGER,
    respiratory_rate INTEGER,
    temperature NUMERIC(4,1),
    oxygen_saturation INTEGER,
    pain_level INTEGER CHECK (pain_level >= 0 AND pain_level <= 10),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    recorded_by UUID REFERENCES auth.users(id)
);

-- 7. Create triage_cases table (central hub)
CREATE TABLE public.triage_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    
    -- AI triage results
    ai_draft_esi esi_level,
    ai_confidence INTEGER CHECK (ai_confidence >= 0 AND ai_confidence <= 100),
    ai_sbar_situation TEXT,
    ai_sbar_background TEXT,
    ai_sbar_assessment TEXT,
    ai_sbar_recommendation TEXT,
    ai_extracted_symptoms TEXT[],
    ai_extracted_timeline TEXT,
    ai_comorbidities TEXT[],
    ai_influencing_factors JSONB,
    ai_generated_at TIMESTAMPTZ,
    
    -- Validation
    validated_esi esi_level,
    is_override BOOLEAN DEFAULT false,
    override_rationale override_rationale,
    override_notes TEXT,
    validated_by UUID REFERENCES auth.users(id),
    validated_at TIMESTAMPTZ,
    
    -- Routing and status
    status patient_status NOT NULL DEFAULT 'waiting',
    assigned_to UUID REFERENCES auth.users(id),
    assigned_zone TEXT,
    acknowledged_at TIMESTAMPTZ,
    escalation_status escalation_status NOT NULL DEFAULT 'none',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Create routing_assignments table
CREATE TABLE public.routing_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    triage_case_id UUID REFERENCES public.triage_cases(id) ON DELETE CASCADE NOT NULL,
    assigned_to UUID REFERENCES auth.users(id) NOT NULL,
    assigned_role app_role NOT NULL,
    escalation_level INTEGER NOT NULL DEFAULT 0,
    escalation_deadline TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    response_time_ms INTEGER,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'escalated', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Create escalation_events table
CREATE TABLE public.escalation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    triage_case_id UUID REFERENCES public.triage_cases(id) ON DELETE CASCADE NOT NULL,
    from_user UUID REFERENCES auth.users(id),
    from_role app_role,
    to_user UUID REFERENCES auth.users(id),
    to_role app_role NOT NULL,
    reason escalation_reason NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Create audit_logs table (immutable)
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    triage_case_id UUID REFERENCES public.triage_cases(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action audit_action NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 12. Apply updated_at triggers
CREATE TRIGGER update_patients_updated_at
    BEFORE UPDATE ON public.patients
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_triage_cases_updated_at
    BEFORE UPDATE ON public.triage_cases
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 13. Create indexes for performance
CREATE INDEX idx_patients_mrn ON public.patients(mrn);
CREATE INDEX idx_patients_status ON public.patients(status);
CREATE INDEX idx_patients_arrival_time ON public.patients(arrival_time DESC);

CREATE INDEX idx_vital_signs_patient ON public.vital_signs(patient_id);
CREATE INDEX idx_vital_signs_recorded_at ON public.vital_signs(recorded_at DESC);

CREATE INDEX idx_triage_cases_patient ON public.triage_cases(patient_id);
CREATE INDEX idx_triage_cases_status ON public.triage_cases(status);
CREATE INDEX idx_triage_cases_validated_esi ON public.triage_cases(validated_esi);
CREATE INDEX idx_triage_cases_assigned_to ON public.triage_cases(assigned_to);

CREATE INDEX idx_routing_assignments_case ON public.routing_assignments(triage_case_id);
CREATE INDEX idx_routing_assignments_assigned_to ON public.routing_assignments(assigned_to);
CREATE INDEX idx_routing_assignments_deadline ON public.routing_assignments(escalation_deadline);
CREATE INDEX idx_routing_assignments_status ON public.routing_assignments(status);

CREATE INDEX idx_escalation_events_case ON public.escalation_events(triage_case_id);
CREATE INDEX idx_audit_logs_case ON public.audit_logs(triage_case_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 14. Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vital_signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.triage_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routing_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 15. RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Charge nurses can view all roles"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'charge_nurse'));

-- 16. RLS Policies for patients (all clinical staff can access)
CREATE POLICY "Clinical staff can view patients"
    ON public.patients FOR SELECT
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'nurse') OR
        public.has_role(auth.uid(), 'physician') OR
        public.has_role(auth.uid(), 'senior_physician') OR
        public.has_role(auth.uid(), 'charge_nurse')
    );

CREATE POLICY "Nurses can create patients"
    ON public.patients FOR INSERT
    TO authenticated
    WITH CHECK (
        public.has_role(auth.uid(), 'nurse') OR
        public.has_role(auth.uid(), 'charge_nurse')
    );

CREATE POLICY "Clinical staff can update patients"
    ON public.patients FOR UPDATE
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'nurse') OR
        public.has_role(auth.uid(), 'physician') OR
        public.has_role(auth.uid(), 'senior_physician') OR
        public.has_role(auth.uid(), 'charge_nurse')
    );

-- 17. RLS Policies for vital_signs
CREATE POLICY "Clinical staff can view vitals"
    ON public.vital_signs FOR SELECT
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'nurse') OR
        public.has_role(auth.uid(), 'physician') OR
        public.has_role(auth.uid(), 'senior_physician') OR
        public.has_role(auth.uid(), 'charge_nurse')
    );

CREATE POLICY "Nurses can insert vitals"
    ON public.vital_signs FOR INSERT
    TO authenticated
    WITH CHECK (
        public.has_role(auth.uid(), 'nurse') OR
        public.has_role(auth.uid(), 'charge_nurse')
    );

-- 18. RLS Policies for triage_cases
CREATE POLICY "Clinical staff can view triage cases"
    ON public.triage_cases FOR SELECT
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'nurse') OR
        public.has_role(auth.uid(), 'physician') OR
        public.has_role(auth.uid(), 'senior_physician') OR
        public.has_role(auth.uid(), 'charge_nurse')
    );

CREATE POLICY "Nurses can create triage cases"
    ON public.triage_cases FOR INSERT
    TO authenticated
    WITH CHECK (
        public.has_role(auth.uid(), 'nurse') OR
        public.has_role(auth.uid(), 'charge_nurse')
    );

CREATE POLICY "Clinical staff can update triage cases"
    ON public.triage_cases FOR UPDATE
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'nurse') OR
        public.has_role(auth.uid(), 'physician') OR
        public.has_role(auth.uid(), 'senior_physician') OR
        public.has_role(auth.uid(), 'charge_nurse')
    );

-- 19. RLS Policies for routing_assignments
CREATE POLICY "View own assignments or senior staff"
    ON public.routing_assignments FOR SELECT
    TO authenticated
    USING (
        assigned_to = auth.uid() OR
        public.has_role(auth.uid(), 'senior_physician') OR
        public.has_role(auth.uid(), 'charge_nurse')
    );

CREATE POLICY "System and seniors can insert assignments"
    ON public.routing_assignments FOR INSERT
    TO authenticated
    WITH CHECK (
        public.has_role(auth.uid(), 'nurse') OR
        public.has_role(auth.uid(), 'senior_physician') OR
        public.has_role(auth.uid(), 'charge_nurse')
    );

CREATE POLICY "Assigned user or seniors can update"
    ON public.routing_assignments FOR UPDATE
    TO authenticated
    USING (
        assigned_to = auth.uid() OR
        public.has_role(auth.uid(), 'senior_physician') OR
        public.has_role(auth.uid(), 'charge_nurse')
    );

-- 20. RLS Policies for escalation_events
CREATE POLICY "View escalations for own cases or senior"
    ON public.escalation_events FOR SELECT
    TO authenticated
    USING (
        from_user = auth.uid() OR
        to_user = auth.uid() OR
        public.has_role(auth.uid(), 'senior_physician') OR
        public.has_role(auth.uid(), 'charge_nurse')
    );

CREATE POLICY "Clinical staff can insert escalations"
    ON public.escalation_events FOR INSERT
    TO authenticated
    WITH CHECK (
        public.has_role(auth.uid(), 'nurse') OR
        public.has_role(auth.uid(), 'physician') OR
        public.has_role(auth.uid(), 'senior_physician') OR
        public.has_role(auth.uid(), 'charge_nurse')
    );

-- 21. RLS Policies for audit_logs (immutable - insert only, read by charge nurse)
CREATE POLICY "Charge nurses can view audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'charge_nurse'));

CREATE POLICY "Authenticated users can insert audit logs"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 22. Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.triage_cases;
ALTER PUBLICATION supabase_realtime ADD TABLE public.routing_assignments;