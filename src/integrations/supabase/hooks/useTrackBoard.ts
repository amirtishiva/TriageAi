import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

interface TrackBoardFilters {
  esiLevels?: number[];
  zones?: string[];
  statuses?: string[];
  page?: number;
  pageSize?: number;
}

interface TrackBoardCase {
  id: string;
  patientId: string;
  patient: {
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
    age: number | null;
    gender: string;
    chiefComplaint: string;
    arrivalTime: string;
    isReturning: boolean;
    allergies: string[];
  };
  esiLevel: number;
  status: string;
  assignedZone: string | null;
  assignedTo: string | null;
  acknowledgedAt: string | null;
  escalationStatus: string;
  sbar: {
    situation: string;
    background: string;
    assessment: string;
    recommendation: string;
  } | null;
  waitTimeMs: number;
  waitTimeFormatted: string;
  targetMs: number;
  isOverdue: boolean;
  overdueByMs: number;
  overdueFormatted: string | null;
  createdAt: string;
  validatedAt: string;
}

interface TrackBoardResponse {
  success: boolean;
  cases: TrackBoardCase[];
  summary: {
    total: number;
    byESI: { [key: number]: number };
    overdue: number;
    avgWaitTimeMs: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
}

export function useTrackBoard(filters?: TrackBoardFilters) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['track-board', filters],
    queryFn: async (): Promise<TrackBoardResponse> => {
      const { data, error } = await supabase.functions.invoke('track-board', {
        body: filters || {},
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch track board');
      }

      return data as TrackBoardResponse;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('track-board-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'triage_cases',
        },
        () => {
          // Invalidate and refetch when triage cases change
          queryClient.invalidateQueries({ queryKey: ['track-board'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export type { TrackBoardCase, TrackBoardResponse, TrackBoardFilters };
