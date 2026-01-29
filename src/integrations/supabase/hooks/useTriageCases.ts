import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import type { Database } from '@/integrations/supabase/types';

type TriageCase = Database['public']['Tables']['triage_cases']['Row'];
type Patient = Database['public']['Tables']['patients']['Row'];
type PatientStatus = Database['public']['Enums']['patient_status'];

interface TriageCaseWithPatient extends TriageCase {
  patients: Patient | null;
}

interface UseTriageCasesOptions {
  status?: PatientStatus[];
  patientId?: string;
  enabled?: boolean;
}

export function useTriageCases(options?: UseTriageCasesOptions) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['triage-cases', options],
    queryFn: async (): Promise<TriageCaseWithPatient[]> => {
      let queryBuilder = supabase
        .from('triage_cases')
        .select('*, patients(*)');

      if (options?.status && options.status.length > 0) {
        queryBuilder = queryBuilder.in('status', options.status);
      }

      if (options?.patientId) {
        queryBuilder = queryBuilder.eq('patient_id', options.patientId);
      }

      queryBuilder = queryBuilder.order('created_at', { ascending: false });

      const { data, error } = await queryBuilder;

      if (error) {
        throw new Error(error.message);
      }

      return (data || []) as TriageCaseWithPatient[];
    },
    enabled: options?.enabled !== false,
    staleTime: 10000,
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('triage-cases-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'triage_cases',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['triage-cases'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useTriageCase(triageCaseId: string | undefined) {
  return useQuery({
    queryKey: ['triage-case', triageCaseId],
    queryFn: async (): Promise<TriageCaseWithPatient | null> => {
      if (!triageCaseId) return null;

      const { data, error } = await supabase
        .from('triage_cases')
        .select('*, patients(*)')
        .eq('id', triageCaseId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return data as TriageCaseWithPatient | null;
    },
    enabled: !!triageCaseId,
  });
}

export type { TriageCaseWithPatient };
