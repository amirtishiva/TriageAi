import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Patient = Database['public']['Tables']['patients']['Row'];
type PatientInsert = Database['public']['Tables']['patients']['Insert'];
type PatientStatus = Database['public']['Enums']['patient_status'];

interface UsePatientOptions {
  status?: PatientStatus[];
  enabled?: boolean;
}

export function usePatients(options?: UsePatientOptions) {
  return useQuery({
    queryKey: ['patients', options],
    queryFn: async (): Promise<Patient[]> => {
      let queryBuilder = supabase
        .from('patients')
        .select('*');

      if (options?.status && options.status.length > 0) {
        queryBuilder = queryBuilder.in('status', options.status);
      }

      queryBuilder = queryBuilder.order('arrival_time', { ascending: false });

      const { data, error } = await queryBuilder;

      if (error) {
        throw new Error(error.message);
      }

      return (data || []) as Patient[];
    },
    enabled: options?.enabled !== false,
    staleTime: 10000,
  });
}

export function usePatient(patientId: string | undefined) {
  return useQuery({
    queryKey: ['patient', patientId],
    queryFn: async (): Promise<Patient | null> => {
      if (!patientId) return null;

      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return data as Patient | null;
    },
    enabled: !!patientId,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patient: Omit<PatientInsert, 'id' | 'created_at' | 'updated_at'>): Promise<Patient> => {
      const { data, error } = await supabase
        .from('patients')
        .insert(patient)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as Patient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      patientId, 
      updates 
    }: { 
      patientId: string; 
      updates: Partial<Patient> 
    }): Promise<Patient> => {
      const { data, error } = await supabase
        .from('patients')
        .update(updates)
        .eq('id', patientId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as Patient;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient', variables.patientId] });
    },
  });
}

export type { Patient, PatientInsert };
