# DATABASE FOOTPRINT
## Rwanda NBSAP Monitoring Dashboard — PostgreSQL Schema Reference

---

## Overview

- **Database**: PostgreSQL (Supabase managed cloud)
- **Schema**: `public`
- **Extensions**: `uuid-ossp`, `pgcrypto`
- **Total Tables**: 18 (core + extended)
- **Total Migrations**: 21 (001–021)
- **RLS**: Enabled on all tables
- **Realtime**: Enabled on `toolkit_reports`, `notifications`

---

## 1. PostgreSQL Enums

```sql
CREATE TYPE user_role AS ENUM (
  'policy_monitoring',
  'lead_government_ministry_reporting',
  'local_reporting',
  'dashboard_management',
  'programme_alignment',
  'public_viewer'
);

CREATE TYPE indicator_status AS ENUM ('on-track', 'at-risk', 'behind');
CREATE TYPE indicator_tier   AS ENUM ('headline', 'component', 'complementary', 'binary');
CREATE TYPE submission_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE district_status  AS ENUM ('submitted', 'pending', 'missing');
CREATE TYPE report_type      AS ENUM ('T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07');
CREATE TYPE risk_level       AS ENUM ('High', 'Medium', 'Low');
CREATE TYPE gbf_goal         AS ENUM ('A', 'B', 'C', 'D');
CREATE TYPE request_status   AS ENUM ('pending', 'approved', 'rejected', 'cancelled', 'stale');
```

---

## 2. Core Tables

### `auth.users` (Supabase managed)
The Supabase-managed identity table. Extended by `public.profiles` via FK.

---

### `public.profiles`
Extends `auth.users` with application-specific user data.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, FK → auth.users ON DELETE CASCADE | Matches Supabase auth user ID |
| `email` | TEXT | NOT NULL | |
| `full_name` | TEXT | | |
| `role` | user_role | NOT NULL DEFAULT 'policy_monitoring' | Application role |
| `organization` | TEXT | | Employer / ministry |
| `department` | TEXT | | |
| `phone` | TEXT | | |
| `is_active` | BOOLEAN | DEFAULT TRUE | Soft deactivation flag |
| `suspended_at` | TIMESTAMPTZ | | Set when admin suspends account |
| `suspended_by` | UUID | | Admin who suspended |
| `suspension_reason` | TEXT | | |
| `suspension_end_date` | TIMESTAMPTZ | | NULL = indefinite suspension |
| `last_login` | TIMESTAMPTZ | | Updated on each sign-in |
| `avatar_initials` | TEXT | GENERATED ALWAYS | UPPER(LEFT(full_name ∥ email, 2)) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Auto-updated via trigger |

**Trigger**: `set_updated_at_profiles` → `handle_updated_at()`
**Trigger**: `on_auth_user_created` → `handle_new_user()` (auto-creates profile + settings + notification_preferences on signup)

---

### `public.provinces`
Rwanda's 5 provinces.

| Column | Type | Constraints |
|---|---|---|
| `id` | SERIAL | PK |
| `name` | TEXT | NOT NULL UNIQUE |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

**Seed data**: Kigali, South, North, West, East

---

### `public.districts`
All 30 Rwanda districts with environmental data.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | SERIAL | PK | |
| `name` | TEXT | NOT NULL UNIQUE | |
| `province_id` | INTEGER | FK → provinces(id) | |
| `status` | district_status | DEFAULT 'missing' | submitted/pending/missing |
| `compliance` | INTEGER | CHECK (0–100) | % compliance score |
| `forest_cover` | INTEGER | CHECK (0–100) | % forest cover |
| `latitude` | NUMERIC | | Added migration 003 |
| `longitude` | NUMERIC | | Added migration 003 |
| `elevation` | NUMERIC | | Added migration 003 |
| `wetland_area` | NUMERIC | | Added migration 003 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Seed data**: All 30 districts pre-populated with initial status and forest/compliance scores.

---

### `public.nbsap_targets`
Rwanda's 22 NBSAP 2025–2030 national biodiversity targets.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | INTEGER | PK | 1–22 |
| `goal` | gbf_goal | NOT NULL | A/B/C/D (KM-GBF aligned) |
| `title` | TEXT | NOT NULL | Short target title |
| `description` | TEXT | | Full target statement |
| `baseline` | TEXT | | Official baseline data |
| `timeline_milestones` | JSONB | | Phase-by-phase milestones (added migration 021) |
| `progress` | INTEGER | DEFAULT 0, CHECK (0–100) | Current progress % |
| `last_auto_update` | TIMESTAMPTZ | | Set by weighted progress trigger |
| `auto_update_count` | INTEGER | DEFAULT 0 | Count of automatic updates |
| `responsible_stakeholders` | TEXT[] | | Array of responsible organisations |
| `headline_indicator` | TEXT | | |
| `component_indicators` | TEXT[] | | |
| `complementary_indicators` | TEXT[] | | |
| `strategic_actions` | TEXT[] | | |
| `goal_color` | JSONB | | `{bg, text}` color object |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Trigger**: Updated by `update_target_progress_from_reports()` when reports are approved.

---

### `public.indicators`
KM-GBF aligned biodiversity indicators, linked to NBSAP targets.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | SERIAL | PK | |
| `name` | TEXT | NOT NULL | |
| `definition` | TEXT | | Formal KM-GBF definition |
| `tier` | indicator_tier | NOT NULL | headline/component/complementary/binary |
| `nbsap_target_id` | INTEGER | FK → nbsap_targets(id) | |
| `target_2030` | TEXT | | 2030 target value |
| `baseline` | TEXT | | 2020 baseline |
| `midterm` | TEXT | | 2027 midterm target |
| `final_target` | TEXT | | |
| `current_value` | TEXT | | Latest monitored value |
| `progress` | INTEGER | DEFAULT 0, CHECK (0–100) | |
| `status` | indicator_status | DEFAULT 'behind' | on-track/at-risk/behind |
| `km_gbf` | TEXT | | KM-GBF global indicator reference |
| `periodicity` | TEXT | | Reporting frequency |
| `data_source` | TEXT | | |
| `responsible` | TEXT[] | | Responsible organisations |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Auto-updated via trigger |

**Indexes**: `idx_indicators_target`, `idx_indicators_tier`, `idx_indicators_status`
**Trigger**: Updated by `update_target_progress_from_reports()` when linked target progress changes.

---

### `public.toolkit_reports`
Central table for all T01–T07 reporting submissions.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK DEFAULT uuid_generate_v4() | |
| `tool_id` | report_type | NOT NULL | T01–T07 |
| `tool_name` | TEXT | NOT NULL | Human-readable tool name |
| `submitted_by` | UUID | FK → profiles(id) | |
| `status` | submission_status | DEFAULT 'pending' | pending/approved/rejected |
| `reviewed_by` | UUID | FK → profiles(id) | NULL until reviewed |
| `reviewed_at` | TIMESTAMPTZ | | |
| `review_note` | TEXT | | Approval/rejection note |
| `period` | TEXT | | Reporting period (e.g. "Q1 2026") |
| `form_data` | JSONB | NOT NULL DEFAULT '{}' | All tool-specific fields |
| `attachments` | JSONB | DEFAULT '[]' | Array of attachment metadata objects |
| `district` | TEXT | | Denormalised for fast filtering |
| `institution` | TEXT | | Denormalised for fast filtering |
| `nbsap_target_id` | INTEGER | FK → nbsap_targets(id) | Links report to NBSAP target |
| `submitted_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Auto-updated via trigger |

**Indexes**: tool_id, submitted_by, status, submitted_at DESC, (tool_id, status) compound, GIN on form_data
**Triggers**:
- `trigger_update_target_progress` → `update_target_progress_from_reports()` (weighted progress)
- `trigger_update_system_metrics` → `update_system_metrics_from_reports()` (system metrics)
**Note**: `form_data` JSONB stores all tool-specific fields dynamically. Key fields by tool:

| Tool | Key form_data Fields |
|---|---|
| T01 | `institution`, `budget_utilized`, `compliance_score`, `target_info` |
| T02 | `district`, `forest_ha`, `wetland_ha`, `land_cover_change` |
| T03 | `area_name`, `coverage_ha`, `coverage_change_ha`, `management_effectiveness`, `illegal_cases`, `restoration_ha` |
| T04 | `incident_type`, `district`, `species`, `hwc_incidents` |
| T05 | `budget_allocated`, `budget_disbursed`, `finance_source` |
| T06 | `company`, `eia_compliance`, `sector`, `restoration_ha` |
| T07 | `community_name`, `district`, `participant_count`, `traditional_knowledge` |

---

### `public.report_attachments`
Metadata for files uploaded alongside toolkit reports.

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `report_id` | UUID | FK → toolkit_reports(id) ON DELETE CASCADE |
| `file_name` | TEXT | NOT NULL |
| `file_ext` | TEXT | |
| `file_size` | BIGINT | |
| `storage_path` | TEXT | Path in Supabase Storage bucket |
| `uploaded_by` | UUID | FK → profiles(id) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

---

### `public.risks`
National biodiversity risk register.

| Column | Type | Constraints |
|---|---|---|
| `id` | TEXT | PK |
| `description` | TEXT | NOT NULL |
| `category` | TEXT | NOT NULL |
| `likelihood` | TEXT | NOT NULL |
| `impact` | TEXT | NOT NULL |
| `level` | risk_level | NOT NULL (High/Medium/Low) |
| `mitigation` | TEXT | |
| `owner` | TEXT | |
| `is_live` | BOOLEAN | DEFAULT FALSE — auto-generated from submissions |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |

---

### `public.compliance_records`
Compliance violations and obligations tracking.

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `title` | TEXT | NOT NULL |
| `description` | TEXT | |
| `severity` | TEXT | CHECK ('High','Medium','Low') |
| `district` | TEXT | |
| `flagged_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `resolved_at` | TIMESTAMPTZ | |
| `resolved_by` | UUID | FK → profiles(id) |
| `is_resolved` | BOOLEAN | DEFAULT FALSE |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

---

### `public.notifications`
In-app notifications for users.

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → profiles(id) ON DELETE CASCADE |
| `title` | TEXT | NOT NULL |
| `message` | TEXT | NOT NULL |
| `type` | TEXT | 'info' / 'warning' / 'error' / 'success' |
| `is_read` | BOOLEAN | DEFAULT FALSE |
| `action_tab` | TEXT | Route/tab to navigate to on click |
| `action_label` | TEXT | Button label |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

**Index**: `idx_notifications_user` on (user_id, is_read)

---

### `public.notification_preferences`
Per-user notification subscription settings.

| Column | Type | Default |
|---|---|---|
| `user_id` | UUID PK | FK → profiles(id) ON DELETE CASCADE |
| `email` | TEXT | |
| `phone` | TEXT | |
| `sub_overdue` | BOOLEAN | TRUE |
| `sub_compliance` | BOOLEAN | TRUE |
| `compliance_threshold` | INTEGER | 60 |
| `sub_deadlines` | BOOLEAN | TRUE |
| `deadline_days` | INTEGER | 14 |
| `sub_pending` | BOOLEAN | TRUE |
| `sub_finance` | BOOLEAN | TRUE |
| `sub_risk` | BOOLEAN | TRUE |
| `watchlist_indicators` | INTEGER[] | |
| `updated_at` | TIMESTAMPTZ | |

---

### `public.audit_log`
Immutable record of every system action.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → profiles(id) | |
| `action_type` | TEXT | NOT NULL | submit/approve/reject/export/view/login/delete/progress_update/role_updated/map_action |
| `action` | TEXT | NOT NULL | Human-readable description |
| `detail` | TEXT | | JSON or free-text detail |
| `role` | TEXT | | User role at time of action |
| `ip_address` | TEXT | | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes**: `idx_audit_log_user`, `idx_audit_log_created`
**Policy**: No DELETE policy — append-only

---

### `public.user_settings`
Per-user dashboard preferences.

| Column | Type | Default |
|---|---|---|
| `user_id` | UUID PK | FK → profiles(id) |
| `show_live_stats` | BOOLEAN | TRUE |
| `animate_bars` | BOOLEAN | TRUE |
| `compact_sidebar` | BOOLEAN | FALSE |
| `auto_refresh` | BOOLEAN | TRUE |
| `show_baseline` | BOOLEAN | TRUE |
| `require_verification` | BOOLEAN | TRUE |
| `species_fuzzing` | BOOLEAN | FALSE |
| `mask_species_names` | BOOLEAN | FALSE |
| `restrict_raw_export` | BOOLEAN | TRUE |
| `log_exports` | BOOLEAN | TRUE |
| `language` | TEXT | 'en' |
| `updated_at` | TIMESTAMPTZ | |

---

## 3. Extended Tables (Added by Migrations)

### `public.role_change_requests` (Migration 006)
Workflow for users requesting role upgrades.

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → profiles(id) ON DELETE CASCADE |
| `from_role` | TEXT | NOT NULL |
| `to_role` | TEXT | NOT NULL |
| `justification` | TEXT | NOT NULL, CHECK (LENGTH ≥ 20) |
| `status` | request_status | DEFAULT 'pending' |
| `reviewed_by` | UUID | FK → profiles(id) |
| `reviewed_at` | TIMESTAMPTZ | |
| `review_note` | TEXT | |
| `rejection_reason` | TEXT | Required if rejected (LENGTH ≥ 10) |
| `is_notified` | BOOLEAN | DEFAULT FALSE |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Constraints**:
- `rejection_requires_reason`: rejected status requires non-null reason ≥ 10 chars
- `no_self_approval`: reviewed_by ≠ user_id (admins cannot approve their own requests)

**Triggers**:
- `on_role_request_created` → `notify_admins_of_role_request()` (notifies all admins)
- `on_role_request_approved` → `apply_approved_role_change()` (updates profiles.role + writes audit)
- `on_role_request_decided` → `notify_user_of_decision()` (notifies requester of outcome)

---

### `public.lakes` (Migration 008)
Rwanda inland water bodies geographic data.

| Column | Type |
|---|---|
| `id` | SERIAL PK |
| `name` | TEXT NOT NULL |
| `area_km2` | NUMERIC |
| `latitude` | NUMERIC |
| `longitude` | NUMERIC |
| `province` | TEXT |
| `created_at` | TIMESTAMPTZ |

---

### `public.system_metrics` (Migration 015)
Auto-updated aggregated system metrics from approved reports.

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `metric_type` | TEXT NOT NULL | See metric types below |
| `metric_value` | NUMERIC DEFAULT 0 | Auto-updated by trigger |
| `source_tool` | TEXT | Which tool(s) feed this metric |
| `source_field` | TEXT | JSONB field name(s) |
| `aggregation_type` | TEXT | sum/count/average/latest |
| `updated_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |

**Metric Types**:
| metric_type | Source Tool | Description |
|---|---|---|
| `forest_ha_total` | T02, T03 | Total forest + restoration hectares |
| `wetland_ha_total` | T02 | Total wetland rehabilitation hectares |
| `finance_rwf_allocated` | T05 | Total budget allocated (RWF) |
| `finance_rwf_disbursed` | T05 | Total budget disbursed (RWF) |
| `finance_rwf_utilized` | T01 | Total budget utilized (RWF) |
| `hwc_incidents_total` | T03, T04 | Human-wildlife conflict incidents |
| `eia_compliance_full` | T06 | Count of full EIA compliance reports |
| `eia_compliance_partial` | T06 | Count of partial compliance reports |
| `eia_compliance_non` | T06 | Count of non-compliant reports |
| `districts_reporting` | T02 | COUNT DISTINCT of districts with approved T02s |
| `companies_reporting` | T06 | COUNT DISTINCT of companies with approved T06s |
| `restoration_commitments_ha` | T06 | Restoration area committed (ha) |
| `protected_areas_monitored` | T03 | COUNT DISTINCT protected areas reported |

**View**: `dashboard_metrics_live` — presents all metrics formatted for the dashboard, including computed EIA compliance percentage.

---

### `public.tool_weights` (Migration 016)
Configurable weights controlling each tool's contribution to target progress.

| Column | Type | Notes |
|---|---|---|
| `tool_id` | TEXT PK | T01–T07 |
| `weight` | DECIMAL | Multiplier for base_contribution (20) |
| `description` | TEXT | |
| `active` | BOOLEAN | DEFAULT TRUE |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### `public.ai_extractions` (Migration 018)
AI analysis results for each submitted report (async, fire-and-forget).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `report_id` | UUID | FK → toolkit_reports ON DELETE CASCADE |
| `status` | TEXT | pending/processing/complete/failed |
| `raw_text_analyzed` | TEXT | Combined form-field text sent to Claude |
| `document_text` | TEXT | Text extracted from uploaded attachments |
| `extraction_result` | JSONB | Full structured Claude response |
| `error_message` | TEXT | |
| `processing_time_ms` | INTEGER | |
| `model_used` | TEXT | DEFAULT 'claude-sonnet-4-20250514' |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Extraction result JSONB structure**:
```json
{
  "targets_mentioned": [1, 3, 7],
  "progress_updates": [{ "indicator_id": 5, "extracted_value": "65%", "confidence": 0.87 }],
  "milestone_completions": [...],
  "budget_info": [{ "amount": 500000, "currency": "RWF", "type": "allocated" }],
  "locations": ["Musanze", "Burera"],
  "activities": [...],
  "challenges": [...],
  "risks": [...],
  "evidence_references": [...],
  "summary": "..."
}
```

---

### `public.ai_extraction_proposals` (Migration 018)
Individual proposed data updates from AI extractions, requiring reviewer approval.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `extraction_id` | UUID | FK → ai_extractions ON DELETE CASCADE |
| `report_id` | UUID | FK → toolkit_reports ON DELETE CASCADE |
| `proposal_type` | TEXT | target_progress/indicator_value/milestone_status/target_association/budget_update/geographic_update |
| `target_id` | INTEGER | FK → nbsap_targets |
| `indicator_id` | INTEGER | FK → indicators |
| `proposed_value` | TEXT | JSON string e.g. '{"progress":65}' |
| `current_value` | TEXT | Value at extraction time |
| `confidence_score` | DECIMAL(3,2) | 0.00–1.00 |
| `reasoning` | TEXT | AI explanation |
| `source_field` | TEXT | Which form_data field triggered this |
| `status` | TEXT | pending/approved/rejected/modified |
| `reviewer_id` | UUID | FK → profiles |
| `reviewed_at` | TIMESTAMPTZ | |
| `reviewer_note` | TEXT | |
| `modified_value` | TEXT | Reviewer override value |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

## 4. Database Views

### `dashboard_metrics_live`
Real-time formatted system metrics for dashboard display. Reads directly from `system_metrics` table values, computes EIA compliance percentage, and presents all metrics in display-ready format (finance in millions RWF).

### `target_progress_with_reports`
Joins `nbsap_targets` with `toolkit_reports` aggregates (total/approved/pending counts and completion rate) per target. Consumed by `fetchTargetsWithReportStats()`.

---

## 5. Database Functions

### Helper / Security Functions
| Function | Return | Purpose |
|---|---|---|
| `get_user_role()` | user_role | Returns current user's role (SECURITY DEFINER) |
| `is_role(check_role)` | BOOLEAN | Checks if current user has specific role |
| `can_write()` | BOOLEAN | TRUE for local_reporting, sector, dashboard_management |
| `is_admin()` | BOOLEAN | TRUE only for dashboard_management |

### Business Logic Functions
| Function | Signature | Purpose |
|---|---|---|
| `safe_numeric_extract` | (TEXT) → NUMERIC | Safely casts text to numeric, returns 0 on failure |
| `get_tool_weight` | (TEXT) → DECIMAL | Returns tool weight from tool_weights table |
| `get_system_metrics` | () → TABLE | Returns all metric values in named columns |
| `recalculate_system_metrics` | () → TEXT | Full recalculation from approved reports (admin use) |
| `get_user_responsible_targets` | (user_org TEXT) → TABLE | RPC: targets linked to a user's organisation |
| `calculate_indicator_progress` | (indicator_id, target_id) → INTEGER | Blends target progress (70%) + weighted completion rate (30%) |
| `flag_stale_role_requests` | () → INTEGER | Marks 30-day-old pending requests as 'stale' |

### Trigger Functions
| Function | Fires On | Action |
|---|---|---|
| `handle_new_user()` | auth.users INSERT | Creates profile + user_settings + notification_preferences |
| `handle_updated_at()` | Any table BEFORE UPDATE | Sets updated_at = NOW() |
| `touch_updated_at()` | ai_extractions, ai_extraction_proposals BEFORE UPDATE | Sets updated_at = NOW() |
| `update_target_progress_from_reports()` | toolkit_reports INSERT/UPDATE | Weighted progress calculation + indicator status update + audit log |
| `update_system_metrics_from_reports()` | toolkit_reports INSERT/UPDATE | Updates all system metric accumulators |
| `notify_admins_of_role_request()` | role_change_requests INSERT | Creates notification for all active admins |
| `apply_approved_role_change()` | role_change_requests UPDATE → approved | Updates profiles.role + writes audit entry |
| `notify_user_of_decision()` | role_change_requests UPDATE → approved/rejected | Creates notification for requester |

---

## 6. Database Indexes

| Index Name | Table | Columns | Type |
|---|---|---|---|
| `idx_toolkit_reports_tool_id` | toolkit_reports | tool_id | BTREE |
| `idx_toolkit_reports_submitted_by` | toolkit_reports | submitted_by | BTREE |
| `idx_toolkit_reports_status` | toolkit_reports | status | BTREE |
| `idx_toolkit_reports_submitted_at` | toolkit_reports | submitted_at DESC | BTREE |
| `idx_toolkit_reports_tool_status` | toolkit_reports | (tool_id, status) | BTREE |
| `idx_toolkit_reports_form_data_gin` | toolkit_reports | form_data | GIN |
| `idx_indicators_target` | indicators | nbsap_target_id | BTREE |
| `idx_indicators_tier` | indicators | tier | BTREE |
| `idx_indicators_status` | indicators | status | BTREE |
| `idx_audit_log_user` | audit_log | user_id | BTREE |
| `idx_audit_log_created` | audit_log | created_at DESC | BTREE |
| `idx_notifications_user` | notifications | (user_id, is_read) | BTREE |
| `idx_role_change_requests_user_id` | role_change_requests | user_id | BTREE |
| `idx_role_change_requests_status` | role_change_requests | status | BTREE |
| `idx_role_change_requests_created_at` | role_change_requests | created_at DESC | BTREE |
| `idx_system_metrics_type` | system_metrics | metric_type | BTREE |
| `idx_system_metrics_updated` | system_metrics | updated_at | BTREE |
| `idx_ai_extractions_report_id` | ai_extractions | report_id | BTREE |
| `idx_ai_extractions_status` | ai_extractions | status | BTREE |
| `idx_ai_proposals_extraction_id` | ai_extraction_proposals | extraction_id | BTREE |
| `idx_ai_proposals_status` | ai_extraction_proposals | status | BTREE |

---

## 7. Row-Level Security Summary

| Table | Public | Own Data | Role-Specific |
|---|:---:|:---:|:---:|
| profiles | ❌ | ✅ SELECT/UPDATE | admin: all |
| indicators | ❌ | N/A | all auth: SELECT; writers: UPDATE; admin: INSERT |
| nbsap_targets | ❌ | N/A | all auth: SELECT; admin: ALL |
| districts | ❌ | N/A | all auth: SELECT; local+admin: UPDATE |
| toolkit_reports | ❌ | local: own | policy/admin/partner: all; sector: all; local: own |
| risks | ❌ | N/A | all auth: SELECT; admin: ALL |
| compliance_records | ❌ | N/A | all auth: SELECT; writers: INSERT; admin: UPDATE |
| notifications | ❌ | ✅ own only | system/admin: INSERT |
| audit_log | ❌ | ✅ own entries | admin: all |
| user_settings | ❌ | ✅ own | — |
| role_change_requests | ❌ | ✅ own | admin: all (no self-approval) |
| ai_extractions | ❌ | N/A | all auth: SELECT/INSERT/UPDATE |
| system_metrics | ❌ | N/A | all auth: SELECT |

---

## 8. Storage Buckets

| Bucket | Public | Access | Path Pattern |
|---|:---:|---|---|
| `report-attachments` | ❌ | Writers upload; users read own; admin delete | `{userId}/{timestamp}_{filename}` |
| `exports` | ❌ | Writers upload; users read own; admin delete | (CSV/PDF exports) |

---

## 9. Migration History

| # | Migration | Key Changes |
|---|---|---|
| 001 | initial_schema | Core tables: profiles, districts, provinces, targets, indicators, toolkit_reports, report_attachments, risks, compliance_records, notifications, notification_preferences, audit_log, user_settings + RLS + triggers |
| 002 | seed_data | Initial NBSAP target data + indicator framework |
| 003 | add_district_coordinates | latitude, longitude, elevation, wetland_area on districts |
| 004 | rbis_tables | RBIS data streams table |
| 005 | seed_rbis_data_streams | Seed RBIS integration data |
| 006 | role_change_approval | role_change_requests table + workflow triggers |
| 007 | terminology_update | Role name renames |
| 008 | add_lakes_table | lakes table |
| 009 | add_account_status_fields | suspended_at, suspended_by, suspension_reason, suspension_end_date on profiles |
| 010 | add_public_viewer_role | public_viewer enum value + policies |
| 011 | rename_sector_reporting_role | Rename sector_reporting → lead_government_ministry_reporting |
| 012 | extend_reporting_period | Extend toolkit report period options |
| 013 | nbsap_target_integration | nbsap_target_id FK on toolkit_reports + initial progress trigger |
| 014 | update_comprehensive_stakeholder_mapping | responsible_stakeholders array on nbsap_targets + RPC function |
| 015 | comprehensive_reporting_metrics_automation | system_metrics table + 13 metric types + trigger + view + recalculate function |
| 016 | automatic_reporting_tool_weights | tool_weights table + get_tool_weight() function |
| 017 | weighted_progress_triggers | Enhanced update_target_progress_from_reports() with tool weights + calculate_indicator_progress() |
| 018 | ai_extraction_layer | ai_extractions + ai_extraction_proposals tables + RLS |
| 019 | delete_cleanup_and_role_cast_fix | Delete cascade fixes + role cast corrections |
| 020 | rwanda_nbsap_2025_2030 | Full Rwanda NBSAP target data load (all 22 targets with descriptions, baselines, indicators) |
| 021 | target_baselines_and_timelines | timeline_milestones JSONB on nbsap_targets; detailed phase-by-phase milestones for all 22 targets |

---

*Document version: 2026-06-17 | Schema reflects migrations 001–021*
