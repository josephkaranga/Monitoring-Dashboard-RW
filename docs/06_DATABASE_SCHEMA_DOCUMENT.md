# Database Schema Document
# Rwanda NBSAP Monitoring Dashboard 2025–2030

**Prepared for:** Rwanda Environment Management Authority (REMA)
**Document Reference:** NBSAP-DSD-2026-006
**Version:** 1.0
**Date:** June 2026
**Classification:** Official — Government Use

---

## Document Control

| Field | Value |
|---|---|
| **Document Title** | Database Schema Document |
| **Project** | Rwanda NBSAP Monitoring Dashboard |
| **Database Engine** | PostgreSQL 15 (Supabase-managed) |
| **Prepared by** | NBSAP Dashboard Development Team |
| **Approved by** | REMA — Department of Biodiversity & Landscape Management |
| **Status** | Final |

---

## 1. Overview

### 1.1 Database Summary

| Attribute | Value |
|---|---|
| **Engine** | PostgreSQL 15 |
| **Hosting** | Supabase Cloud (managed) |
| **Total Tables** | 18 |
| **Total Indexes** | 20+ |
| **RLS Policies** | 25+ |
| **Triggers** | 7 |
| **Functions** | 10+ |
| **Migrations** | 22 (numbered 001–022) |

### 1.2 Schema Categories

| Category | Tables | Purpose |
|---|---|---|
| **User Management** | 4 | User accounts, settings, notification preferences, role change requests |
| **Core Biodiversity Data** | 3 | NBSAP targets, indicators, milestones |
| **Reporting** | 2 | Toolkit report submissions, file attachments |
| **Metrics & Weights** | 2 | Automated system metrics, tool weight configuration |
| **Governance** | 4 | Compliance records, risk register, audit log, notifications |
| **Geography** | 3 | Provinces, districts, lakes |
| **RBIS Integration** | 3 | RBIS linkages, data streams, connection log |

---

## 2. Entity-Relationship Diagram

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│  auth.users  │       │    profiles       │       │ user_settings│
│  (Supabase)  │◄──────│  id (PK, FK)     │──────▶│ user_id (FK) │
│              │  1:1   │  email           │  1:1   │ show_live... │
│              │       │  full_name       │       │ animate_bars │
│              │       │  role            │       │ language     │
│              │       │  organization    │       └──────────────┘
│              │       │  is_active       │
│              │       │  suspended_at    │       ┌──────────────────────┐
│              │       │  avatar_initials │       │notification_prefs    │
│              │       └────────┬─────────┘       │ user_id (FK)         │
│              │                │                  │ sub_overdue          │
│              │                │                  │ watchlist_indicators │
│              │                │                  └──────────────────────┘
│              │                │
│              │                │ submitted_by / reviewed_by
│              │                ▼
│              │       ┌──────────────────┐       ┌──────────────────┐
│              │       │ toolkit_reports  │       │report_attachments│
│              │       │  id (PK)        │──────▶│ report_id (FK)   │
│              │       │  tool_id (T01-7)│  1:N   │ file_name        │
│              │       │  status         │       │ storage_path     │
│              │       │  form_data (JSON)│       └──────────────────┘
│              │       │  district       │
│              │       │  nbsap_target_id│──┐
│              │       └─────────────────┘  │
│              │                            │
│              │                            │    ┌──────────────┐
│              │               ┌────────────┘    │system_metrics│
│              │               │                  │ metric_type  │
│              │               ▼                  │ metric_value │
│              │       ┌──────────────────┐      │ last_updated │
│              │       │  nbsap_targets   │      └──────────────┘
│              │       │  id (PK, 1-22)  │
│              │       │  goal (A-D)     │      ┌──────────────┐
│              │       │  title          │      │ tool_weights  │
│              │       │  baseline       │      │ tool_id       │
│              │       │  progress       │      │ weight        │
│              │       └────────┬────────┘      └──────────────┘
│              │                │
│              │                │ 1:N
│              │                ▼
│              │       ┌──────────────────┐      ┌──────────────────┐
│              │       │   indicators     │      │  rbis_linkages   │
│              │       │  id (PK)        │──────▶│ indicator_id (FK)│
│              │       │  nbsap_target_id│  1:N   │ data_stream_id   │
│              │       │  name           │       │ linkage_status   │
│              │       │  tier           │       └──────────────────┘
│              │       │  progress       │
│              │       │  status         │
│              │       └────────────────┘
└──────────────┘

┌──────────────┐  1:N  ┌──────────────┐
│  provinces    │──────▶│  districts    │
│  id (PK)     │       │  id (PK)     │
│  name        │       │  province_id │
│  (5 rows)    │       │  compliance  │
└──────────────┘       │  forest_cover│
                       │  (30 rows)   │
                       └──────────────┘

┌──────────────────┐   ┌──────────────────┐   ┌────────────────────┐
│    audit_log     │   │  notifications   │   │    risks           │
│  user_id (FK)    │   │  user_id (FK)    │   │  level (H/M/L)     │
│  action_type     │   │  title           │   │  description       │
│  action          │   │  is_read         │   │  mitigation        │
│  created_at      │   │  created_at      │   │  is_live           │
└──────────────────┘   └──────────────────┘   └────────────────────┘

┌──────────────────────┐
│  compliance_records  │
│  title               │
│  severity (H/M/L)    │
│  district            │
│  is_resolved         │
└──────────────────────┘

┌──────────────────────┐   ┌──────────────────────┐
│  rbis_data_streams   │   │  rbis_connection_log  │
│  id (PK)             │   │  status               │
│  name                │   │  server_url           │
│  target_numbers[]    │   │  user_id (FK)         │
│  occurrence_count    │   │  created_at           │
│  status              │   └──────────────────────┘
└──────────────────────┘
```

---

## 3. Table Specifications

### 3.1 User Management Tables

#### 3.1.1 `profiles`

Extends Supabase `auth.users` with application-specific fields.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, FK → auth.users | User unique identifier |
| `email` | TEXT | NOT NULL | User email address |
| `full_name` | TEXT | | User full name |
| `role` | user_role (ENUM) | NOT NULL, DEFAULT 'policy_monitoring' | One of 6 system roles |
| `organization` | TEXT | | User's organisation |
| `department` | TEXT | | User's department |
| `phone` | TEXT | | Contact phone number |
| `is_active` | BOOLEAN | DEFAULT TRUE | Account active status |
| `suspended_at` | TIMESTAMPTZ | | When account was suspended |
| `suspended_by` | UUID | FK → profiles | Admin who suspended |
| `suspension_reason` | TEXT | | Reason for suspension |
| `suspension_end_date` | TIMESTAMPTZ | | Auto-reactivation date |
| `last_login` | TIMESTAMPTZ | | Last login timestamp |
| `avatar_initials` | TEXT | GENERATED (first 2 chars of name) | UI display initials |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Account creation time |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last profile update |

#### 3.1.2 `user_settings`

Per-user dashboard preferences.

| Column | Type | Default | Description |
|---|---|---|---|
| `user_id` | UUID | PK, FK → profiles | User reference |
| `show_live_stats` | BOOLEAN | TRUE | Display live statistics |
| `animate_bars` | BOOLEAN | TRUE | Animate progress bars |
| `compact_sidebar` | BOOLEAN | FALSE | Compact sidebar layout |
| `auto_refresh` | BOOLEAN | TRUE | Auto-refresh dashboard data |
| `show_baseline` | BOOLEAN | TRUE | Show baseline values |
| `require_verification` | BOOLEAN | TRUE | Require data verification |
| `language` | TEXT | 'en' | Interface language |
| `updated_at` | TIMESTAMPTZ | NOW() | Last settings update |

#### 3.1.3 `notification_preferences`

Per-user notification subscription settings.

| Column | Type | Default | Description |
|---|---|---|---|
| `user_id` | UUID | PK, FK → profiles | User reference |
| `email` | TEXT | | Email for notifications |
| `phone` | TEXT | | Phone for notifications |
| `sub_overdue` | BOOLEAN | TRUE | Subscribe to overdue alerts |
| `sub_compliance` | BOOLEAN | TRUE | Subscribe to compliance alerts |
| `compliance_threshold` | INTEGER | 60 | Compliance alert threshold (%) |
| `sub_deadlines` | BOOLEAN | TRUE | Subscribe to deadline reminders |
| `deadline_days` | INTEGER | 14 | Days before deadline to alert |
| `sub_pending` | BOOLEAN | TRUE | Subscribe to pending report alerts |
| `sub_finance` | BOOLEAN | TRUE | Subscribe to finance alerts |
| `sub_risk` | BOOLEAN | TRUE | Subscribe to risk alerts |
| `watchlist_indicators` | INTEGER[] | | Array of indicator IDs to watch |

#### 3.1.4 `role_change_requests`

Formal workflow for user role change requests.

| Column | Type | Description |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → profiles (requester) |
| `current_role` | user_role | Role at time of request |
| `requested_role` | user_role | Desired new role |
| `justification` | TEXT | Reason for request |
| `status` | TEXT | 'pending' / 'approved' / 'rejected' |
| `reviewed_by` | UUID | FK → profiles (approver/rejecter) |
| `review_note` | TEXT | Reviewer's comment |
| `created_at` | TIMESTAMPTZ | Request timestamp |
| `reviewed_at` | TIMESTAMPTZ | Review timestamp |

---

### 3.2 Core Biodiversity Data Tables

#### 3.2.1 `nbsap_targets`

Rwanda's 22 NBSAP 2025–2030 targets.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PK (1–22) | Target number |
| `goal` | gbf_goal (ENUM) | NOT NULL | KM-GBF Goal: A, B, C, or D |
| `title` | TEXT | NOT NULL | Official target title |
| `description` | TEXT | | Full target statement |
| `baseline` | TEXT | | Baseline data description |
| `timeline_milestones` | TEXT | | Phase-by-phase milestones |
| `progress` | INTEGER | CHECK 0–100, DEFAULT 0 | Auto-calculated progress (%) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update |

**Seed Data:** 22 targets across 4 goals (Goal A: 1–4, Goal B: 5–8, Goal C: 9–12, Goal D: 13–22)

#### 3.2.2 `indicators`

~80 biodiversity indicators mapped to NBSAP targets.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | SERIAL | PK | Auto-incrementing ID |
| `name` | TEXT | NOT NULL | Indicator name |
| `definition` | TEXT | | Detailed definition |
| `tier` | indicator_tier (ENUM) | NOT NULL | headline / component / complementary / binary |
| `nbsap_target_id` | INTEGER | FK → nbsap_targets | Parent target |
| `target_2030` | TEXT | | 2030 target value |
| `baseline` | TEXT | | Baseline value |
| `midterm` | TEXT | | Midterm target value |
| `final_target` | TEXT | | Final target value |
| `current_value` | TEXT | | Current measured value |
| `progress` | INTEGER | CHECK 0–100, DEFAULT 0 | Progress percentage |
| `status` | indicator_status (ENUM) | DEFAULT 'behind' | on-track / at-risk / behind |
| `km_gbf` | TEXT | | KM-GBF indicator reference |
| `periodicity` | TEXT | | Measurement frequency |
| `data_source` | TEXT | | Data source description |
| `responsible` | TEXT[] | | Array of responsible institutions |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update |

**Seed Data:** ~79 indicators distributed across 22 targets in 4 tiers

#### 3.2.3 `nbsap_milestones`

Implementation milestones for each target, 2025–2030.

| Column | Type | Description |
|---|---|---|
| `id` | SERIAL | PK |
| `target_id` | INTEGER | FK → nbsap_targets |
| `phase` | TEXT | Implementation phase (e.g., "2025-2026") |
| `milestone` | TEXT | Milestone description |
| `status` | TEXT | Current status |

---

### 3.3 Reporting Tables

#### 3.3.1 `toolkit_reports`

All T01–T07 report submissions.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK (auto-generated) | Report unique identifier |
| `tool_id` | report_type (ENUM) | NOT NULL | T01–T07 |
| `tool_name` | TEXT | NOT NULL | Human-readable tool name |
| `submitted_by` | UUID | FK → profiles | Reporter |
| `status` | submission_status (ENUM) | DEFAULT 'pending' | pending / approved / rejected |
| `reviewed_by` | UUID | FK → profiles | Reviewer (null until reviewed) |
| `reviewed_at` | TIMESTAMPTZ | | Review timestamp |
| `review_note` | TEXT | | Reviewer's note |
| `period` | TEXT | | Reporting period |
| `form_data` | JSONB | NOT NULL, DEFAULT '{}' | Dynamic form fields |
| `attachments` | JSONB | DEFAULT '[]' | Attachment metadata |
| `district` | TEXT | | District (denormalised) |
| `institution` | TEXT | | Institution (denormalised) |
| `nbsap_target_id` | INTEGER | FK → nbsap_targets | Linked target |
| `submitted_at` | TIMESTAMPTZ | DEFAULT NOW() | Submission time |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update |

**JSONB `form_data` Examples by Tool:**

| Tool | Key Fields in form_data |
|---|---|
| **T01** | `institution`, `budget_utilised`, `compliance_score`, `policy_progress` |
| **T02** | `district`, `forest_hectares`, `wetland_hectares`, `land_cover_change` |
| **T03** | `area_name`, `coverage_km2`, `management_effectiveness`, `illegal_cases`, `restoration_ha` |
| **T04** | `incident_type`, `district`, `species`, `hwc_case_count`, `mitigation_measures` |
| **T05** | `budget_allocated`, `budget_disbursed`, `finance_source` |
| **T06** | `company`, `eia_status`, `sector`, `restoration_commitments` |
| **T07** | `community_name`, `district`, `participant_count`, `traditional_knowledge` |

#### 3.3.2 `report_attachments`

Evidence files linked to reports.

| Column | Type | Description |
|---|---|---|
| `id` | UUID | PK |
| `report_id` | UUID | FK → toolkit_reports (CASCADE DELETE) |
| `file_name` | TEXT | Original filename |
| `file_ext` | TEXT | File extension |
| `file_size` | BIGINT | File size in bytes |
| `storage_path` | TEXT | Supabase Storage path |
| `uploaded_by` | UUID | FK → profiles |
| `created_at` | TIMESTAMPTZ | Upload timestamp |

---

### 3.4 Metrics & Weights Tables

#### 3.4.1 `system_metrics`

13 automated system-wide metrics computed from approved reports.

| Column | Type | Description |
|---|---|---|
| `id` | SERIAL | PK |
| `metric_type` | TEXT | Metric identifier |
| `metric_value` | NUMERIC | Current computed value |
| `metric_label` | TEXT | Human-readable label |
| `unit` | TEXT | Unit of measurement |
| `last_updated` | TIMESTAMPTZ | Last recalculation time |

**13 Metric Types:**

| Metric Type | Label | Unit | Source Tool |
|---|---|---|---|
| `forest_restored_ha` | Forest Area Restored | Hectares | T02 |
| `wetland_restored_ha` | Wetland Area Restored | Hectares | T02 |
| `protected_area_coverage` | Protected Area Coverage | % | T03 |
| `mgmt_effectiveness_avg` | Avg Management Effectiveness | Score | T03 |
| `illegal_cases_total` | Total Illegal Cases Reported | Count | T03 |
| `hwc_incidents_total` | Total HWC Incidents | Count | T04 |
| `budget_allocated_total` | Total Budget Allocated | RWF | T05 |
| `budget_disbursed_total` | Total Budget Disbursed | RWF | T05 |
| `disbursement_rate` | Budget Disbursement Rate | % | T05 |
| `eia_compliance_rate` | EIA Compliance Rate | % | T06 |
| `restoration_commitments` | Private Sector Restoration | Hectares | T06 |
| `community_participants` | Community Participants | Count | T07 |
| `traditional_knowledge_entries` | Traditional Knowledge Entries | Count | T07 |

#### 3.4.2 `tool_weights`

Configurable weights for each reporting tool's contribution to target progress.

| Column | Type | Description |
|---|---|---|
| `id` | SERIAL | PK |
| `tool_id` | report_type | T01–T07 |
| `target_id` | INTEGER | FK → nbsap_targets |
| `weight` | NUMERIC | Weight value (0.0–1.0) |
| `updated_at` | TIMESTAMPTZ | Last weight change |

---

### 3.5 Governance Tables

#### 3.5.1 `audit_log`

Immutable, append-only log of all system actions.

| Column | Type | Description |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → profiles (actor) |
| `action_type` | TEXT | submit / approve / reject / export / view / login / delete |
| `action` | TEXT | Human-readable action description |
| `detail` | TEXT | Additional context |
| `role` | TEXT | User's role at time of action |
| `ip_address` | TEXT | Client IP address |
| `created_at` | TIMESTAMPTZ | Action timestamp |

#### 3.5.2 `risks`

Biodiversity risk register.

| Column | Type | Description |
|---|---|---|
| `id` | TEXT | PK (risk identifier) |
| `description` | TEXT | Risk description |
| `category` | TEXT | Risk category |
| `likelihood` | TEXT | Likelihood assessment |
| `impact` | TEXT | Impact assessment |
| `level` | risk_level (ENUM) | High / Medium / Low |
| `mitigation` | TEXT | Mitigation strategy |
| `owner` | TEXT | Risk owner |
| `is_live` | BOOLEAN | Whether auto-generated from submissions |

#### 3.5.3 `compliance_records`

| Column | Type | Description |
|---|---|---|
| `id` | UUID | PK |
| `title` | TEXT | Compliance item title |
| `description` | TEXT | Details |
| `severity` | TEXT | High / Medium / Low |
| `district` | TEXT | Affected district |
| `flagged_at` | TIMESTAMPTZ | When flagged |
| `resolved_at` | TIMESTAMPTZ | When resolved |
| `resolved_by` | UUID | FK → profiles |
| `is_resolved` | BOOLEAN | Resolution status |

#### 3.5.4 `notifications`

| Column | Type | Description |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → profiles (recipient) |
| `title` | TEXT | Notification title |
| `message` | TEXT | Notification body |
| `type` | TEXT | info / warning / error / success |
| `is_read` | BOOLEAN | Read status |
| `action_tab` | TEXT | Navigation target |
| `action_label` | TEXT | Action button label |
| `created_at` | TIMESTAMPTZ | Notification timestamp |

---

### 3.6 Geography Tables

#### 3.6.1 `provinces`

Rwanda's 5 provinces. **Data:** Kigali, South, North, West, East

| Column | Type | Description |
|---|---|---|
| `id` | SERIAL | PK |
| `name` | TEXT | Province name (unique) |

#### 3.6.2 `districts`

Rwanda's 30 districts with compliance tracking.

| Column | Type | Description |
|---|---|---|
| `id` | SERIAL | PK |
| `name` | TEXT | District name (unique) |
| `province_id` | INTEGER | FK → provinces |
| `status` | district_status (ENUM) | submitted / pending / missing |
| `compliance` | INTEGER | Compliance score (0–100) |
| `forest_cover` | INTEGER | Forest cover percentage (0–100) |
| `latitude` | NUMERIC | GPS latitude |
| `longitude` | NUMERIC | GPS longitude |
| `elevation` | NUMERIC | Elevation (metres) |
| `wetland_area` | NUMERIC | Wetland area |

#### 3.6.3 `lakes`

Rwanda's inland water bodies.

| Column | Type | Description |
|---|---|---|
| `id` | SERIAL | PK |
| `name` | TEXT | Lake name |
| `province` | TEXT | Province location |
| `area_km2` | NUMERIC | Surface area |
| `latitude` | NUMERIC | GPS latitude |
| `longitude` | NUMERIC | GPS longitude |

---

### 3.7 RBIS Integration Tables

#### 3.7.1 `rbis_linkages`

| Column | Type | Description |
|---|---|---|
| `id` | SERIAL | PK |
| `indicator_id` | INTEGER | FK → indicators |
| `data_stream_id` | VARCHAR(100) | RBIS data stream identifier |
| `linkage_status` | VARCHAR(20) | linked / not-linked / partial |
| `last_sync` | TIMESTAMPTZ | Last synchronisation time |

#### 3.7.2 `rbis_data_streams`

8 predefined data streams: Protected Areas Coverage, Threatened Species Monitoring, Forest Cover Change, Wetland Extent, Species Distribution, Invasive Species Tracking, Ecosystem Restoration, Sustainable Use Indicators.

| Column | Type | Description |
|---|---|---|
| `id` | VARCHAR(100) | PK |
| `name` | VARCHAR(255) | Display name |
| `description` | TEXT | Stream description |
| `target_numbers` | INTEGER[] | Array of linked target IDs |
| `occurrence_count` | INTEGER | Current occurrence count |
| `status` | VARCHAR(20) | active / inactive / error |
| `icon` | VARCHAR(50) | UI icon identifier |
| `color` | VARCHAR(20) | UI colour code |

#### 3.7.3 `rbis_connection_log`

| Column | Type | Description |
|---|---|---|
| `id` | SERIAL | PK |
| `status` | VARCHAR(20) | connected / disconnected / error |
| `server_url` | VARCHAR(255) | RBIS server URL |
| `error_message` | TEXT | Error details |
| `user_id` | UUID | FK → auth.users |
| `created_at` | TIMESTAMPTZ | Event timestamp |

---

## 4. Enumerated Types

| Type Name | Values | Usage |
|---|---|---|
| `user_role` | policy_monitoring, lead_government_ministry_reporting, local_reporting, dashboard_management, programme_alignment, public_viewer | User access level |
| `indicator_status` | on-track, at-risk, behind | Indicator progress status |
| `indicator_tier` | headline, component, complementary, binary | KM-GBF indicator tier |
| `submission_status` | pending, approved, rejected | Report verification status |
| `district_status` | submitted, pending, missing | District reporting status |
| `report_type` | T01, T02, T03, T04, T05, T06, T07 | Reporting tool identifier |
| `risk_level` | High, Medium, Low | Risk severity |
| `gbf_goal` | A, B, C, D | KM-GBF Goal identifier |

---

## 5. Index Inventory

| Index Name | Table | Columns | Purpose |
|---|---|---|---|
| `idx_toolkit_reports_tool_id` | toolkit_reports | tool_id | Filter reports by tool |
| `idx_toolkit_reports_submitted_by` | toolkit_reports | submitted_by | Find reports by user |
| `idx_toolkit_reports_status` | toolkit_reports | status | Filter by verification status |
| `idx_toolkit_reports_submitted_at` | toolkit_reports | submitted_at DESC | Sort by submission date |
| `idx_indicators_target` | indicators | nbsap_target_id | Find indicators by target |
| `idx_indicators_tier` | indicators | tier | Filter by indicator tier |
| `idx_indicators_status` | indicators | status | Filter by indicator status |
| `idx_audit_log_user` | audit_log | user_id | Find actions by user |
| `idx_audit_log_created` | audit_log | created_at DESC | Sort by timestamp |
| `idx_notifications_user` | notifications | user_id, is_read | Unread notifications query |
| `idx_rbis_linkages_indicator` | rbis_linkages | indicator_id | Find linkages by indicator |
| `idx_rbis_linkages_stream` | rbis_linkages | data_stream_id | Find linkages by stream |
| `idx_rbis_streams_status` | rbis_data_streams | status | Filter streams by status |
| `idx_rbis_connection_log_created` | rbis_connection_log | created_at DESC | Recent connection events |

---

## 6. Row-Level Security (RLS)

All 18 tables have RLS enabled. Key policies:

| Table | Policy | Rule |
|---|---|---|
| **profiles** | Users view own profile | `auth.uid() = id` |
| **profiles** | Admins view all profiles | `is_admin()` returns TRUE |
| **profiles** | Users update own profile | `auth.uid() = id` |
| **profiles** | Admins update any profile | `is_admin()` returns TRUE |
| **indicators** | All authenticated users read | `auth.uid() IS NOT NULL` |
| **indicators** | Writers can update | `can_write()` returns TRUE |
| **indicators** | Admins can insert | `is_admin()` returns TRUE |
| **nbsap_targets** | All authenticated users read | `auth.uid() IS NOT NULL` |
| **toolkit_reports** | Reporters read own + admins read all | Role-based SELECT |
| **toolkit_reports** | Writers can insert | `can_write()` returns TRUE |
| **audit_log** | Admins only | `is_admin()` returns TRUE |
| **notifications** | Users read own | `auth.uid() = user_id` |

### RLS Helper Functions

| Function | Return Type | Purpose |
|---|---|---|
| `get_user_role()` | user_role | Returns current user's role |
| `is_role(check_role)` | BOOLEAN | Checks if user has specific role |
| `can_write()` | BOOLEAN | Checks if user has write permission |
| `is_admin()` | BOOLEAN | Checks if user is dashboard_management |

---

## 7. Database Triggers

| Trigger | Table | Event | Action |
|---|---|---|---|
| **on_report_approved** | toolkit_reports | UPDATE (status → 'approved') | Extract metrics from form_data; update system_metrics |
| **on_report_deleted** | toolkit_reports | DELETE (if approved) | Reverse metric contributions |
| **on_weighted_progress** | system_metrics | UPDATE | Recalculate target progress using tool_weights |
| **on_profile_created** | auth.users | INSERT | Create matching profiles row |
| **on_role_change_approved** | role_change_requests | UPDATE (status → 'approved') | Update user role in profiles |
| **on_notification_created** | notifications | INSERT | Push via Supabase Realtime |
| **on_audit_action** | Various | INSERT/UPDATE/DELETE | Append to audit_log |

---

## 8. Database Functions

| Function | Parameters | Returns | Purpose |
|---|---|---|---|
| `calculate_weighted_progress` | target_id INTEGER | NUMERIC | Compute target progress from tool-weighted metrics |
| `recalculate_all_metrics` | None | VOID | Full recalculation of all 13 system metrics |
| `extract_metric_from_report` | report_id UUID | JSONB | Extract metric-relevant values from report form_data |
| `reverse_metric_contribution` | report_id UUID | VOID | Undo metric impact of a deleted approved report |
| `get_user_role` | None (uses auth.uid()) | user_role | Return current user's role |
| `is_role` | check_role user_role | BOOLEAN | Check user against a specific role |
| `can_write` | None | BOOLEAN | Check if current user has write access |
| `is_admin` | None | BOOLEAN | Check if current user is administrator |
| `update_district_compliance` | district_id INTEGER | VOID | Recalculate district compliance score |

---

*Prepared by: NBSAP Dashboard Development Team*
*Document Reference: NBSAP-DSD-2026-006*
*Rwanda Environment Management Authority (REMA)*
