import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { VitalSigns } from '@/types/triage';

interface AITriageRequest {
  patientId: string;
  chiefComplaint: string;
  vitals?: {
    heartRate?: number;
    systolicBp?: number;
    diastolicBp?: number;
    respiratoryRate?: number;
    temperature?: number;
    oxygenSaturation?: number;
    painLevel?: number;
  };
  allergies?: string[];
  medications?: string[];
  medicalHistory?: string[];
  age?: number;
  gender?: string;
}

interface AITriageResponse {
  success: boolean;
  triageCaseId: string;
  aiResult: {
    draftESI: number;
    confidence: number;
    sbar: {
      situation: string;
      background: string;
      assessment: string;
      recommendation: string;
    };
    extractedSymptoms: string[];
    timeline: string;
    comorbidities: string[];
    influencingFactors: Array<{
      factor: string;
      category: string;
      impact: string;
      weight: number;
    }>;
  };
}

export function useAITriage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: AITriageRequest): Promise<AITriageResponse> => {
      const { data, error } = await supabase.functions.invoke('ai-triage', {
        body: request,
      });

      if (error) {
        throw new Error(error.message || 'Failed to perform AI triage');
      }

      return data as AITriageResponse;
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['triage-cases'] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}
