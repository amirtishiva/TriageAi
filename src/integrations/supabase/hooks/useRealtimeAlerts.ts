import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEmergency } from '@/contexts/EmergencyContext';

interface CriticalCasePayload {
  triageCaseId: string;
  patientId: string;
  esiLevel: number;
  patient: {
    firstName: string;
    lastName: string;
    chiefComplaint: string;
  };
}

interface EscalationPayload {
  triageCaseId: string;
  patientId: string;
  esiLevel: string;
  escalationLevel: number;
  assignedTo: string;
  assignedRole: string;
  patient: {
    firstName: string;
    lastName: string;
    chiefComplaint: string;
  };
}

interface CaseAssignedPayload {
  triageCaseId: string;
  assignedTo: string;
  esiLevel: number;
  deadline: string;
}

interface CaseAcknowledgedPayload {
  triageCaseId: string;
  acknowledgedBy: string;
  responseTimeMs: number;
  metTarget: boolean;
}

export interface RealtimeAlert {
  id: string;
  type: 'critical_case' | 'escalation' | 'case_assigned' | 'case_acknowledged';
  payload: CriticalCasePayload | EscalationPayload | CaseAssignedPayload | CaseAcknowledgedPayload;
  createdAt: Date;
}

export function useRealtimeAlerts(userId?: string) {
  const { toast } = useToast();
  const { activateEmergencyMode } = useEmergency();
  const [alerts, setAlerts] = useState<RealtimeAlert[]>([]);

  const addAlert = useCallback((type: RealtimeAlert['type'], payload: RealtimeAlert['payload']) => {
    const alert: RealtimeAlert = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      payload,
      createdAt: new Date(),
    };
    setAlerts(prev => [alert, ...prev].slice(0, 50)); // Keep last 50 alerts
    return alert;
  }, []);

  const handleCriticalCase = useCallback((payload: { payload: CriticalCasePayload }) => {
    const data = payload.payload;
    
    addAlert('critical_case', data);
    
    // Activate emergency mode for ESI 1
    if (data.esiLevel === 1) {
      activateEmergencyMode(data.patientId);
    }

    toast({
      title: '🚨 CRITICAL CASE',
      description: `ESI ${data.esiLevel}: ${data.patient.firstName} ${data.patient.lastName} - ${data.patient.chiefComplaint}`,
      variant: 'destructive',
    });

    // Play alert sound if available
    try {
      const audio = new Audio('/alert.mp3');
      audio.play().catch(() => {});
    } catch (e) {
      // Ignore audio errors
    }
  }, [activateEmergencyMode, toast, addAlert]);

  const handleEscalation = useCallback((payload: { payload: EscalationPayload }) => {
    const data = payload.payload;
    
    addAlert('escalation', data);
    
    toast({
      title: '⚠️ Escalation Alert',
      description: `Case escalated to ${data.assignedRole}: ${data.patient.firstName} ${data.patient.lastName}`,
      variant: 'destructive',
    });
  }, [toast, addAlert]);

  const handleCaseAssigned = useCallback((payload: { payload: CaseAssignedPayload }) => {
    const data = payload.payload;
    
    addAlert('case_assigned', data);
    
    // Only show if assigned to current user
    if (userId && data.assignedTo === userId) {
      toast({
        title: '📋 New Case Assigned',
        description: `ESI ${data.esiLevel} case requires your attention`,
      });
    }
  }, [userId, toast, addAlert]);

  const handleCaseAcknowledged = useCallback((payload: { payload: CaseAcknowledgedPayload }) => {
    const data = payload.payload;
    
    addAlert('case_acknowledged', data);
    
    const timeStr = data.responseTimeMs 
      ? `${Math.round(data.responseTimeMs / 1000)}s` 
      : 'N/A';
    
    toast({
      title: '✅ Case Acknowledged',
      description: `Response time: ${timeStr} ${data.metTarget ? '(met target)' : '(exceeded target)'}`,
    });
  }, [toast, addAlert]);

  useEffect(() => {
    const channel = supabase
      .channel('realtime-alerts')
      .on('broadcast', { event: 'critical_case' }, handleCriticalCase)
      .on('broadcast', { event: 'escalation' }, handleEscalation)
      .on('broadcast', { event: 'case_assigned' }, handleCaseAssigned)
      .on('broadcast', { event: 'case_acknowledged' }, handleCaseAcknowledged)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [handleCriticalCase, handleEscalation, handleCaseAssigned, handleCaseAcknowledged]);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  return { alerts, clearAlerts };
}
