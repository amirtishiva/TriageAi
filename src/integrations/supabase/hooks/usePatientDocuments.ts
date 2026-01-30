import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type PatientDocument = Database['public']['Tables']['patient_documents']['Row'];

export function usePatientDocuments(patientId: string | undefined) {
    return useQuery({
        queryKey: ['patient-documents', patientId],
        queryFn: async (): Promise<PatientDocument[]> => {
            if (!patientId) return [];

            const { data, error } = await supabase
                .from('patient_documents')
                .select('*')
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false });

            if (error) {
                throw new Error(error.message);
            }

            return data || [];
        },
        enabled: !!patientId,
    });
}
