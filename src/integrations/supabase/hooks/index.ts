// AI Triage
export { useAITriage } from './useAITriage';
export { useValidateTriage } from './useValidateTriage';
export * from './usePatientDocuments';
export { useAcknowledgeCase } from './useAcknowledgeCase';

// Track Board
export { useTrackBoard } from './useTrackBoard';
export type { TrackBoardCase, TrackBoardResponse, TrackBoardFilters } from './useTrackBoard';

// Critical Alerts
export { useCriticalAlerts } from './useCriticalAlerts';

// Triage Cases
export { useTriageCases, useTriageCase } from './useTriageCases';
export type { TriageCaseWithPatient } from './useTriageCases';

// Patients
export { usePatients, usePatient, useCreatePatient, useUpdatePatient } from './usePatients';
export type { Patient, PatientInsert } from './usePatients';

// Vital Signs
export { useVitalSigns, useLatestVitals, useRecordVitals } from './useVitalSigns';
export type { VitalSign, VitalSignInsert } from './useVitalSigns';

// Audit Logs
export { useAuditLogs, useAuditLogStats } from './useAuditLogs';
export type { AuditLogWithDetails } from './useAuditLogs';

// Settings
export { usePhysicianSettings } from './usePhysicianSettings';
export type { PhysicianSettings } from './usePhysicianSettings';

// Real-time
export { useRealtimeAlerts } from './useRealtimeAlerts';
