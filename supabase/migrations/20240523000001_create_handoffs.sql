-- Create shift_handoffs table
CREATE TABLE IF NOT EXISTS public.shift_handoffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    receiver_id UUID REFERENCES auth.users(id),
    patient_ids UUID[] NOT NULL DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shift_handoffs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view handoffs involved in"
    ON public.shift_handoffs
    FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create handoffs"
    ON public.shift_handoffs
    FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

-- Create a view for easy querying of handed off patients details if needed
-- For now, simple array logic is enough for the MVP.
