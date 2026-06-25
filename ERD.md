# ENTITY RELATIONSHIP DIAGRAM
## Rwanda NBSAP Monitoring Dashboard

---

## 1. Complete Entity Relationship Diagram

```mermaid
erDiagram
    auth_users {
        UUID id PK
        TEXT email
        TEXT encrypted_password
        JSONB raw_user_meta_data
        TIMESTAMPTZ created_at
    }

    profiles {
        UUID id PK "FK → auth.users"
        TEXT email
        TEXT full_name
        user_role role
        TEXT organization
        TEXT department
        TEXT phone
        BOOLEAN is_active
        TIMESTAMPTZ suspended_at
        UUID suspended_by
        TEXT suspension_reason
        TIMESTAMPTZ suspension_end_date
        TIMESTAMPTZ last_login
        TEXT avatar_initials "GENERATED"
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    provinces {
        SERIAL id PK
        TEXT name
        TIMESTAMPTZ created_at
    }

    districts {
        SERIAL id PK
        TEXT name
        INTEGER province_id FK
        district_status status
        INTEGER compliance
        INTEGER forest_cover
        NUMERIC latitude
        NUMERIC longitude
        NUMERIC elevation
        NUMERIC wetland_area
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    nbsap_targets {
        INTEGER id PK
        gbf_goal goal
        TEXT title
        TEXT description
        TEXT baseline
        JSONB timeline_milestones
        INTEGER progress
        TIMESTAMPTZ last_auto_update
        INTEGER auto_update_count
        TEXT[] responsible_stakeholders
        TEXT headline_indicator
        TEXT[] component_indicators
        TEXT[] complementary_indicators
        TEXT[] strategic_actions
        JSONB goal_color
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    indicators {
        SERIAL id PK
        TEXT name
        TEXT definition
        indicator_tier tier
        INTEGER nbsap_target_id FK
        TEXT target_2030
        TEXT baseline
        TEXT midterm
        TEXT final_target
        TEXT current_value
        INTEGER progress
        indicator_status status
        TEXT km_gbf
        TEXT periodicity
        TEXT data_source
        TEXT[] responsible
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    toolkit_reports {
        UUID id PK
        report_type tool_id
        TEXT tool_name
        UUID submitted_by FK
        submission_status status
        UUID reviewed_by FK
        TIMESTAMPTZ reviewed_at
        TEXT review_note
        TEXT period
        JSONB form_data
        JSONB attachments
        TEXT district
        TEXT institution
        INTEGER nbsap_target_id FK
        TIMESTAMPTZ submitted_at
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    report_attachments {
        UUID id PK
        UUID report_id FK
        TEXT file_name
        TEXT file_ext
        BIGINT file_size
        TEXT storage_path
        UUID uploaded_by FK
        TIMESTAMPTZ created_at
    }

    risks {
        TEXT id PK
        TEXT description
        TEXT category
        TEXT likelihood
        TEXT impact
        risk_level level
        TEXT mitigation
        TEXT owner
        BOOLEAN is_live
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    compliance_records {
        UUID id PK
        TEXT title
        TEXT description
        TEXT severity
        TEXT district
        TIMESTAMPTZ flagged_at
        TIMESTAMPTZ resolved_at
        UUID resolved_by FK
        BOOLEAN is_resolved
        TIMESTAMPTZ created_at
    }

    notifications {
        UUID id PK
        UUID user_id FK
        TEXT title
        TEXT message
        TEXT type
        BOOLEAN is_read
        TEXT action_tab
        TEXT action_label
        TIMESTAMPTZ created_at
    }

    notification_preferences {
        UUID user_id PK "FK → profiles"
        TEXT email
        TEXT phone
        BOOLEAN sub_overdue
        BOOLEAN sub_compliance
        INTEGER compliance_threshold
        BOOLEAN sub_deadlines
        INTEGER deadline_days
        BOOLEAN sub_pending
        BOOLEAN sub_finance
        BOOLEAN sub_risk
        INTEGER[] watchlist_indicators
        TIMESTAMPTZ updated_at
    }

    audit_log {
        UUID id PK
        UUID user_id FK
        TEXT action_type
        TEXT action
        TEXT detail
        TEXT role
        TEXT ip_address
        TIMESTAMPTZ created_at
    }

    user_settings {
        UUID user_id PK "FK → profiles"
        BOOLEAN show_live_stats
        BOOLEAN animate_bars
        BOOLEAN compact_sidebar
        BOOLEAN auto_refresh
        BOOLEAN show_baseline
        BOOLEAN require_verification
        BOOLEAN species_fuzzing
        BOOLEAN mask_species_names
        BOOLEAN restrict_raw_export
        BOOLEAN log_exports
        TEXT language
        TIMESTAMPTZ updated_at
    }

    role_change_requests {
        UUID id PK
        UUID user_id FK
        TEXT from_role
        TEXT to_role
        TEXT justification
        request_status status
        UUID reviewed_by FK
        TIMESTAMPTZ reviewed_at
        TEXT review_note
        TEXT rejection_reason
        BOOLEAN is_notified
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    system_metrics {
        SERIAL id PK
        TEXT metric_type
        NUMERIC metric_value
        TEXT source_tool
        TEXT source_field
        TEXT aggregation_type
        TIMESTAMPTZ updated_at
        TIMESTAMPTZ created_at
    }

    tool_weights {
        TEXT tool_id PK
        DECIMAL weight
        TEXT description
        BOOLEAN active
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    ai_extractions {
        UUID id PK
        UUID report_id FK
        TEXT status
        TEXT raw_text_analyzed
        TEXT document_text
        JSONB extraction_result
        TEXT error_message
        INTEGER processing_time_ms
        TEXT model_used
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    ai_extraction_proposals {
        UUID id PK
        UUID extraction_id FK
        UUID report_id FK
        TEXT proposal_type
        INTEGER target_id FK
        INTEGER indicator_id FK
        TEXT proposed_value
        TEXT current_value
        DECIMAL confidence_score
        TEXT reasoning
        TEXT source_field
        TEXT status
        UUID reviewer_id FK
        TIMESTAMPTZ reviewed_at
        TEXT reviewer_note
        TEXT modified_value
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    lakes {
        SERIAL id PK
        TEXT name
        NUMERIC area_km2
        NUMERIC latitude
        NUMERIC longitude
        TEXT province
        TIMESTAMPTZ created_at
    }

    %% Relationships
    auth_users ||--|| profiles : "extends (ON DELETE CASCADE)"
    profiles ||--o{ toolkit_reports : "submitted_by"
    profiles ||--o{ toolkit_reports : "reviewed_by"
    profiles ||--|| user_settings : "1:1 (ON DELETE CASCADE)"
    profiles ||--|| notification_preferences : "1:1 (ON DELETE CASCADE)"
    profiles ||--o{ notifications : "receives"
    profiles ||--o{ audit_log : "actor"
    profiles ||--o{ role_change_requests : "requests (user_id)"
    profiles ||--o{ role_change_requests : "reviews (reviewed_by)"
    profiles ||--o{ compliance_records : "resolves"
    profiles ||--o{ report_attachments : "uploaded_by"
    profiles ||--o{ ai_extraction_proposals : "reviews"

    provinces ||--o{ districts : "contains"
    
    nbsap_targets ||--o{ indicators : "has indicators"
    nbsap_targets ||--o{ toolkit_reports : "linked reports"
    nbsap_targets ||--o{ ai_extraction_proposals : "target_id"

    indicators ||--o{ ai_extraction_proposals : "indicator_id"

    toolkit_reports ||--o{ report_attachments : "has attachments"
    toolkit_reports ||--o{ ai_extractions : "has extraction"

    ai_extractions ||--o{ ai_extraction_proposals : "generates proposals"
```

---

## 2. Core Domain Relationships

```mermaid
erDiagram
    NBSAP_TARGETS {
        INTEGER id PK
        gbf_goal goal
        TEXT title
        INTEGER progress
    }

    INDICATORS {
        SERIAL id PK
        TEXT name
        indicator_tier tier
        INTEGER nbsap_target_id FK
        INTEGER progress
        indicator_status status
    }

    TOOLKIT_REPORTS {
        UUID id PK
        report_type tool_id
        UUID submitted_by FK
        submission_status status
        INTEGER nbsap_target_id FK
        JSONB form_data
    }

    SYSTEM_METRICS {
        SERIAL id PK
        TEXT metric_type
        NUMERIC metric_value
        TEXT source_tool
    }

    PROFILES {
        UUID id PK
        user_role role
        TEXT organization
    }

    NBSAP_TARGETS ||--o{ INDICATORS : "measured by (1 target → 2-4 indicators)"
    NBSAP_TARGETS ||--o{ TOOLKIT_REPORTS : "evidenced by (reports link to targets)"
    TOOLKIT_REPORTS ||--o{ SYSTEM_METRICS : "feeds (DB trigger on approval)"
    TOOLKIT_REPORTS }o--|| PROFILES : "submitted by"
    INDICATORS }o--|| NBSAP_TARGETS : "belongs to"
```

---

## 3. User & Access Control Relationships

```mermaid
erDiagram
    PROFILES {
        UUID id PK
        user_role role
        BOOLEAN is_active
        TIMESTAMPTZ suspended_at
    }

    USER_SETTINGS {
        UUID user_id PK
        BOOLEAN require_verification
        BOOLEAN restrict_raw_export
        TEXT language
    }

    NOTIFICATION_PREFERENCES {
        UUID user_id PK
        BOOLEAN sub_overdue
        BOOLEAN sub_compliance
        INTEGER[] watchlist_indicators
    }

    NOTIFICATIONS {
        UUID id PK
        UUID user_id FK
        TEXT type
        BOOLEAN is_read
    }

    ROLE_CHANGE_REQUESTS {
        UUID id PK
        UUID user_id FK
        TEXT from_role
        TEXT to_role
        request_status status
        UUID reviewed_by FK
    }

    AUDIT_LOG {
        UUID id PK
        UUID user_id FK
        TEXT action_type
        TEXT action
    }

    PROFILES ||--|| USER_SETTINGS : "1:1"
    PROFILES ||--|| NOTIFICATION_PREFERENCES : "1:1"
    PROFILES ||--o{ NOTIFICATIONS : "receives"
    PROFILES ||--o{ ROLE_CHANGE_REQUESTS : "submits"
    PROFILES ||--o{ ROLE_CHANGE_REQUESTS : "approves/rejects"
    PROFILES ||--o{ AUDIT_LOG : "all actions logged"
```

---

## 4. AI Layer Relationships

```mermaid
erDiagram
    TOOLKIT_REPORTS {
        UUID id PK
        report_type tool_id
        JSONB form_data
        JSONB attachments
    }

    AI_EXTRACTIONS {
        UUID id PK
        UUID report_id FK
        TEXT status
        JSONB extraction_result
        TEXT model_used
    }

    AI_EXTRACTION_PROPOSALS {
        UUID id PK
        UUID extraction_id FK
        UUID report_id FK
        TEXT proposal_type
        INTEGER target_id FK
        INTEGER indicator_id FK
        DECIMAL confidence_score
        TEXT status
        UUID reviewer_id FK
    }

    NBSAP_TARGETS {
        INTEGER id PK
        TEXT title
        INTEGER progress
    }

    INDICATORS {
        SERIAL id PK
        TEXT name
        INTEGER progress
    }

    PROFILES {
        UUID id PK
        user_role role
    }

    TOOLKIT_REPORTS ||--o{ AI_EXTRACTIONS : "1 report → 1 extraction"
    AI_EXTRACTIONS ||--o{ AI_EXTRACTION_PROPOSALS : "1 extraction → N proposals"
    AI_EXTRACTION_PROPOSALS }o--|| TOOLKIT_REPORTS : "references source report"
    AI_EXTRACTION_PROPOSALS }o--o| NBSAP_TARGETS : "proposes update to target"
    AI_EXTRACTION_PROPOSALS }o--o| INDICATORS : "proposes update to indicator"
    AI_EXTRACTION_PROPOSALS }o--o| PROFILES : "reviewed by admin"
```

---

## 5. Geography Relationships

```mermaid
erDiagram
    PROVINCES {
        SERIAL id PK
        TEXT name
    }

    DISTRICTS {
        SERIAL id PK
        TEXT name
        INTEGER province_id FK
        district_status status
        INTEGER compliance
        INTEGER forest_cover
        NUMERIC latitude
        NUMERIC longitude
    }

    LAKES {
        SERIAL id PK
        TEXT name
        TEXT province
        NUMERIC area_km2
        NUMERIC latitude
        NUMERIC longitude
    }

    TOOLKIT_REPORTS {
        UUID id PK
        TEXT district
        TEXT institution
    }

    COMPLIANCE_RECORDS {
        UUID id PK
        TEXT district
        TEXT severity
    }

    PROVINCES ||--o{ DISTRICTS : "5 provinces → 30 districts"
    PROVINCES ||--o{ LAKES : "province label"
    DISTRICTS ||--o{ TOOLKIT_REPORTS : "district (denormalized TEXT)"
    DISTRICTS ||--o{ COMPLIANCE_RECORDS : "district (denormalized TEXT)"
```

---

## 6. Key Cardinalities Summary

| Relationship | Cardinality | Notes |
|---|---|---|
| auth.users → profiles | 1:1 | Auto-created on signup via trigger |
| profiles → user_settings | 1:1 | Auto-created on signup |
| profiles → notification_preferences | 1:1 | Auto-created on signup |
| provinces → districts | 1:N | 5 provinces, 30 districts |
| nbsap_targets → indicators | 1:N | 1 target → 2–4 component indicators + 1 headline |
| nbsap_targets → toolkit_reports | 1:N | Each report optionally links to 1 target |
| toolkit_reports → report_attachments | 1:N | Attachment metadata also stored in JSONB |
| toolkit_reports → ai_extractions | 1:1 | One AI extraction per report |
| ai_extractions → ai_extraction_proposals | 1:N | Multiple proposals per extraction |
| profiles → toolkit_reports (submitted) | 1:N | User can submit many reports |
| profiles → toolkit_reports (reviewed) | 1:N | Admin can review many reports |
| profiles → role_change_requests | 1:N | User can have multiple role requests (over time) |
| profiles → audit_log | 1:N | Every user action is logged |
| profiles → notifications | 1:N | Each user can have many notifications |

---

## 7. Enum Reference

```mermaid
graph LR
    subgraph Enums["PostgreSQL Enum Types"]
        UR["user_role<br/>policy_monitoring<br/>lead_government_ministry_reporting<br/>local_reporting<br/>dashboard_management<br/>programme_alignment<br/>public_viewer"]

        IS["indicator_status<br/>on-track<br/>at-risk<br/>behind"]

        IT["indicator_tier<br/>headline<br/>component<br/>complementary<br/>binary"]

        SS["submission_status<br/>pending<br/>approved<br/>rejected"]

        DS["district_status<br/>submitted<br/>pending<br/>missing"]

        RT["report_type<br/>T01 · T02 · T03<br/>T04 · T05 · T06 · T07"]

        RL["risk_level<br/>High · Medium · Low"]

        GG["gbf_goal<br/>A · B · C · D"]

        RS["request_status<br/>pending · approved<br/>rejected · cancelled · stale"]
    end
```

---

*Document version: 2026-06-17 | Rwanda NBSAP Monitoring Dashboard v1.0.0*
