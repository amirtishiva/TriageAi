import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type VitalSign = Database['public']['Tables']['vital_signs']['Row'];
type VitalSignInsert = Database['public']['Tables']['vital_signs']['Insert'];

export function useVitalSigns(patientId: string | undefined) {
  return useQuery({
    queryKey: ['vital-signs', patientId],
    queryFn: async (): Promise<VitalSign[]> => {
      if (!patientId) return [];

      const { data, error } = await supabase
        .from('vital_signs')
        .select('*')
        .eq('patient_id', patientId)
        .order('recorded_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return (data || []) as VitalSign[];
    },
    enabled: !!patientId,
  });
}

export function useLatestVitals(patientId: string | undefined) {
  return useQuery({
    queryKey: ['vital-signs-latest', patientId],
    queryFn: async (): Promise<VitalSign | null> => {
      if (!patientId) return null;

      const { data, error } = await supabase
        .from('vital_signs')
        .select('*')
        .eq('patient_id', patientId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return data as VitalSign | null;
    },
    enabled: !!patientId,
  });
}

export function useRecordVitals() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vitals: Omit<VitalSignInsert, 'id' | 'recorded_at'>): Promise<VitalSign> => {
      const { data, error } = await supabase
        .from('vital_signs')
        .insert(vitals)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as VitalSign;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vital-signs', variables.patient_id] });
      queryClient.invalidateQueries({ queryKey: ['vital-signs-latest', variables.patient_id] });
    },
  });
}

export type { VitalSign, VitalSignInsert };
