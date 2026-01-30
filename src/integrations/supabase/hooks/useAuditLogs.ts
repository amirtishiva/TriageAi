import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AuditLog = Database['public']['Tables']['audit_logs']['Row'];
type AuditAction = Database['public']['Enums']['audit_action'];

export interface AuditLogWithDetails extends AuditLog {
  patient_name?: string;
  patient_mrn?: string;
  esi_level?: number;
}

interface UseAuditLogsOptions {
  action?: AuditAction;
  patientId?: string;
  triageCaseId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

interface AuditLogsResponse {
  logs: AuditLogWithDetails[];
  meta: {
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export function useAuditLogs(options?: UseAuditLogsOptions) {
  const page = options?.page || 1;
  const pageSize = options?.pageSize || 20;

  const queryClient = useQueryClient();

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('audit-logs-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'audit_logs',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
          queryClient.invalidateQueries({ queryKey: ['audit-log-stats'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['audit-logs', options],
    queryFn: async (): Promise<AuditLogsResponse> => {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          patients (
            first_name,
            last_name,
            mrn
          ),
          triage_cases (
            validated_esi,
            ai_draft_esi
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      if (options?.action) {
        query = query.eq('action', options.action);
      }

      if (options?.patientId) {
        query = query.eq('patient_id', options.patientId);
      }

      if (options?.startDate) {
        query = query.gte('created_at', options.startDate.toISOString());
      }

      if (options?.endDate) {
        query = query.lte('created_at', options.endDate.toISOString());
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(error.message);
      }

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / pageSize);

      // Transform to include patient name and ESI level
      const logs = (data || []).map((log: any) => ({
        ...log,
        patient_name: log.patients
          ? `${log.patients.last_name}, ${log.patients.first_name}`
          : null,
        patient_mrn: log.patients?.mrn || null,
        esi_level: log.triage_cases?.validated_esi
          ? parseInt(log.triage_cases.validated_esi)
          : log.triage_cases?.ai_draft_esi
            ? parseInt(log.triage_cases.ai_draft_esi)
            : null,
      }));

      return {
        logs,
        meta: {
          count: totalCount,
          page,
          pageSize,
          totalPages
        }
      };
    },
    staleTime: 30000,
  });
}

export function useAuditLogStats() {
  return useQuery({
    queryKey: ['audit-log-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('action');

      if (error) {
        throw new Error(error.message);
      }

      const logs = data || [];
      const validations = logs.filter(l => l.action === 'triage_validated').length;
      const overrides = logs.filter(l => l.action === 'triage_overridden').length;
      const escalations = logs.filter(l =>
        l.action === 'escalation_triggered' || l.action === 'escalation_resolved'
      ).length;

      return {
        total: logs.length,
        validations,
        overrides,
        escalations,
        overrideRate: validations + overrides > 0
          ? ((overrides / (validations + overrides)) * 100).toFixed(1)
          : '0.0',
      };
    },
    staleTime: 60000,
  });
}
