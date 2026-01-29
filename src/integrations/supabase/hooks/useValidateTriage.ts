import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ValidateTriageRequest {
  triageCaseId: string;
  action: 'confirm' | 'override';
  overrideESI?: number;
  overrideRationale?: string;
  overrideNotes?: string;
}

interface ValidateTriageResponse {
  success: boolean;
  triageCaseId: string;
  validatedESI: number;
  isOverride: boolean;
  routing: {
    type: string;
    target?: string;
    assignedTo?: string;
    deadline?: string;
    queue?: string;
    reason?: string;
  } | null;
}

export function useValidateTriage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: ValidateTriageRequest): Promise<ValidateTriageResponse> => {
      const { data, error } = await supabase.functions.invoke('validate-triage', {
        body: request,
      });

      if (error) {
        throw new Error(error.message || 'Failed to validate triage');
      }

      return data as ValidateTriageResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triage-cases'] });
      queryClient.invalidateQueries({ queryKey: ['track-board'] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}
