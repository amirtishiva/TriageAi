// AI Triage
export { useAITriage } from './useAITriage';
export { useValidateTriage } from './useValidateTriage';
export { useAcknowledgeCase } from './useAcknowledgeCase';

// Track Board
export { useTrackBoard } from './useTrackBoard';
export type { TrackBoardCase, TrackBoardResponse, TrackBoardFilters } from './useTrackBoard';

// Triage Cases
export { useTriageCases, useTriageCase } from './useTriageCases';
export type { TriageCaseWithPatient } from './useTriageCases';

// Patients
export { usePatients, usePatient, useCreatePatient, useUpdatePatient } from './usePatients';
export type { Patient, PatientInsert } from './usePatients';

// Vital Signs
export { useVitalSigns, useLatestVitals, useRecordVitals } from './useVitalSigns';
export type { VitalSign, VitalSignInsert } from './useVitalSigns';

// Real-time
export { useRealtimeAlerts } from './useRealtimeAlerts';
