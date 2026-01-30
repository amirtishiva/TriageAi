-- Create physician_settings table
CREATE TABLE IF NOT EXISTS public.physician_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    push_alerts_enabled BOOLEAN DEFAULT true,
    silent_routing_enabled BOOLEAN DEFAULT true,
    sound_alerts_enabled BOOLEAN DEFAULT true,
    esi1_timeout INTEGER DEFAULT 2,
    esi2_timeout INTEGER DEFAULT 5,
    ai_drafting_enabled BOOLEAN DEFAULT true,
    show_confidence_indicators BOOLEAN DEFAULT true,
    generate_sbar_summaries BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.physician_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own settings"
    ON public.physician_settings
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
    ON public.physician_settings
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
    ON public.physician_settings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Function to handle updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger
CREATE TRIGGER on_physician_settings_updated
    BEFORE UPDATE ON public.physician_settings
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();
