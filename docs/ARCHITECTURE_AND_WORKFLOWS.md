# Architecture and Workflows

## 1. System Architecture

The TriageAI system is built on a modern serverless architecture utilizing Supabase for backend services (Auth, Database, Edge Functions, Realtime) and a React-based frontend.

```mermaid
graph TB
    subgraph "External Systems"
        EHR[Hospital EHR System]
        FHIR[SMART on FHIR Interface]
        Gemini[Google Gemini API]
    end

    subgraph "TriageAI Platform"
        subgraph "Frontend Layer (React + Vite)"
            NurseUI[Nurse Triage Interface]
            TrackBoard[Physician Track Board]
            AdminUI[Admin/Charge Nurse Dashboard]
        end

        subgraph "Backend Layer (Supabase)"
            Auth[Authentication & RLS]
            DB[(PostgreSQL Database)]
            Realtime[Realtime Subscriptions]
            
            subgraph "Edge Functions"
                API_Gateway[API Gateway]
                AI_Orch[AI Triage Orchestrator]
                Esc_Mgr[Escalation Manager]
            end
        end
    end

    %% Integrations
    EHR <-->|Patient Context| FHIR
    FHIR -->|Launch| NurseUI
    
    %% Frontend to Backend
    NurseUI <-->|HTTPS/WSS| API_Gateway
    TrackBoard <-->|HTTPS/WSS| API_Gateway
    
    %% Internal Backend
    API_Gateway --> Auth
    API_Gateway --> DB
    DB --> Realtime
    Realtime -->|Push Updates| NurseUI
    Realtime -->|Push Updates| TrackBoard
    
    %% AI Processing
    AI_Orch -->|Prompt & Context| Gemini
    Gemini -->|Structured Data| AI_Orch
    AI_Orch -->|Store Result| DB
    
    %% Escalation
    Esc_Mgr -->|Monitor Timers| DB
    Esc_Mgr -->|Trigger Alerts| Realtime
```

## 2. User Workflows

### 2.1 End-to-End Triage Journey
This sequence diagram illustrates the flow from patient arrival through AI analysis, nurse validation, and physician assignment.

```mermaid
sequenceDiagram
    participant P as Patient/EHR
    participant N as Triage Nurse
    participant SYS as TriageAI System
    participant AI as AI Engine (Gemini/XGB)
    participant MD as Zone Physician
    participant CN as Charge Nurse

    %% Phase 1: Intake
    Note over N, P: Phase 1: Patient Intake
    P->>SYS: SMART on FHIR Launch (Context Loaded)
    N->>SYS: Enters Chief Complaint & Vitals
    N->>SYS: Uploads Documents (Optional)
    N->>SYS: Submits for Analysis
    
    %% Phase 2: AI Processing
    Note over SYS, AI: Phase 2: AI Analysis
    SYS->>AI: Send Anonymized Context
    AI->>AI: Model A (LLM): Extract Symptoms & Generate SBAR
    AI->>AI: Model B (XGBoost): Calculate ESI Score
    AI-->>SYS: Return Draft ESI + SBAR + Confidence
    SYS-->>N: Display AI Draft (Validation Interface)

    %% Phase 3: Validation
    Note over N, SYS: Phase 3: Nurse Validation
    alt Nurse Agrees
        N->>SYS: Confirms AI Assessment
    else Nurse Overrides
        N->>SYS: Overrides ESI (Selects Rationale)
    end
    SYS->>SYS: Lock Case Status: "Validated"

    %% Phase 4: Routing & Handoff
    Note over SYS, MD: Phase 4: Routing & Handoff
    alt ESI 1 or 2 (High Acuity)
        SYS->>MD: Push Notification (Urgent)
        SYS->>SYS: Start 2-min Acknowledge Timer
        
        alt MD Acknowledges
            MD->>SYS: Acknowledge Case
            SYS-->>N: Notify: "Physician Assigned"
        else Timer Expires (Escalation)
            SYS->>CN: ESCALATE Alert
            Note right of CN: Escalation Protocol Triggered
        end
        
    else ESI 3-5 (Lower Acuity)
        SYS->>MD: Add to Track Board Queue
        MD->>SYS: Self-Assign from Queue
    end
```

## 3. Data Workflow

### 3.1 Triage Case State Machine
The lifecycle of a single patient verification case managed by the Orchestration Engine.

```mermaid
stateDiagram-v2
    [*] --> Pending: Patient Arrival (FHIR Launch)
    
    Pending --> AI_Processing: Nurse Submits Data
    
    state AI_Processing {
        [*] --> Extracting_Symptoms
        Extracting_Symptoms --> Scoring_Acuity
        Scoring_Acuity --> [*]
    }
    
    AI_Processing --> Awaiting_Validation: AI Results Ready
    AI_Processing --> Fallback_Manual: AI Service Failure
    
    Fallback_Manual --> Awaiting_Validation: Manual Data Entry
    
    Awaiting_Validation --> Validated: Nurse Confirms/Overrides
    
    Validated --> Routing: Routing Engine Triggered
    
    state Routing {
        [*] --> Check_Acuity
        Check_Acuity --> Direct_Assign: ESI 1-2
        Check_Acuity --> Queue: ESI 3-5
    }
    
    Direct_Assign --> Acknowledged: MD Accepts within 2 min
    Direct_Assign --> Escalated: Timeout > 2 min
    
    Queue --> Assigned: MD Picks from Track Board
    
    Escalated --> Assigned: Senior MD/Charge Nurse Assigns
    
    Acknowledged --> Completed: Workup Initiated
    Assigned --> Completed: Workup Initiated
    
    Completed --> [*]
```

## 4. Database Schema (Entity Relationship)

Core operational tables in Supabase PostgreSQL.

```mermaid
erDiagram
    PATIENTS ||--o{ TRIAGE_CASES : has
    PATIENTS ||--o{ VITAL_SIGNS : "monitored via"
    STAFF ||--o{ TRIAGE_CASES : validates
    STAFF ||--o{ ROUTING_ASSIGNMENTS : assigned_to
    TRIAGE_CASES ||--o{ ROUTING_ASSIGNMENTS : "routed via"
    TRIAGE_CASES ||--o{ AUDIT_LOGS : "tracked in"
    TRIAGE_CASES ||--o{ MODEL_PREDICTIONS : "generated"
    
    PATIENTS {
        uuid id PK
        string mrn
        string first_name
        string last_name
        date dob
        string gender
        string fhir_id
    }

    TRIAGE_CASES {
        uuid id PK
        uuid patient_id FK
        text chief_complaint
        int ai_draft_esi
        int validated_esi
        string status
        boolean is_override
        text ai_sbar_summary
    }

    VITAL_SIGNS {
        uuid id PK
        uuid patient_id FK
        int heart_rate
        int bp_systolic
        int bp_diastolic
        int spo2
        decimal temp
    }

    STAFF {
        uuid id PK
        uuid auth_user_id
        string role "nurse, physician, etc"
        string zone
        boolean is_available
    }

    ROUTING_ASSIGNMENTS {
        uuid id PK
        uuid case_id FK
        uuid assigned_to FK
        timestamp deadline
        string status
    }
```
