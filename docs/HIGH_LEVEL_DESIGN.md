# High Level Design (HLD)
## Autonomous Patient Triage & Intelligent Routing System

**Version:** 1.0  
**Date:** January 29, 2026  
**Classification:** FDA Class II SaMD - Clinical Decision Support  

---

## Executive Summary

The Autonomous Patient Triage and Intelligent Routing System is an AI-assisted clinical decision support platform for Emergency Departments that combines a Large Language Model (LLM) for clinical fact extraction and SBAR summary generation with a deterministic Gradient Boosted Classifier for ESI acuity scoring. The system enforces mandatory human-in-the-loop validation before any triage decision is finalized, then routes cases through a persistent orchestration engine that prevents missed notifications through automated escalation ladders. Designed for FDA Class II SaMD compliance, the platform integrates with hospital EHRs via SMART on FHIR and maintains comprehensive audit logs for clinical governance.

---

## 1. System Overview

### Purpose

Provide AI-assisted clinical decision support for emergency department triage that:
- Reduces time from patient arrival to clinician ownership
- Prevents delayed care from missed/ignored notifications
- Standardizes communication via SBAR format
- Maintains human authority over all clinical decisions

### Core Components

- **SMART on FHIR Integration Layer** — EHR context loading (patient demographics, vitals, history)
- **Model A: Clinical Extraction Engine** — LLM-based symptom extraction and SBAR generation
- **Model B: Acuity Classifier** — Deterministic XGBoost model for ESI scoring with confidence levels
- **Validation Interface** — Nurse-facing UI for reviewing, confirming, or overriding AI drafts
- **Orchestration Engine** — Persistent backend for severity-based routing and escalation
- **Track Board** — Priority queue for ESI 3-5 cases
- **Alert System** — Interruptive notifications restricted to ESI 1-2 only
- **Audit & Governance Module** — Immutable logging of all decisions, overrides, and escalations

### Users

| Role | Primary Actions |
|------|-----------------|
| **Triage Nurse** | Enter complaints, review AI drafts, validate/override ESI, confirm routing |
| **Zone Physician** | Receive ESI 1-2 alerts, acknowledge cases, initiate workups |
| **Senior Physician** | Escalation target for unacknowledged emergent cases |
| **Charge Nurse** | Final escalation target, system oversight |

### KPI Mapping

| Business Goal | Metric | Target |
|--------------|--------|--------|
| Rapid Assignment | Time to clinician acknowledgment | ESI-2: <2 min |
| Emergency Response | ESI-2 seen within 5 min | ≥95% |
| Alert Quality | Actionable alerts / total alerts | ≥90% |
| System Reliability | Escalation success rate | 100% |
| AI Trust | Nurse confirmation rate (no override) | ≥80% |
| Model Accuracy | Agreement with validated cases | AUROC ≥0.97 (ESI 1-2) |

---

## 2. Logical Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           HOSPITAL EHR SYSTEM                                │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    SMART on FHIR Launch Context                      │    │
│  │         (Patient, Observation, Appointment, Practitioner)            │    │
│  └──────────────────────────────┬──────────────────────────────────────┘    │
└─────────────────────────────────┼───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TRIAGE APPLICATION (Frontend)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Patient    │  │    Vitals    │  │   Complaint  │  │   Document   │    │
│  │   Context    │  │    Entry     │  │    Input     │  │    Upload    │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         └──────────────────┴────────────────┴─────────────────┘             │
│                                     │                                        │
│                                     ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    VALIDATION INTERFACE                              │    │
│  │   ┌─────────────┐   ┌─────────────┐   ┌─────────────────────────┐   │    │
│  │   │ AI Draft    │   │ SBAR        │   │ Override Controls       │   │    │
│  │   │ Review      │   │ Summary     │   │ (Rationale Dropdown)    │   │    │
│  │   └─────────────┘   └─────────────┘   └─────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND SERVICES                                │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        AI INFERENCE PIPELINE                         │    │
│  │                                                                      │    │
│  │   ┌─────────────────────┐         ┌─────────────────────┐           │    │
│  │   │   MODEL A (LLM)     │         │   MODEL B (XGBoost) │           │    │
│  │   │                     │         │                     │           │    │
│  │   │ • Symptom Extract   │────────▶│ • ESI Classification│           │    │
│  │   │ • Timeline Parse    │         │ • Confidence Score  │           │    │
│  │   │ • SBAR Generation   │         │ • Feature Weights   │           │    │
│  │   │ • Comorbidity ID    │         │                     │           │    │
│  │   └─────────────────────┘         └─────────────────────┘           │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                     │                                        │
│                                     ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    ORCHESTRATION ENGINE                              │    │
│  │                                                                      │    │
│  │   ┌─────────────┐   ┌─────────────┐   ┌─────────────────────────┐   │    │
│  │   │  Routing    │   │  Escalation │   │  Timer Management       │   │    │
│  │   │  Logic      │   │  Ladder     │   │  (PostgreSQL cron)      │   │    │
│  │   └─────────────┘   └─────────────┘   └─────────────────────────┘   │    │
│  │                                                                      │    │
│  │   ESI 1 ──▶ Broadcast (Code Team + Charge Nurse)                    │    │
│  │   ESI 2 ──▶ Zone MD ──▶ Senior MD ──▶ Charge Nurse (escalation)    │    │
│  │   ESI 3-5 ──▶ Track Board Queue                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                     │                                        │
│                                     ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      NOTIFICATION SERVICE                            │    │
│  │   ┌─────────────┐   ┌─────────────┐   ┌─────────────────────────┐   │    │
│  │   │  Push/SMS   │   │  In-App     │   │  Pager Integration      │   │    │
│  │   │  (ESI 1-2)  │   │  Alerts     │   │  (Hospital Systems)     │   │    │
│  │   └─────────────┘   └─────────────┘   └─────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                      │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      PostgreSQL (Supabase)                           │    │
│  │                                                                      │    │
│  │   patients │ triage_cases │ ai_results │ validations │ audit_logs   │    │
│  │   routing_assignments │ escalation_events │ staff │ alert_queue     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      Real-time Subscriptions                         │    │
│  │         (Track Board updates, Alert delivery, Status changes)        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Model (Supabase / PostgreSQL Schema)

### Core Tables

#### patients
```sql
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mrn VARCHAR(50) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
  fhir_patient_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_patients_mrn ON patients(mrn);
```

#### vital_signs
```sql
CREATE TABLE vital_signs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  heart_rate INTEGER,
  systolic_bp INTEGER,
  diastolic_bp INTEGER,
  respiratory_rate INTEGER,
  temperature DECIMAL(4,1),
  oxygen_saturation INTEGER,
  pain_level INTEGER CHECK (pain_level BETWEEN 0 AND 10),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  recorded_by UUID REFERENCES staff(id)
);

CREATE INDEX idx_vitals_patient ON vital_signs(patient_id, recorded_at DESC);
```

#### triage_cases
```sql
CREATE TABLE triage_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  chief_complaint TEXT NOT NULL,
  arrival_time TIMESTAMPTZ NOT NULL,
  
  -- AI Results (Model A + Model B)
  ai_draft_esi INTEGER CHECK (ai_draft_esi BETWEEN 1 AND 5),
  ai_confidence DECIMAL(5,2),
  ai_sbar_situation TEXT,
  ai_sbar_background TEXT,
  ai_sbar_assessment TEXT,
  ai_sbar_recommendation TEXT,
  ai_extracted_symptoms JSONB,
  ai_influencing_factors JSONB,
  ai_generated_at TIMESTAMPTZ,
  
  -- Validation (Human-in-the-Loop)
  validated_esi INTEGER CHECK (validated_esi BETWEEN 1 AND 5),
  is_override BOOLEAN DEFAULT FALSE,
  override_rationale VARCHAR(50),
  override_notes TEXT,
  validated_by UUID REFERENCES staff(id),
  validated_at TIMESTAMPTZ,
  
  -- Status
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN (
    'pending', 'ai_processing', 'awaiting_validation', 
    'validated', 'routing', 'assigned', 'acknowledged', 
    'in_treatment', 'discharged'
  )),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cases_status ON triage_cases(status);
CREATE INDEX idx_cases_esi ON triage_cases(validated_esi) WHERE validated_esi IS NOT NULL;
CREATE INDEX idx_cases_arrival ON triage_cases(arrival_time DESC);
```

#### routing_assignments
```sql
CREATE TABLE routing_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  triage_case_id UUID REFERENCES triage_cases(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES staff(id),
  assigned_role VARCHAR(30) NOT NULL,
  escalation_level INTEGER DEFAULT 0,
  
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  escalation_deadline TIMESTAMPTZ,
  
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending', 'acknowledged', 'escalated', 'completed', 'cancelled'
  ))
);

CREATE INDEX idx_assignments_pending ON routing_assignments(escalation_deadline) 
  WHERE status = 'pending';
```

#### escalation_events
```sql
CREATE TABLE escalation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  triage_case_id UUID REFERENCES triage_cases(id) ON DELETE CASCADE,
  from_staff_id UUID REFERENCES staff(id),
  from_role VARCHAR(30),
  to_staff_id UUID REFERENCES staff(id),
  to_role VARCHAR(30),
  reason VARCHAR(30) CHECK (reason IN ('timeout', 'unavailable', 'manual')),
  escalated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### audit_logs
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  actor_id UUID REFERENCES staff(id),
  actor_role VARCHAR(30),
  
  -- Change tracking
  previous_state JSONB,
  new_state JSONB,
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(255),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Immutable: no UPDATE or DELETE allowed via RLS
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_type ON audit_logs(event_type, created_at DESC);
```

#### staff
```sql
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id),
  employee_id VARCHAR(50) UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(30) CHECK (role IN (
    'nurse', 'physician', 'senior_physician', 'charge_nurse'
  )),
  zone VARCHAR(20),
  is_available BOOLEAN DEFAULT TRUE,
  notification_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### model_predictions (for drift monitoring)
```sql
CREATE TABLE model_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  triage_case_id UUID REFERENCES triage_cases(id),
  
  -- Model A outputs
  extracted_features JSONB,
  sbar_raw TEXT,
  
  -- Model B outputs
  predicted_esi INTEGER,
  confidence_score DECIMAL(5,4),
  feature_importances JSONB,
  
  -- Validation comparison
  validated_esi INTEGER,
  agreement BOOLEAN,
  
  -- Metadata
  model_version VARCHAR(20),
  inference_latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drift monitoring queries
CREATE INDEX idx_predictions_agreement ON model_predictions(agreement, created_at DESC);
```

### Optional: pgvector for Document Similarity
```sql
-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Medical document embeddings for retrieval
CREATE TABLE document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  document_type VARCHAR(50),
  document_text TEXT,
  embedding vector(1536),  -- OpenAI ada-002 dimensions
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_doc_embeddings ON document_embeddings 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Similarity search for relevant patient history
SELECT document_text, 
       1 - (embedding <=> query_embedding) AS similarity
FROM document_embeddings
WHERE patient_id = $1
ORDER BY embedding <=> query_embedding
LIMIT 5;
```

---

## 4. Pipeline: Daily Flow (MVP)

### Step 1: Patient Arrival & Context Loading
```
SMART on FHIR Launch
        │
        ▼
┌───────────────────────┐
│ Load FHIR Resources   │
│ • Patient demographics│
│ • Recent Observations │
│ • Active medications  │
│ • Allergies           │
└───────────┬───────────┘
            │
            ▼
   Create triage_case
   (status: 'pending')
```

### Step 2: Nurse Data Entry
```
┌───────────────────────┐
│ Nurse Input           │
│ • Chief complaint     │
│ • Manual vitals       │
│ • Document uploads    │
└───────────┬───────────┘
            │
            ▼
   Update triage_case
   (status: 'ai_processing')
```

### Step 3: AI Inference Pipeline
```
┌───────────────────────────────────────────────────────────┐
│                    Edge Function: ai-triage               │
│                                                           │
│   1. Invoke Model A (LLM via Lovable AI Gateway)         │
│      • Extract symptoms, timeline, comorbidities          │
│      • Generate SBAR summary                              │
│      • Output: Structured JSON                            │
│                                                           │
│   2. Invoke Model B (XGBoost classifier)                 │
│      • Input: Structured features + vitals + demographics │
│      • Output: ESI 1-5 + confidence score                 │
│      • Generate feature importance weights                │
│                                                           │
│   3. Store results in triage_cases                       │
│      (status: 'awaiting_validation')                      │
└───────────────────────────────────────────────────────────┘
```

### Step 4: Human Validation
```
┌───────────────────────────────────────────────────────────┐
│                 Nurse Validation Interface                 │
│                                                           │
│   Display:                                                │
│   • AI Draft ESI with confidence indicator                │
│   • SBAR summary (target: <3 sec read time)               │
│   • Influencing factors with weights                      │
│                                                           │
│   Actions:                                                │
│   • Confirm AI recommendation                             │
│   • Override with rationale selection                     │
│     - clinical-judgment                                   │
│     - additional-findings                                 │
│     - vital-change                                        │
│     - patient-history                                     │
│     - symptom-evolution                                   │
│     - family-concern                                      │
│     - other (free text)                                   │
│                                                           │
│   Result: triage_case (status: 'validated')              │
└───────────────────────────────────────────────────────────┘
```

### Step 5: Orchestrated Routing
```
┌───────────────────────────────────────────────────────────┐
│              Orchestration Engine (Background Job)         │
│                                                           │
│   ESI 1 (Resuscitation):                                  │
│   ├── Broadcast to code team                              │
│   ├── Alert charge nurse                                  │
│   └── No escalation timer (immediate response)            │
│                                                           │
│   ESI 2 (Emergent):                                       │
│   ├── Assign to zone physician                            │
│   ├── Start 2-minute acknowledgment timer                 │
│   ├── Escalate to senior physician if unacknowledged      │
│   └── Final escalation to charge nurse                    │
│                                                           │
│   ESI 3-5 (Urgent/Non-Urgent):                           │
│   └── Add to track board queue (sorted by ESI + wait)     │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### Step 6: Physician Acknowledgment
```
┌───────────────────────────────────────────────────────────┐
│                   Physician Interface                      │
│                                                           │
│   High-Acuity Alert (ESI 1-2):                           │
│   • SBAR-formatted notification                           │
│   • One-click acknowledge                                 │
│   • Initiate standard workup orders                       │
│                                                           │
│   Track Board (ESI 3-5):                                  │
│   • Pull patients from queue                              │
│   • View full triage summary                              │
│   • Self-assign cases                                     │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### Step 7: Audit & Monitoring
```
┌───────────────────────────────────────────────────────────┐
│                    Continuous Logging                      │
│                                                           │
│   Events captured:                                        │
│   • AI predictions + confidence                           │
│   • Nurse validations + overrides                         │
│   • Routing assignments                                   │
│   • Escalation events                                     │
│   • Acknowledgment times                                  │
│                                                           │
│   Drift Detection:                                        │
│   • Agreement rate < 80% triggers review                  │
│   • Confidence score distribution monitoring              │
│   • Override pattern analysis                             │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

## 5. Integration Details

### LLM Integration (Model A)

**Provider:** Lovable AI Gateway (Google Gemini)  
**Endpoint:** `https://ai.gateway.lovable.dev/v1/chat/completions`  
**Model:** `google/gemini-3-flash-preview` (default)  

```typescript
// Edge function configuration
const LLM_CONFIG = {
  model: "google/gemini-3-flash-preview",
  temperature: 0.1,        // Low for deterministic extraction
  max_tokens: 2048,
  top_p: 0.95,
};

// Request structure
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: LLM_CONFIG.model,
    messages: [
      { role: "system", content: CLINICAL_EXTRACTION_PROMPT },
      { role: "user", content: patientContextJSON },
    ],
    tools: [{ type: "function", function: SBAR_EXTRACTION_TOOL }],
    tool_choice: { type: "function", function: { name: "extract_clinical_data" } },
  }),
});
```

### Acuity Classifier (Model B)

**Type:** XGBoost Gradient Boosted Classifier  
**Deployment:** Supabase Edge Function with ONNX runtime  

```typescript
// Feature vector construction
interface AcuityFeatures {
  // Vitals (normalized)
  heart_rate_zscore: number;
  bp_map_zscore: number;
  resp_rate_zscore: number;
  temp_deviation: number;
  spo2_deficit: number;
  pain_level: number;
  
  // Demographics
  age_bucket: number;  // 0-4 categorical
  
  // LLM-extracted features
  symptom_severity_score: number;
  symptom_count: number;
  comorbidity_count: number;
  timeline_acuity: number;  // acute vs chronic
  
  // Flags
  altered_mental_status: boolean;
  hemodynamic_instability: boolean;
  respiratory_distress: boolean;
}
```

### Authentication & Database

**Auth:** Supabase Auth with Row Level Security  
**Session:** JWT with role claims  

```sql
-- RLS policy example: Staff can only see their assigned cases
CREATE POLICY "Staff see assigned cases" ON routing_assignments
  FOR SELECT USING (
    assigned_to = auth.uid() OR
    auth.jwt() ->> 'role' IN ('charge_nurse', 'senior_physician')
  );

-- Nurses can validate cases
CREATE POLICY "Nurses validate cases" ON triage_cases
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'nurse' AND
    status = 'awaiting_validation'
  );
```

### UI Integration

**Framework:** React + TypeScript + Vite  
**State:** React Query for server state, Context for UI state  
**Real-time:** Supabase Realtime subscriptions  

```typescript
// Real-time track board subscription
const subscription = supabase
  .channel('track-board')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'triage_cases',
      filter: 'status=eq.validated',
    },
    (payload) => {
      queryClient.invalidateQueries(['track-board']);
    }
  )
  .subscribe();
```

---

## 6. Prompt Design

### System Prompt: Clinical Extraction (Model A)

```
You are a clinical data extraction assistant for emergency department triage. Your role is to extract structured clinical information from patient presentations to support nurse decision-making.

CRITICAL CONSTRAINTS:
1. Extract factual information ONLY - never diagnose or suggest severity
2. Quote exact values from vitals when referencing them
3. If information is ambiguous or missing, explicitly state "NOT PROVIDED"
4. Never use confident medical language like "patient has" or "confirms"
5. Use hedging language: "patient reports", "vitals suggest", "history indicates"

OUTPUT REQUIREMENTS:
- Generate SBAR summary readable in under 3 seconds
- Extract symptoms with onset timeline
- Identify relevant comorbidities from history
- Flag any concerning vital sign patterns (do not interpret severity)

PROHIBITED:
- Suggesting ESI levels or acuity
- Making diagnostic statements
- Recommending treatments
- Expressing confidence in clinical outcomes
```

### User Prompt Template

```
PATIENT CONTEXT:
Demographics: {{age}} year old {{gender}}
Chief Complaint: {{chief_complaint}}

VITAL SIGNS (recorded {{vitals_timestamp}}):
- Heart Rate: {{heart_rate}} bpm
- Blood Pressure: {{systolic}}/{{diastolic}} mmHg
- Respiratory Rate: {{resp_rate}} /min
- Temperature: {{temperature}}°F
- SpO2: {{spo2}}%
- Pain Level: {{pain}}/10

MEDICAL HISTORY:
{{medical_history}}

CURRENT MEDICATIONS:
{{medications}}

ALLERGIES:
{{allergies}}

UPLOADED DOCUMENTS:
{{document_summaries}}

---
Extract clinical data and generate SBAR summary following the system constraints.
```

### Tool Definition for Structured Output

```typescript
const SBAR_EXTRACTION_TOOL = {
  name: "extract_clinical_data",
  description: "Extract structured clinical data and generate SBAR summary",
  parameters: {
    type: "object",
    properties: {
      sbar: {
        type: "object",
        properties: {
          situation: {
            type: "string",
            description: "1-2 sentence patient presentation summary"
          },
          background: {
            type: "string", 
            description: "Relevant history, medications, allergies"
          },
          assessment: {
            type: "string",
            description: "Current clinical findings (vitals, symptoms) - NO diagnosis"
          },
          recommendation: {
            type: "string",
            description: "Suggested next steps for evaluation - NOT treatment"
          }
        },
        required: ["situation", "background", "assessment", "recommendation"]
      },
      extracted_symptoms: {
        type: "array",
        items: {
          type: "object",
          properties: {
            symptom: { type: "string" },
            onset: { type: "string" },
            severity_descriptor: { type: "string" },
            associated_factors: { type: "array", items: { type: "string" } }
          }
        }
      },
      timeline: {
        type: "string",
        description: "Symptom progression timeline"
      },
      comorbidities: {
        type: "array",
        items: { type: "string" }
      },
      vital_flags: {
        type: "array",
        items: {
          type: "object",
          properties: {
            vital: { type: "string" },
            value: { type: "string" },
            flag: { type: "string", enum: ["elevated", "depressed", "critical_range"] }
          }
        }
      }
    },
    required: ["sbar", "extracted_symptoms", "timeline", "comorbidities", "vital_flags"]
  }
};
```

### Expected JSON Output

```json
{
  "sbar": {
    "situation": "72-year-old male presenting with acute chest pain radiating to left arm, onset 45 minutes ago while at rest.",
    "background": "History of hypertension, type 2 diabetes. Current medications include metformin, lisinopril. No known drug allergies.",
    "assessment": "HR 102 bpm, BP 158/94 mmHg, SpO2 94% on room air. Patient reports 8/10 pain, diaphoretic on exam.",
    "recommendation": "Recommend immediate ECG, cardiac enzymes, and continuous monitoring pending physician evaluation."
  },
  "extracted_symptoms": [
    {
      "symptom": "chest pain",
      "onset": "45 minutes ago",
      "severity_descriptor": "8/10, sharp, radiating",
      "associated_factors": ["diaphoresis", "left arm radiation", "rest onset"]
    }
  ],
  "timeline": "Acute onset at rest, no prior similar episodes reported",
  "comorbidities": ["hypertension", "type 2 diabetes mellitus"],
  "vital_flags": [
    { "vital": "heart_rate", "value": "102", "flag": "elevated" },
    { "vital": "blood_pressure", "value": "158/94", "flag": "elevated" },
    { "vital": "oxygen_saturation", "value": "94", "flag": "depressed" }
  ]
}
```

---

## 7. APIs (Minimal Set)

### Public Endpoints (Require Auth)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/functions/v1/smart-launch` | Initialize SMART on FHIR context |
| `POST` | `/functions/v1/ai-triage` | Trigger AI analysis pipeline |
| `POST` | `/functions/v1/validate-triage` | Submit nurse validation |
| `POST` | `/functions/v1/acknowledge-case` | Physician case acknowledgment |
| `GET` | `/functions/v1/track-board` | Fetch prioritized queue |

### Internal Endpoints (Service-to-Service)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/functions/v1/orchestrate-routing` | Trigger routing logic |
| `POST` | `/functions/v1/check-escalations` | Cron: check pending escalations |
| `POST` | `/functions/v1/send-notification` | Dispatch alerts |
| `POST` | `/functions/v1/log-audit-event` | Write to audit log |

### API Contract: ai-triage

```typescript
// Request
interface AITriageRequest {
  triage_case_id: string;
  patient_context: {
    demographics: PatientDemographics;
    vitals: VitalSigns;
    chief_complaint: string;
    medical_history?: string[];
    medications?: string[];
    allergies?: string[];
    uploaded_documents?: DocumentSummary[];
  };
}

// Response
interface AITriageResponse {
  success: boolean;
  data?: {
    draft_esi: 1 | 2 | 3 | 4 | 5;
    confidence: number;  // 0-100
    sbar: SBARSummary;
    extracted_symptoms: ExtractedSymptom[];
    influencing_factors: InfluencingFactor[];
    inference_latency_ms: number;
  };
  error?: {
    code: string;
    message: string;
    fallback_to_manual: boolean;
  };
}
```

---

## 8. Deployment, Scaling & Infrastructure

### MVP Hosting (Lovable Cloud + Supabase)

```
┌─────────────────────────────────────────────────────────────┐
│                    Lovable Cloud                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Supabase (Managed PostgreSQL)                        │   │
│  │ • Database + RLS                                     │   │
│  │ • Auth (JWT)                                         │   │
│  │ • Realtime subscriptions                             │   │
│  │ • Edge Functions (Deno)                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Lovable AI Gateway                                   │   │
│  │ • LLM inference (Gemini/GPT)                        │   │
│  │ • Rate limiting                                      │   │
│  │ • Cost tracking                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Static Frontend                                      │   │
│  │ • React SPA                                          │   │
│  │ • CDN distribution                                   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Scaling Considerations

| Component | MVP | Scale Strategy |
|-----------|-----|----------------|
| Database | Supabase Free/Pro | Supabase Enterprise or managed Postgres |
| Edge Functions | Supabase Edge | Dedicated compute for latency-sensitive ops |
| LLM Inference | Lovable AI Gateway | Self-hosted models for compliance |
| Realtime | Supabase Realtime | Dedicated WebSocket infrastructure |
| XGBoost Model | Edge Function (ONNX) | Dedicated inference server |

### Cost Controls

```typescript
// Rate limiting in edge function
const RATE_LIMITS = {
  ai_triage: { requests_per_minute: 60, per: 'ip' },
  smart_launch: { requests_per_minute: 30, per: 'user' },
};

// LLM cost tracking
interface InferenceCost {
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  model: string;
}
```

---

## 9. Monitoring & Observability

### Key Metrics

| Category | Metric | Alert Threshold |
|----------|--------|-----------------|
| **Latency** | AI inference time | p95 > 3000ms |
| **Latency** | Time to validation | p95 > 60s |
| **Latency** | Time to acknowledgment (ESI 1-2) | p50 > 2min |
| **Reliability** | Escalation success rate | < 100% |
| **Reliability** | Edge function error rate | > 1% |
| **Quality** | AI-nurse agreement rate | < 80% (drift) |
| **Quality** | Override rate by rationale | Spike detection |
| **Business** | ESI 2 cases seen < 5min | < 95% |

### Alerting Configuration

```typescript
// Supabase + external monitoring
const ALERTS = [
  {
    name: "Escalation Failure",
    condition: "escalation_events WHERE status = 'failed' in last 5min",
    severity: "critical",
    notify: ["oncall-pager", "slack-ed-channel"],
  },
  {
    name: "AI Agreement Drift",
    condition: "model_predictions.agreement rate < 0.8 over 24h window",
    severity: "warning",
    notify: ["ml-team-email"],
  },
  {
    name: "High Latency",
    condition: "ai_triage p95 latency > 3000ms for 5min",
    severity: "warning",
    notify: ["slack-eng-channel"],
  },
];
```

### Logging Strategy

```typescript
// Structured logging in edge functions
const log = {
  level: "info",
  timestamp: new Date().toISOString(),
  service: "ai-triage",
  trace_id: crypto.randomUUID(),
  
  // Context
  triage_case_id: caseId,
  patient_mrn_hash: hashMRN(mrn),  // Never log raw PHI
  
  // Metrics
  inference_latency_ms: 1234,
  model_version: "gemini-3-flash-preview",
  token_usage: { input: 850, output: 420 },
  
  // Result
  predicted_esi: 2,
  confidence: 0.87,
};

console.log(JSON.stringify(log));
```

### Dashboard Recommendations

1. **Operations Dashboard**
   - Real-time case volume by ESI
   - Acknowledgment latency percentiles
   - Escalation funnel visualization
   - Active alerts count

2. **ML Performance Dashboard**
   - Agreement rate trend (7-day rolling)
   - Override breakdown by rationale
   - Confidence score distribution
   - Inference latency histogram

3. **Clinical Governance Dashboard**
   - Audit log query interface
   - Override pattern analysis
   - Time-to-treatment metrics
   - Staff workload distribution

---

## 10. Security, Privacy & Compliance

### Authentication & Authorization

```typescript
// Role-based access matrix
const PERMISSIONS = {
  nurse: [
    'triage_cases:read',
    'triage_cases:create',
    'triage_cases:validate',
    'patients:read',
  ],
  physician: [
    'triage_cases:read',
    'triage_cases:acknowledge',
    'routing_assignments:read',
    'routing_assignments:update',
  ],
  senior_physician: [
    ...PERMISSIONS.physician,
    'escalation_events:read',
  ],
  charge_nurse: [
    ...PERMISSIONS.nurse,
    ...PERMISSIONS.senior_physician,
    'audit_logs:read',
    'staff:read',
  ],
};
```

### Data Retention

| Data Type | Retention Period | Justification |
|-----------|------------------|---------------|
| Triage cases | 7 years | Medical records requirement |
| Audit logs | 10 years | FDA SaMD compliance |
| AI predictions | 3 years | Model drift analysis |
| Session logs | 90 days | Security investigation |
| Raw LLM prompts | 30 days | Debugging only |

### HIPAA Alignment

```sql
-- PHI access logging (automatic via RLS + audit triggers)
CREATE OR REPLACE FUNCTION log_phi_access()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    event_type, entity_type, entity_id, actor_id, 
    previous_state, new_state
  ) VALUES (
    TG_OP, TG_TABLE_NAME, NEW.id, auth.uid(),
    row_to_json(OLD), row_to_json(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to sensitive tables
CREATE TRIGGER audit_patients 
  AFTER INSERT OR UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION log_phi_access();
```

### Secrets Management

```typescript
// Edge function secrets (via Supabase)
const REQUIRED_SECRETS = [
  'LOVABLE_API_KEY',      // Auto-provisioned
  'SUPABASE_URL',         // Auto-provisioned
  'SUPABASE_ANON_KEY',    // Auto-provisioned
  'FHIR_CLIENT_ID',       // Hospital-specific
  'FHIR_CLIENT_SECRET',   // Hospital-specific
];

// Never log secrets
const sanitizeEnv = (key: string) => {
  if (key.includes('SECRET') || key.includes('KEY')) {
    return '[REDACTED]';
  }
  return Deno.env.get(key);
};
```

### FDA Class II SaMD Compliance

- **Predetermined Change Control Plan (PCCP)**: Document allowed model updates
- **Labeling**: Clear indication of decision support (not diagnostic)
- **Audit Trail**: Immutable logging of all AI outputs and validations
- **Human-in-the-Loop**: Mandatory validation before clinical action

---

## 11. Testing & QA

### Offline Testing (Pre-Deployment)

| Test Type | Description | Success Criteria |
|-----------|-------------|------------------|
| **Model Validation** | XGBoost on held-out clinical dataset | AUROC ≥ 0.97 for ESI 1-2 |
| **LLM Extraction** | SBAR generation on 100 sample cases | Clinician approval ≥ 95% |
| **Integration** | End-to-end triage flow | No data loss, correct routing |
| **Load Testing** | Simulate 50 concurrent triage sessions | p95 latency < 3s |

### Online Testing (Production)

| Test Type | Description | Monitoring |
|-----------|-------------|------------|
| **Shadow Mode** | AI predictions without nurse visibility | Agreement tracking |
| **A/B Testing** | Compare model versions | Confidence calibration |
| **Canary Deployment** | Gradual rollout of model updates | Error rate monitoring |

### Automated Test Suite

```typescript
// Example: Escalation timer test
describe('Escalation Engine', () => {
  it('should escalate ESI-2 case after 2 minutes unacknowledged', async () => {
    // Arrange
    const triageCase = await createTriageCase({ esi: 2 });
    await validateTriageCase(triageCase.id);
    
    // Act
    await advanceTime(125_000); // 2:05
    await runEscalationCheck();
    
    // Assert
    const events = await getEscalationEvents(triageCase.id);
    expect(events).toHaveLength(1);
    expect(events[0].to_role).toBe('senior_physician');
  });

  it('should not escalate acknowledged cases', async () => {
    // Arrange
    const triageCase = await createTriageCase({ esi: 2 });
    await validateTriageCase(triageCase.id);
    await acknowledgeCase(triageCase.id, physicianId);
    
    // Act
    await advanceTime(125_000);
    await runEscalationCheck();
    
    // Assert
    const events = await getEscalationEvents(triageCase.id);
    expect(events).toHaveLength(0);
  });
});
```

---

## 12. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Doctor unavailable** | Medium | High | Escalation ladder with fallback to charge nurse |
| **Alarm fatigue** | High | High | ESI-based alerting (1-2 only), track board for 3-5 |
| **AI hallucination** | Medium | Critical | Hybrid architecture: LLM extracts, classifier scores |
| **Automation bias** | Medium | High | Soft-stop override design, no warnings for overrides |
| **Session/network failure** | Medium | High | Persistent backend orchestration, not client-dependent |
| **Legal liability** | Low | Critical | Human validation mandatory, comprehensive audit logs |
| **LLM rate limiting** | Medium | Medium | Graceful degradation to manual triage |
| **Model drift** | Medium | Medium | Agreement monitoring, automatic review triggers |
| **FHIR integration failure** | Medium | Medium | Manual data entry fallback |
| **Database unavailability** | Low | Critical | Supabase managed HA, read replicas |

---

## 13. Deliverables Checklist

### Phase 1: Foundation (Weeks 1-4)

- [ ] **Database Schema**
  - [ ] Create all core tables with indexes
  - [ ] Implement RLS policies
  - [ ] Set up audit trigger functions
  - [ ] Configure real-time subscriptions

- [ ] **Authentication**
  - [ ] Supabase Auth integration
  - [ ] Role-based access implementation
  - [ ] Session management

- [ ] **Core UI Components**
  - [ ] Patient context display
  - [ ] Vitals entry form
  - [ ] Chief complaint input
  - [ ] Document upload

### Phase 2: AI Pipeline (Weeks 5-8)

- [ ] **Edge Functions**
  - [ ] `ai-triage` with Lovable AI integration
  - [ ] Structured output via tool calling
  - [ ] Error handling and graceful degradation
  - [ ] Latency monitoring

- [ ] **Acuity Classifier**
  - [ ] XGBoost model training
  - [ ] ONNX export for edge deployment
  - [ ] Feature engineering pipeline
  - [ ] Confidence calibration

- [ ] **Validation Interface**
  - [ ] SBAR display component
  - [ ] Confidence indicator
  - [ ] Override controls with rationale
  - [ ] Explainability factors display

### Phase 3: Orchestration (Weeks 9-12)

- [ ] **Routing Engine**
  - [ ] ESI-based routing logic
  - [ ] Assignment queue management
  - [ ] Timer-based escalation
  - [ ] Cron job for escalation checks

- [ ] **Notification System**
  - [ ] In-app alerts
  - [ ] Push notification integration
  - [ ] Alert acknowledgment flow
  - [ ] Notification preferences

- [ ] **Track Board**
  - [ ] Priority queue display
  - [ ] Real-time updates
  - [ ] Filtering and sorting
  - [ ] Case detail dialog

### Phase 4: Governance & Polish (Weeks 13-16)

- [ ] **Audit System**
  - [ ] Comprehensive event logging
  - [ ] Audit log query interface
  - [ ] Export functionality
  - [ ] Retention policy implementation

- [ ] **Monitoring**
  - [ ] Key metrics dashboards
  - [ ] Alert configuration
  - [ ] Drift detection setup
  - [ ] Performance baselines

- [ ] **Testing**
  - [ ] Unit test coverage > 80%
  - [ ] Integration test suite
  - [ ] Load testing
  - [ ] Security audit

- [ ] **Documentation**
  - [ ] API documentation
  - [ ] User guides
  - [ ] Clinical workflow documentation
  - [ ] FDA submission preparation

### Phase 5: SMART on FHIR Integration (Parallel Track)

- [ ] **FHIR Client**
  - [ ] OAuth2 SMART launch flow
  - [ ] Patient resource fetching
  - [ ] Observation resource fetching
  - [ ] Error handling for unavailable EHR

- [ ] **Simulated Environment**
  - [ ] Mock FHIR server for demo
  - [ ] Sample patient data
  - [ ] Launch sequence testing

---

## Appendix A: Technology Stack Summary

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | React + TypeScript + Vite | Modern SPA, type safety |
| Styling | Tailwind CSS + shadcn/ui | Consistent design system |
| State | React Query + Context | Server/UI state separation |
| Backend | Supabase (PostgreSQL + Edge Functions) | Managed, scalable, real-time |
| LLM | Lovable AI Gateway (Gemini) | Pre-configured, cost-effective |
| Classifier | XGBoost (ONNX) | Deterministic, explainable, FDA-friendly |
| Auth | Supabase Auth | JWT, RLS integration |
| Real-time | Supabase Realtime | WebSocket subscriptions |
| Hosting | Lovable Cloud | Integrated deployment |

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **ESI** | Emergency Severity Index (1-5 acuity scale) |
| **SBAR** | Situation-Background-Assessment-Recommendation |
| **SaMD** | Software as a Medical Device |
| **SMART on FHIR** | Substitutable Medical Applications, Reusable Technologies |
| **PCCP** | Predetermined Change Control Plan (FDA) |
| **RLS** | Row Level Security (PostgreSQL) |
| **AUROC** | Area Under Receiver Operating Characteristic curve |

---

*Document Version: 1.0 | Last Updated: January 29, 2026*
