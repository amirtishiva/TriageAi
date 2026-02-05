-- Create patient_documents table (referenced but doesn't exist)
CREATE TABLE IF NOT EXISTS public.patient_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    uploaded_by UUID,
    ai_analysis JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;

-- Clinical staff can view documents
CREATE POLICY "Clinical staff can view patient documents"
    ON public.patient_documents FOR SELECT
    USING (
        has_role(auth.uid(), 'nurse'::app_role) OR 
        has_role(auth.uid(), 'physician'::app_role) OR 
        has_role(auth.uid(), 'senior_physician'::app_role) OR 
        has_role(auth.uid(), 'charge_nurse'::app_role)
    );

-- Nurses can upload documents
CREATE POLICY "Nurses can upload patient documents"
    ON public.patient_documents FOR INSERT
    WITH CHECK (
        has_role(auth.uid(), 'nurse'::app_role) OR 
        has_role(auth.uid(), 'charge_nurse'::app_role)
    );

-- Create shift_handoffs table for physician handoff workflow
CREATE TABLE IF NOT EXISTS public.shift_handoffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL,
    receiver_id UUID,
    patient_ids UUID[] NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    acknowledged_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.shift_handoffs ENABLE ROW LEVEL SECURITY;

-- Physicians can view their handoffs
CREATE POLICY "Physicians can view own handoffs"
    ON public.shift_handoffs FOR SELECT
    USING (
        sender_id = auth.uid() OR 
        receiver_id = auth.uid() OR
        has_role(auth.uid(), 'senior_physician'::app_role) OR
        has_role(auth.uid(), 'charge_nurse'::app_role)
    );

-- Physicians can create handoffs
CREATE POLICY "Physicians can create handoffs"
    ON public.shift_handoffs FOR INSERT
    WITH CHECK (
        has_role(auth.uid(), 'physician'::app_role) OR 
        has_role(auth.uid(), 'senior_physician'::app_role)
    );

-- Physicians can update handoffs they're involved in
CREATE POLICY "Physicians can update own handoffs"
    ON public.shift_handoffs FOR UPDATE
    USING (
        sender_id = auth.uid() OR 
        receiver_id = auth.uid() OR
        has_role(auth.uid(), 'senior_physician'::app_role)
    );

-- Create storage bucket for patient documents if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-documents', 'patient-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for patient documents
CREATE POLICY "Nurses can upload to patient-documents"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'patient-documents' AND
        (has_role(auth.uid(), 'nurse'::app_role) OR has_role(auth.uid(), 'charge_nurse'::app_role))
    );

CREATE POLICY "Clinical staff can view patient-documents"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'patient-documents' AND
        (has_role(auth.uid(), 'nurse'::app_role) OR 
         has_role(auth.uid(), 'physician'::app_role) OR 
         has_role(auth.uid(), 'senior_physician'::app_role) OR 
         has_role(auth.uid(), 'charge_nurse'::app_role))
    );