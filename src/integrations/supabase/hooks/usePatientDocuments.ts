import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Define type inline since table was just created and types not yet regenerated
export interface PatientDocument {
    id: string;
    patient_id: string;
    file_path: string;
    file_type: string | null;
    file_size: number | null;
    uploaded_by: string | null;
    ai_analysis: Record<string, unknown> | null;
    analysis_result?: Record<string, unknown> | null;
    created_at: string;
}

export function usePatientDocuments(patientId: string | undefined) {
    return useQuery({
        queryKey: ['patient-documents', patientId],
        queryFn: async (): Promise<PatientDocument[]> => {
            if (!patientId) return [];

            const { data, error } = await (supabase
                .from('patient_documents' as any)
                .select('*')
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false }) as any);

            if (error) {
                throw new Error(error.message);
            }

            return (data || []) as PatientDocument[];
        },
        enabled: !!patientId,
    });
}
