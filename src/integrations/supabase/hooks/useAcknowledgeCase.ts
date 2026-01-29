import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AcknowledgeRequest {
  triageCaseId: string;
  routingAssignmentId?: string;
}

interface AcknowledgeResponse {
  success: boolean;
  triageCaseId: string;
  acknowledgedAt: string;
  responseTimeMs: number | null;
  metTarget: boolean;
}

export function useAcknowledgeCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: AcknowledgeRequest): Promise<AcknowledgeResponse> => {
      const { data, error } = await supabase.functions.invoke('acknowledge-case', {
        body: request,
      });

      if (error) {
        throw new Error(error.message || 'Failed to acknowledge case');
      }

      return data as AcknowledgeResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triage-cases'] });
      queryClient.invalidateQueries({ queryKey: ['track-board'] });
      queryClient.invalidateQueries({ queryKey: ['routing-assignments'] });
    },
  });
}
