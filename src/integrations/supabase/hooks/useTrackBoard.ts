import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { Session } from '@supabase/supabase-js';

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

interface UseTrackBoardOptions extends TrackBoardFilters {
  session?: Session | null;
}

export function useTrackBoard(options?: UseTrackBoardOptions) {
  const queryClient = useQueryClient();
  const { session, ...filters } = options || {};
  
  // Only run the query when there's a valid session
  const isAuthenticated = !!session?.access_token;

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
    enabled: isAuthenticated, // Only fetch when authenticated
    refetchInterval: isAuthenticated ? 30000 : false, // Refresh every 30 seconds only when authenticated
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  // Subscribe to real-time updates only when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    
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
  }, [queryClient, isAuthenticated]);

  return query;
}

export type { TrackBoardCase, TrackBoardResponse, TrackBoardFilters };
