

# Backend Implementation Plan
## MedTriage AI - Real-time Clinical Decision Support System

### Overview

This plan implements the complete backend infrastructure to connect the existing frontend with real-time data and AI-powered triage capabilities. The implementation will create database schemas, edge functions for AI triage and routing, and integrate Supabase Realtime for live updates across both Nurse Station and Physician Workbench interfaces.

---

## Phase 1: Database Foundation

### 1.1 Enable Lovable Cloud Supabase

Before creating tables, we need to enable the Lovable Cloud Supabase integration for the project.

### 1.2 Create Core Database Schema

Create database migrations for the following tables as specified in the HLD:

| Table | Purpose |
|-------|---------|
| `patients` | Patient demographics, MRN, FHIR references |
| `vital_signs` | Time-series vital measurements |
| `triage_cases` | Central table linking AI results, validation, status |
| `staff` | Clinical staff with roles and zones |
| `user_roles` | RBAC role assignments (security best practice) |
| `routing_assignments` | Case-to-provider assignments with deadlines |
| `escalation_events` | Escalation history for audit trail |
| `audit_logs` | Immutable event log for compliance |

### 1.3 Create Role Enum and Security Functions

```sql
-- Role enum for RBAC
CREATE TYPE public.app_role AS ENUM ('nurse', 'physician', 'senior_physician', 'charge_nurse');

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

### 1.4 Enable Row Level Security (RLS)

Configure RLS policies for each table:
- **triage_cases**: Nurses can create/update during triage; physicians view assigned cases
- **routing_assignments**: Staff see only their assignments unless charge_nurse/senior
- **audit_logs**: Insert-only (immutable); read by charge_nurse only

---

## Phase 2: Edge Functions

### 2.1 AI Triage Function (`ai-triage`)

**Purpose**: Invoke Gemini API for clinical extraction and SBAR generation

```text
supabase/functions/ai-triage/index.ts
```

Key logic:
1. Validate JWT and extract user role
2. Fetch patient context from request
3. Call Gemini API with clinical extraction prompt
4. Parse structured JSON response (SBAR, symptoms, vital flags)
5. Generate mock ESI score (MVP) or integrate XGBoost classifier
6. Update `triage_cases` with AI results
7. Set status to `awaiting_validation`
8. Return AI result to frontend

### 2.2 Validate Triage Function (`validate-triage`)

**Purpose**: Record nurse confirmation/override and trigger routing

```text
supabase/functions/validate-triage/index.ts
```

Key logic:
1. Validate nurse role from JWT
2. Accept `confirm` or `override` action
3. If override: require `override_rationale`
4. Update `triage_cases` with validation data
5. Insert audit log entry
6. Trigger routing based on ESI level:
   - ESI 1: Broadcast to code team
   - ESI 2: Assign zone physician, set 2-min escalation timer
   - ESI 3-5: Add to track board queue
7. Return routing assignment details

### 2.3 Acknowledge Case Function (`acknowledge-case`)

**Purpose**: Physician acknowledges assigned case, stops escalation timer

```text
supabase/functions/acknowledge-case/index.ts
```

Key logic:
1. Validate physician role
2. Verify case is assigned to requesting physician
3. Update `routing_assignments.acknowledged_at`
4. Calculate response time, check against target
5. Update `triage_cases.status` to `acknowledged`
6. Insert audit log entry
7. Broadcast real-time update

### 2.4 Track Board Function (`track-board`)

**Purpose**: Return prioritized ESI 3-5 queue with filtering

```text
supabase/functions/track-board/index.ts
```

Key logic:
1. Query validated cases where ESI >= 3
2. Calculate wait times and overdue status
3. Apply filters (ESI level, zone, status)
4. Sort by priority (ESI + wait time)
5. Return paginated results with summary stats

### 2.5 Orchestration Cron Function (`check-escalations`)

**Purpose**: Background job to check and trigger escalations

```text
supabase/functions/check-escalations/index.ts
```

Key logic:
1. Query `routing_assignments` where `status = 'pending'` and `escalation_deadline < NOW()`
2. For each overdue assignment:
   - Determine next escalation target based on `escalation_level`
   - Create new assignment with next-level provider
   - Insert `escalation_events` record
   - Broadcast escalation alert
3. Handle final escalation to charge nurse

---

## Phase 3: Supabase Client Integration

### 3.1 Create Supabase Client

```text
src/integrations/supabase/client.ts
```

Configure the Supabase client with:
- Project URL and anon key
- Auth persistence
- Realtime subscription setup

### 3.2 Create Type Definitions

```text
src/integrations/supabase/types.ts
```

Generate TypeScript types from database schema for type-safe queries.

### 3.3 Create API Hooks

Create React Query hooks for each API operation:

| Hook | Purpose |
|------|---------|
| `useAITriage` | Trigger AI analysis mutation |
| `useValidateTriage` | Submit nurse validation |
| `useAcknowledgeCase` | Physician acknowledgment |
| `useTrackBoard` | Fetch prioritized queue |
| `useTriageCases` | Fetch cases with real-time subscription |
| `useEscalations` | Monitor pending escalations |

---

## Phase 4: Real-time Subscriptions

### 4.1 Triage Updates Channel

```typescript
// Real-time updates for triage case changes
supabase
  .channel('triage-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'triage_cases'
  }, handleTriageUpdate)
  .subscribe();
```

### 4.2 Alerts Channel

```typescript
// High-priority alerts for ESI 1-2 cases
supabase
  .channel('alerts')
  .on('broadcast', { event: 'critical_case' }, handleCriticalAlert)
  .on('broadcast', { event: 'escalation' }, handleEscalation)
  .subscribe();
```

### 4.3 Presence Channel (Optional)

Track active staff for routing decisions:

```typescript
supabase
  .channel('staff-presence')
  .on('presence', { event: 'sync' }, handlePresenceSync)
  .subscribe();
```

---

## Phase 5: Frontend Integration

### 5.1 Replace Mock Data

Update pages to use real API hooks instead of `mockData.ts`:

| Page | Changes |
|------|---------|
| `NurseDashboard.tsx` | Fetch real queue stats, subscribe to updates |
| `PatientIntakePage.tsx` | Create `triage_cases` record on submit |
| `TriageScreen.tsx` | Call `ai-triage`, then `validate-triage` |
| `TrackBoard.tsx` | Use `useTrackBoard` hook with real-time updates |
| `PatientQueue.tsx` | Subscribe to case status changes |
| `AuditLogs.tsx` | Query `audit_logs` table |

### 5.2 Authentication Integration

Add Supabase Auth for role-based access:

1. Create auth context provider
2. Add login page with role selection (MVP: simulated roles)
3. Protect routes based on user role
4. Pass JWT to all API calls

### 5.3 Real-time UI Updates

Connect real-time subscriptions to UI:

1. **Track Board**: Auto-refresh on `case_validated` events
2. **Nurse Dashboard**: Update queue counts on changes
3. **Physician Alerts**: Show toast for ESI 1-2 assignments
4. **Emergency Mode**: Activate on critical case broadcast

---

## Technical Considerations

### Error Handling

- AI Unavailable: Fallback to manual ESI entry
- Network Errors: Show offline indicator, queue actions
- Validation Errors: Display inline error messages

### Security

- All edge functions validate JWT claims
- RLS policies enforce data access by role
- Audit logs are append-only (no UPDATE/DELETE)
- No PHI in URLs or console logs

### Performance

- Pagination on track board (50 cases per page)
- Debounced real-time updates to prevent UI thrashing
- Optimistic updates for acknowledgment actions

---

## Deliverables Checklist

### Database
- [x] Enable Lovable Cloud Supabase
- [x] Create `patients` table with indexes
- [x] Create `vital_signs` table
- [x] Create `triage_cases` table with status enum
- [x] Create `staff` table with role enum
- [x] Create `user_roles` table with security function
- [x] Create `routing_assignments` table
- [x] Create `escalation_events` table
- [x] Create `audit_logs` table (immutable)
- [x] Configure RLS policies for all tables

### Edge Functions
- [x] `ai-triage` - Gemini integration for SBAR generation
- [x] `validate-triage` - Nurse validation and routing trigger
- [x] `acknowledge-case` - Physician acknowledgment
- [x] `track-board` - Prioritized queue API
- [x] `check-escalations` - Background escalation cron

### Frontend Integration
- [x] Supabase client configuration
- [x] TypeScript types from schema
- [x] React Query hooks for all APIs
- [x] Real-time subscription hooks
- [x] Replace mock data with API calls
- [x] Auth context (simulated roles for MVP)
- [x] Cron job for automatic escalations (pg_cron every minute)

### Testing
- [ ] Edge function unit tests
- [x] Real-time subscription verification
- [x] End-to-end triage flow test (auth, nurse dashboard, patient intake)

---

## File Structure

```text
supabase/
├── config.toml
└── functions/
    ├── ai-triage/
    │   └── index.ts
    ├── validate-triage/
    │   └── index.ts
    ├── acknowledge-case/
    │   └── index.ts
    ├── track-board/
    │   └── index.ts
    └── check-escalations/
        └── index.ts

src/
├── integrations/
│   └── supabase/
│       ├── client.ts
│       ├── types.ts
│       └── hooks/
│           ├── useAITriage.ts
│           ├── useValidateTriage.ts
│           ├── useAcknowledgeCase.ts
│           ├── useTrackBoard.ts
│           └── useRealtimeSubscription.ts
└── contexts/
    └── AuthContext.tsx
```

