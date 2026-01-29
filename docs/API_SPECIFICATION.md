# API Specification
## Autonomous Patient Triage & Intelligent Routing System

**Version:** 1.0  
**Base URL:** `https://<project-id>.supabase.co/functions/v1`  
**Last Updated:** January 29, 2026  

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Common Headers](#3-common-headers)
4. [Error Handling](#4-error-handling)
5. [Rate Limiting](#5-rate-limiting)
6. [Endpoints](#6-endpoints)
   - [SMART on FHIR Launch](#61-smart-on-fhir-launch)
   - [AI Triage](#62-ai-triage)
   - [Triage Validation](#63-triage-validation)
   - [Case Acknowledgment](#64-case-acknowledgment)
   - [Track Board](#65-track-board)
   - [Escalation Management](#66-escalation-management)
   - [Audit Logs](#67-audit-logs)
   - [Staff Management](#68-staff-management)
7. [WebSocket Events](#7-websocket-events)
8. [Webhooks](#8-webhooks)

---

## 1. Overview

This API provides programmatic access to the MedTriage AI Clinical Decision Support System. All endpoints are implemented as Supabase Edge Functions and follow RESTful conventions.

### API Design Principles

- **Human-in-the-Loop**: No autonomous clinical decisions; all AI outputs require validation
- **Audit Trail**: Every mutation is logged for compliance
- **Fail-Safe**: Graceful degradation when AI services are unavailable
- **HIPAA-Aligned**: No PHI in URLs or logs; encrypted at rest and in transit

### Environment URLs

| Environment | Base URL |
|-------------|----------|
| Development | `https://<project-id>.supabase.co/functions/v1` |
| Staging | `https://<staging-id>.supabase.co/functions/v1` |
| Production | `https://<prod-id>.supabase.co/functions/v1` |

---

## 2. Authentication

### JWT Bearer Token

All API requests require a valid JWT token obtained through Supabase Auth.

```http
Authorization: Bearer <jwt_token>
```

### Obtaining a Token

```typescript
// Client-side authentication
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'nurse@hospital.org',
  password: 'secure_password'
});

const token = data.session?.access_token;
```

### Token Claims

```json
{
  "sub": "user-uuid",
  "email": "nurse@hospital.org",
  "role": "nurse",
  "aud": "authenticated",
  "exp": 1706540400,
  "iat": 1706536800
}
```

### Role-Based Access

| Role | Access Level |
|------|--------------|
| `nurse` | Create triage cases, validate AI drafts, view queue |
| `physician` | View assigned cases, acknowledge, initiate orders |
| `senior_physician` | All physician access + escalation visibility |
| `charge_nurse` | Full access including audit logs and staff management |

---

## 3. Common Headers

### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | Bearer token for authentication |
| `Content-Type` | Yes | `application/json` for all requests |
| `X-Request-ID` | No | Client-generated UUID for tracing |
| `X-Client-Version` | No | Client application version |

### Response Headers

| Header | Description |
|--------|-------------|
| `X-Request-ID` | Echo of client request ID or server-generated |
| `X-RateLimit-Limit` | Maximum requests per window |
| `X-RateLimit-Remaining` | Remaining requests in current window |
| `X-RateLimit-Reset` | Unix timestamp when limit resets |

---

## 4. Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error message",
    "details": {
      "field": "chief_complaint",
      "reason": "Required field is missing"
    },
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Error Codes

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request payload |
| 400 | `INVALID_ESI_LEVEL` | ESI level must be 1-5 |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Insufficient permissions for action |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Resource state conflict (e.g., already validated) |
| 422 | `UNPROCESSABLE_ENTITY` | Semantically invalid request |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |
| 503 | `AI_UNAVAILABLE` | AI service temporarily unavailable |

### AI Fallback Response

When AI services are unavailable, endpoints return a fallback indicator:

```json
{
  "success": true,
  "data": {
    "ai_available": false,
    "fallback_mode": true,
    "message": "AI services unavailable. Manual triage required."
  }
}
```

---

## 5. Rate Limiting

### Default Limits

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| AI Triage | 60 requests | 1 minute |
| Read Operations | 300 requests | 1 minute |
| Write Operations | 120 requests | 1 minute |
| SMART Launch | 30 requests | 1 minute |

### Rate Limit Response

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1706537400
Retry-After: 45

{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded. Retry after 45 seconds.",
    "retry_after": 45
  }
}
```

---

## 6. Endpoints

### 6.1 SMART on FHIR Launch

Initialize patient context from EHR via SMART on FHIR protocol.

#### `POST /smart-launch`

**Description:** Exchanges SMART launch parameters for patient context.

**Request:**

```json
{
  "launch_token": "eyJhbGciOiJSUzI1NiIs...",
  "iss": "https://fhir.hospital.org/r4",
  "patient_id": "fhir-patient-12345"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "patient": {
      "id": "uuid",
      "mrn": "MRN-2024-001",
      "first_name": "John",
      "last_name": "Doe",
      "date_of_birth": "1952-03-15",
      "age": 73,
      "gender": "male"
    },
    "vitals": {
      "heart_rate": 88,
      "blood_pressure": { "systolic": 142, "diastolic": 88 },
      "respiratory_rate": 18,
      "temperature": 98.6,
      "oxygen_saturation": 96,
      "recorded_at": "2026-01-29T10:30:00Z"
    },
    "allergies": ["Penicillin", "Sulfa"],
    "medications": ["Lisinopril 10mg", "Metformin 500mg"],
    "medical_history": ["Hypertension", "Type 2 Diabetes"],
    "fhir_context": {
      "patient_resource_id": "fhir-patient-12345",
      "encounter_id": "fhir-encounter-67890"
    }
  }
}
```

**Error Responses:**

| Status | Code | Scenario |
|--------|------|----------|
| 400 | `INVALID_LAUNCH_TOKEN` | Malformed or expired launch token |
| 401 | `FHIR_AUTH_FAILED` | Unable to authenticate with FHIR server |
| 404 | `PATIENT_NOT_FOUND` | Patient ID not found in EHR |
| 503 | `FHIR_UNAVAILABLE` | FHIR server unreachable |

---

### 6.2 AI Triage

Invoke AI models for clinical extraction and ESI draft generation.

#### `POST /ai-triage`

**Description:** Generates AI-drafted ESI score and SBAR summary. Does NOT finalize triage—requires subsequent validation.

**Request:**

```json
{
  "triage_case_id": "550e8400-e29b-41d4-a716-446655440000",
  "patient_context": {
    "demographics": {
      "age": 73,
      "gender": "male"
    },
    "vitals": {
      "heart_rate": 102,
      "blood_pressure": { "systolic": 158, "diastolic": 94 },
      "respiratory_rate": 22,
      "temperature": 98.8,
      "oxygen_saturation": 94,
      "pain_level": 8
    },
    "chief_complaint": "Crushing chest pain radiating to left arm, started 45 minutes ago while at rest. Associated with diaphoresis and shortness of breath.",
    "medical_history": ["Hypertension", "Type 2 Diabetes", "Hyperlipidemia"],
    "medications": ["Lisinopril 10mg", "Metformin 500mg", "Atorvastatin 20mg"],
    "allergies": ["Penicillin"],
    "uploaded_documents": [
      {
        "id": "doc-uuid",
        "type": "lab-report",
        "summary": "Recent lipid panel showing elevated LDL"
      }
    ]
  }
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "triage_case_id": "550e8400-e29b-41d4-a716-446655440000",
    "ai_result": {
      "draft_esi": 2,
      "confidence": 94.2,
      "confidence_level": "high",
      "sbar": {
        "situation": "73-year-old male presenting with acute chest pain radiating to left arm, onset 45 minutes ago at rest, associated with diaphoresis and dyspnea.",
        "background": "History of hypertension, type 2 diabetes, and hyperlipidemia. Current medications include lisinopril, metformin, and atorvastatin. Allergic to penicillin.",
        "assessment": "Vital signs show HR 102 (elevated), BP 158/94 (elevated), RR 22 (elevated), SpO2 94% (mildly depressed), pain 8/10. Presentation concerning for acute coronary syndrome.",
        "recommendation": "Recommend immediate ECG, cardiac biomarkers, aspirin administration per protocol, and cardiology consultation pending physician evaluation."
      },
      "extracted_symptoms": [
        {
          "symptom": "chest pain",
          "onset": "45 minutes ago",
          "quality": "crushing",
          "radiation": "left arm",
          "severity": "8/10",
          "associated_factors": ["diaphoresis", "dyspnea", "rest onset"]
        }
      ],
      "timeline": "Acute onset at rest, no prior similar episodes",
      "comorbidities": ["hypertension", "type 2 diabetes mellitus", "hyperlipidemia"],
      "influencing_factors": [
        {
          "factor": "Chest pain with radiation and diaphoresis",
          "category": "symptom",
          "impact": "increases",
          "weight": 0.35
        },
        {
          "factor": "Age > 65 with cardiac risk factors",
          "category": "history",
          "impact": "increases",
          "weight": 0.25
        },
        {
          "factor": "Tachycardia and hypertension",
          "category": "vital",
          "impact": "increases",
          "weight": 0.20
        },
        {
          "factor": "Hypoxia (SpO2 94%)",
          "category": "vital",
          "impact": "increases",
          "weight": 0.15
        }
      ],
      "vital_flags": [
        { "vital": "heart_rate", "value": "102", "status": "elevated" },
        { "vital": "blood_pressure", "value": "158/94", "status": "elevated" },
        { "vital": "respiratory_rate", "value": "22", "status": "elevated" },
        { "vital": "oxygen_saturation", "value": "94", "status": "depressed" }
      ]
    },
    "inference_metadata": {
      "model_version": "gemini-2.0-flash",
      "classifier_version": "xgboost-v1.2.0",
      "latency_ms": 1847,
      "generated_at": "2026-01-29T10:35:22Z"
    }
  }
}
```

**Error Responses:**

| Status | Code | Scenario |
|--------|------|----------|
| 400 | `MISSING_REQUIRED_FIELD` | Chief complaint or vitals missing |
| 404 | `CASE_NOT_FOUND` | Triage case ID does not exist |
| 409 | `ALREADY_PROCESSED` | AI already generated for this case |
| 503 | `AI_UNAVAILABLE` | Gemini API or classifier unavailable |

**Fallback Response (503 with fallback):**

```json
{
  "success": true,
  "data": {
    "triage_case_id": "550e8400-e29b-41d4-a716-446655440000",
    "ai_available": false,
    "fallback_mode": true,
    "message": "AI services temporarily unavailable. Please perform manual ESI assessment.",
    "manual_triage_required": true
  }
}
```

---

### 6.3 Triage Validation

Submit nurse validation of AI-drafted triage assessment.

#### `POST /validate-triage`

**Description:** Records nurse confirmation or override of AI draft. Triggers routing upon successful validation.

**Request (Confirm AI Draft):**

```json
{
  "triage_case_id": "550e8400-e29b-41d4-a716-446655440000",
  "action": "confirm",
  "validated_esi": 2,
  "notes": "Agree with AI assessment. Patient appears acutely ill."
}
```

**Request (Override AI Draft):**

```json
{
  "triage_case_id": "550e8400-e29b-41d4-a716-446655440000",
  "action": "override",
  "ai_draft_esi": 2,
  "validated_esi": 1,
  "override_rationale": "vital-change",
  "override_notes": "Patient became unresponsive during triage. Initiating code."
}
```

**Override Rationale Values:**

| Value | Description |
|-------|-------------|
| `clinical-judgment` | Clinical judgment based on experience |
| `additional-findings` | Additional findings during assessment |
| `patient-history` | Relevant patient history not captured |
| `vital-change` | Vital signs changed during triage |
| `symptom-evolution` | Symptoms evolved since AI analysis |
| `family-concern` | Family/caregiver concern |
| `other` | Other reason (requires notes) |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "triage_case_id": "550e8400-e29b-41d4-a716-446655440000",
    "validation": {
      "validated_esi": 2,
      "is_override": false,
      "validated_by": {
        "id": "staff-uuid",
        "name": "Sarah Chen, RN"
      },
      "validated_at": "2026-01-29T10:38:15Z"
    },
    "routing": {
      "status": "initiated",
      "route_type": "emergent",
      "assigned_to": {
        "id": "physician-uuid",
        "name": "Dr. James Mitchell",
        "role": "physician",
        "zone": "A"
      },
      "escalation_deadline": "2026-01-29T10:40:15Z",
      "response_target": "< 10 minutes"
    },
    "audit_log_id": "audit-uuid"
  }
}
```

**Error Responses:**

| Status | Code | Scenario |
|--------|------|----------|
| 400 | `INVALID_ESI_LEVEL` | ESI must be 1-5 |
| 400 | `OVERRIDE_REQUIRES_RATIONALE` | Override without rationale |
| 403 | `NOT_AUTHORIZED` | User not authorized to validate |
| 404 | `CASE_NOT_FOUND` | Triage case does not exist |
| 409 | `ALREADY_VALIDATED` | Case already validated |
| 409 | `NOT_AWAITING_VALIDATION` | Case not in awaiting_validation state |

---

### 6.4 Case Acknowledgment

Physician acknowledgment of assigned cases.

#### `POST /acknowledge-case`

**Description:** Records physician acknowledgment of assigned triage case. Stops escalation timer.

**Request:**

```json
{
  "triage_case_id": "550e8400-e29b-41d4-a716-446655440000",
  "assignment_id": "assignment-uuid",
  "initiate_workup": true,
  "workup_orders": ["ECG", "Cardiac enzymes", "Chest X-ray"]
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "triage_case_id": "550e8400-e29b-41d4-a716-446655440000",
    "acknowledgment": {
      "acknowledged_by": {
        "id": "physician-uuid",
        "name": "Dr. James Mitchell",
        "role": "physician"
      },
      "acknowledged_at": "2026-01-29T10:39:45Z",
      "response_time_seconds": 90,
      "within_target": true
    },
    "case_status": "acknowledged",
    "escalation_cancelled": true,
    "workup_initiated": true,
    "audit_log_id": "audit-uuid"
  }
}
```

**Error Responses:**

| Status | Code | Scenario |
|--------|------|----------|
| 403 | `NOT_ASSIGNED` | Case not assigned to this physician |
| 404 | `CASE_NOT_FOUND` | Triage case does not exist |
| 409 | `ALREADY_ACKNOWLEDGED` | Case already acknowledged |
| 409 | `CASE_ESCALATED` | Case has been escalated to another provider |

---

### 6.5 Track Board

Retrieve prioritized patient queue for ESI 3-5 cases.

#### `GET /track-board`

**Description:** Returns prioritized list of validated cases awaiting physician pickup.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `esi_filter` | integer[] | `[3,4,5]` | Filter by ESI levels |
| `status` | string | `validated` | Case status filter |
| `zone` | string | - | Filter by zone assignment |
| `sort_by` | string | `priority` | Sort field: `priority`, `wait_time`, `esi` |
| `sort_order` | string | `asc` | Sort direction: `asc`, `desc` |
| `limit` | integer | 50 | Maximum results |
| `offset` | integer | 0 | Pagination offset |

**Request:**

```http
GET /track-board?esi_filter=3,4&sort_by=wait_time&limit=20
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "cases": [
      {
        "id": "case-uuid-1",
        "patient": {
          "id": "patient-uuid",
          "mrn": "MRN-2024-003",
          "name": "Brown, Michael",
          "age": 45,
          "gender": "male"
        },
        "chief_complaint": "Abdominal pain, nausea, vomiting for 2 days",
        "validated_esi": 3,
        "arrival_time": "2026-01-29T09:45:00Z",
        "wait_time_minutes": 78,
        "target_response": "< 30 minutes",
        "is_overdue": true,
        "status": "validated",
        "zone": "B",
        "sbar_summary": {
          "situation": "45yo male with 2-day history of abdominal pain and vomiting",
          "assessment": "VS stable, moderate distress, focal RLQ tenderness"
        }
      },
      {
        "id": "case-uuid-2",
        "patient": {
          "id": "patient-uuid-2",
          "mrn": "MRN-2024-004",
          "name": "Davis, Emily",
          "age": 28,
          "gender": "female"
        },
        "chief_complaint": "Ankle injury from fall, swelling, unable to bear weight",
        "validated_esi": 4,
        "arrival_time": "2026-01-29T10:15:00Z",
        "wait_time_minutes": 48,
        "target_response": "< 60 minutes",
        "is_overdue": false,
        "status": "validated",
        "zone": "C",
        "sbar_summary": {
          "situation": "28yo female with ankle injury after fall",
          "assessment": "VS normal, isolated ankle swelling, neurovascularly intact"
        }
      }
    ],
    "pagination": {
      "total": 12,
      "limit": 20,
      "offset": 0,
      "has_more": false
    },
    "summary": {
      "esi_3_count": 4,
      "esi_4_count": 5,
      "esi_5_count": 3,
      "overdue_count": 2,
      "average_wait_minutes": 42
    }
  }
}
```

#### `POST /track-board/self-assign`

**Description:** Physician self-assigns a case from the track board.

**Request:**

```json
{
  "triage_case_id": "case-uuid-1"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "assignment": {
      "id": "assignment-uuid",
      "triage_case_id": "case-uuid-1",
      "assigned_to": {
        "id": "physician-uuid",
        "name": "Dr. James Mitchell"
      },
      "assigned_at": "2026-01-29T11:03:22Z"
    },
    "case_status": "assigned"
  }
}
```

---

### 6.6 Escalation Management

Manage and monitor case escalations.

#### `GET /escalations`

**Description:** Retrieve pending and recent escalations (charge nurse and senior physician only).

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | `pending` | Filter: `pending`, `completed`, `all` |
| `esi_level` | integer[] | `[1,2]` | Filter by ESI levels |
| `limit` | integer | 50 | Maximum results |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "escalations": [
      {
        "id": "escalation-uuid",
        "triage_case": {
          "id": "case-uuid",
          "patient_name": "Johnson, Sarah",
          "validated_esi": 2,
          "chief_complaint": "Difficulty breathing, wheezing"
        },
        "current_level": 2,
        "escalation_path": [
          {
            "level": 1,
            "role": "physician",
            "staff": { "id": "uuid", "name": "Dr. Smith" },
            "assigned_at": "2026-01-29T10:30:00Z",
            "deadline": "2026-01-29T10:32:00Z",
            "result": "timeout"
          },
          {
            "level": 2,
            "role": "senior_physician",
            "staff": { "id": "uuid", "name": "Dr. Williams" },
            "assigned_at": "2026-01-29T10:32:00Z",
            "deadline": "2026-01-29T10:34:00Z",
            "result": "pending"
          }
        ],
        "time_since_validation_seconds": 240,
        "status": "pending"
      }
    ],
    "summary": {
      "pending_count": 1,
      "resolved_last_hour": 5,
      "average_resolution_seconds": 95
    }
  }
}
```

#### `POST /escalations/manual`

**Description:** Manually escalate a case to a specific provider.

**Request:**

```json
{
  "triage_case_id": "case-uuid",
  "escalate_to": {
    "staff_id": "staff-uuid",
    "role": "senior_physician"
  },
  "reason": "manual",
  "notes": "Dr. Smith unavailable - in procedure"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "escalation_id": "new-escalation-uuid",
    "previous_assignment_cancelled": true,
    "new_assignment": {
      "staff": { "id": "staff-uuid", "name": "Dr. Williams" },
      "assigned_at": "2026-01-29T10:35:00Z",
      "deadline": "2026-01-29T10:37:00Z"
    }
  }
}
```

---

### 6.7 Audit Logs

Query immutable audit trail (charge nurse only).

#### `GET /audit-logs`

**Description:** Retrieve audit log entries with filtering.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `entity_type` | string | Filter by entity: `triage_case`, `escalation`, `staff` |
| `entity_id` | uuid | Filter by specific entity ID |
| `event_type` | string | Filter: `validation`, `override`, `escalation`, `acknowledgment` |
| `actor_id` | uuid | Filter by staff member |
| `start_date` | ISO8601 | Start of date range |
| `end_date` | ISO8601 | End of date range |
| `limit` | integer | Maximum results (default: 100) |
| `offset` | integer | Pagination offset |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "audit-uuid",
        "event_type": "override",
        "entity_type": "triage_case",
        "entity_id": "case-uuid",
        "actor": {
          "id": "staff-uuid",
          "name": "Sarah Chen, RN",
          "role": "nurse"
        },
        "changes": {
          "field": "validated_esi",
          "previous_value": null,
          "new_value": 1,
          "ai_draft_value": 2
        },
        "metadata": {
          "override_rationale": "vital-change",
          "override_notes": "Patient became unresponsive"
        },
        "timestamp": "2026-01-29T10:38:15Z",
        "session_id": "session-uuid"
      }
    ],
    "pagination": {
      "total": 1847,
      "limit": 100,
      "offset": 0,
      "has_more": true
    }
  }
}
```

#### `GET /audit-logs/export`

**Description:** Export audit logs for compliance reporting.

**Query Parameters:**

Same as `GET /audit-logs` plus:

| Parameter | Type | Description |
|-----------|------|-------------|
| `format` | string | Export format: `json`, `csv` |

**Response:** File download with appropriate Content-Type.

---

### 6.8 Staff Management

Manage clinical staff availability and assignments.

#### `GET /staff`

**Description:** List clinical staff with availability status.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `role` | string | Filter by role |
| `zone` | string | Filter by zone |
| `available` | boolean | Filter by availability |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "staff": [
      {
        "id": "staff-uuid",
        "name": "Dr. James Mitchell",
        "role": "physician",
        "zone": "A",
        "is_available": true,
        "current_cases": 3,
        "last_assignment": "2026-01-29T10:30:00Z"
      }
    ]
  }
}
```

#### `PATCH /staff/:id/availability`

**Description:** Update staff availability status.

**Request:**

```json
{
  "is_available": false,
  "reason": "In procedure",
  "estimated_return": "2026-01-29T11:30:00Z"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "staff_id": "staff-uuid",
    "is_available": false,
    "updated_at": "2026-01-29T10:45:00Z"
  }
}
```

---

## 7. WebSocket Events

Real-time updates via Supabase Realtime subscriptions.

### Channel: `triage-updates`

**Subscription:**

```typescript
const channel = supabase
  .channel('triage-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'triage_cases'
  }, (payload) => {
    console.log('Triage update:', payload);
  })
  .subscribe();
```

### Event Types

#### `case_created`

```json
{
  "type": "case_created",
  "payload": {
    "case_id": "uuid",
    "patient_name": "Doe, John",
    "status": "pending"
  }
}
```

#### `ai_complete`

```json
{
  "type": "ai_complete",
  "payload": {
    "case_id": "uuid",
    "draft_esi": 2,
    "confidence": 94.2,
    "status": "awaiting_validation"
  }
}
```

#### `case_validated`

```json
{
  "type": "case_validated",
  "payload": {
    "case_id": "uuid",
    "validated_esi": 2,
    "is_override": false,
    "validated_by": "Sarah Chen, RN"
  }
}
```

#### `case_assigned`

```json
{
  "type": "case_assigned",
  "payload": {
    "case_id": "uuid",
    "assigned_to": "Dr. Mitchell",
    "esi_level": 2,
    "escalation_deadline": "2026-01-29T10:40:00Z"
  }
}
```

#### `escalation_triggered`

```json
{
  "type": "escalation_triggered",
  "payload": {
    "case_id": "uuid",
    "escalation_level": 2,
    "escalated_to": "Dr. Williams",
    "reason": "timeout"
  }
}
```

### Channel: `alerts`

High-priority notifications for ESI 1-2 cases.

```typescript
const alertChannel = supabase
  .channel('alerts')
  .on('broadcast', { event: 'critical_case' }, (payload) => {
    showCriticalAlert(payload);
  })
  .subscribe();
```

#### `critical_case`

```json
{
  "type": "critical_case",
  "priority": "high",
  "payload": {
    "case_id": "uuid",
    "patient_name": "Johnson, Sarah",
    "esi_level": 1,
    "chief_complaint": "Cardiac arrest",
    "action_required": "immediate",
    "assigned_to": "Code Team"
  }
}
```

---

## 8. Webhooks

External integrations for EHR and notification systems.

### Webhook Payload Format

```json
{
  "webhook_id": "uuid",
  "event_type": "case.acknowledged",
  "timestamp": "2026-01-29T10:40:00Z",
  "data": {
    "case_id": "uuid",
    "esi_level": 2,
    "patient_mrn": "MRN-2024-001"
  },
  "signature": "sha256=abc123..."
}
```

### Webhook Events

| Event | Description |
|-------|-------------|
| `case.created` | New triage case created |
| `case.validated` | Nurse validation completed |
| `case.assigned` | Case assigned to provider |
| `case.acknowledged` | Provider acknowledged case |
| `case.escalated` | Case escalated due to timeout |
| `case.completed` | Case treatment initiated |

### Signature Verification

```typescript
import { createHmac } from 'crypto';

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return `sha256=${expected}` === signature;
}
```

### Webhook Configuration

Webhooks are configured via environment variables or admin API:

```json
{
  "endpoint_url": "https://ehr.hospital.org/webhooks/triage",
  "events": ["case.validated", "case.acknowledged"],
  "secret": "whsec_...",
  "active": true
}
```

---

## Appendix A: Data Types

### ESILevel

```typescript
type ESILevel = 1 | 2 | 3 | 4 | 5;

const ESI_DESCRIPTIONS: Record<ESILevel, string> = {
  1: "Resuscitation - Immediate life-saving intervention",
  2: "Emergent - High risk, confused, severe distress",
  3: "Urgent - Multiple resources needed",
  4: "Less Urgent - Single resource needed",
  5: "Non-Urgent - No resources needed"
};
```

### PatientStatus

```typescript
type PatientStatus = 
  | 'waiting'
  | 'in-triage'
  | 'pending-validation'
  | 'validated'
  | 'assigned'
  | 'acknowledged'
  | 'in-treatment'
  | 'discharged';
```

### VitalSigns

```typescript
interface VitalSigns {
  heart_rate: number;           // bpm
  blood_pressure: {
    systolic: number;           // mmHg
    diastolic: number;          // mmHg
  };
  respiratory_rate: number;     // breaths/min
  temperature: number;          // °F
  oxygen_saturation: number;    // %
  pain_level: number;           // 0-10
  recorded_at: string;          // ISO8601
}
```

### SBARSummary

```typescript
interface SBARSummary {
  situation: string;      // 1-2 sentences
  background: string;     // Relevant history
  assessment: string;     // Current findings
  recommendation: string; // Next steps
}
```

---

## Appendix B: Response Time Targets

| ESI Level | Description | Target Response |
|-----------|-------------|-----------------|
| 1 | Resuscitation | Immediate |
| 2 | Emergent | < 10 minutes |
| 3 | Urgent | < 30 minutes |
| 4 | Less Urgent | < 60 minutes |
| 5 | Non-Urgent | < 120 minutes |

---

*Document Version: 1.0 | Last Updated: January 29, 2026*
