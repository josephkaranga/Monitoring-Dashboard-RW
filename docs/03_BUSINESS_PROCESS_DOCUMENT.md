# Business Process Document
# Rwanda NBSAP Monitoring Dashboard 2025–2030

**Prepared for:** Rwanda Environment Management Authority (REMA)
**Document Reference:** NBSAP-BPD-2026-003
**Version:** 1.0
**Date:** June 2026
**Classification:** Official — Government Use

---

## Document Control

| Field | Value |
|---|---|
| **Document Title** | Business Process Document |
| **Project** | Rwanda NBSAP Monitoring Dashboard |
| **Prepared by** | NBSAP Dashboard Development Team |
| **Approved by** | REMA — Department of Biodiversity & Landscape Management |
| **Status** | Final |

---

## 1. Introduction

### 1.1 Purpose

This document describes the business processes automated by the Rwanda NBSAP Monitoring Dashboard. It maps the end-to-end workflows from data collection through verification to national reporting, identifying process owners, decision points, and system interactions at each stage.

### 1.2 Process Landscape

The NBSAP Monitoring Dashboard supports the following core business processes:

| Process ID | Process Name | Process Owner |
|---|---|---|
| BP-01 | Data Collection & Submission | Ministry/District Reporters |
| BP-02 | Data Verification & Approval | REMA Administrators / Lead Ministry Reviewers |
| BP-03 | Automated Metric Calculation | System (database triggers) |
| BP-04 | National Target Progress Monitoring | REMA Senior Management |
| BP-05 | User Account & Role Management | REMA Administrators |
| BP-06 | Role Change Request Workflow | System Users / REMA Administrators |
| BP-07 | Data Export & CBD Reporting | REMA Reporting Officers |
| BP-08 | Geographic & Biodiversity Data Integration | System (automated APIs) |
| BP-09 | Risk & Compliance Management | REMA / Policy Monitors |

---

## 2. Business Process Descriptions

### BP-01: Data Collection & Submission

**Process Owner:** Ministry Reporters / District Reporting Officers

**Objective:** Collect structured biodiversity data from field operations, institutional activities, and sectoral programmes through standardised reporting tools.

**Trigger:** Reporting period deadline or occurrence of reportable event (e.g., HWC incident)

**Process Flow:**

```
START
  │
  ├─ Reporter logs into the system
  │
  ├─ Reporter selects appropriate Reporting Tool (T01–T07)
  │    ├── T01: National Institutional Reporting
  │    ├── T02: Ecosystem & Habitat Monitoring
  │    ├── T03: Protected Area Management
  │    ├── T04: Human-Wildlife Conflict
  │    ├── T05: Finance & Resource Mobilisation
  │    ├── T06: Private Sector EIA Compliance
  │    └── T07: Community Engagement
  │
  ├─ Reporter completes structured form fields
  │    ├── Selects district (auto-populated for district officers)
  │    ├── Selects NBSAP target alignment
  │    ├── Enters quantitative data (hectares, counts, budgets)
  │    └── Enters qualitative observations
  │
  ├─ Reporter attaches supporting evidence (documents, images)
  │
  ├─ System validates form data (required fields, value ranges)
  │    ├── PASS → Submission created with status 'pending'
  │    └── FAIL → Validation errors displayed; reporter corrects and resubmits
  │
  ├─ System generates audit log entry
  │
  ├─ System sends notification to authorised reviewers
  │
END (Report enters Verification Queue)
```

**Business Rules:**
- Only users with `canSubmitReports` permission may submit reports
- District Reporting Officers are restricted to their own district
- All form fields have defined validation rules (type, range, required)
- Evidence attachments are stored in secure cloud storage (Supabase Storage)
- Submissions default to `pending` status — no data affects national metrics at this stage

---

### BP-02: Data Verification & Approval

**Process Owner:** REMA Administrators / Lead Government Ministry Reviewers

**Objective:** Ensure all biodiversity data meets quality standards before it updates national metrics. This is the single most critical quality gate in the system.

**Trigger:** New submission appears in the Verification Queue

**Process Flow:**

```
START
  │
  ├─ Reviewer opens the Verification Queue
  │
  ├─ Reviewer selects a pending submission
  │
  ├─ Reviewer examines:
  │    ├── Form data (completeness, plausibility, consistency)
  │    ├── Attached evidence (documents, images)
  │    ├── Historical context (previous submissions for same district/tool)
  │    └── Reporter credentials (organisation, role)
  │
  ├─ DECISION POINT: Is the data acceptable?
  │    │
  │    ├── YES → Reviewer clicks "Approve"
  │    │    ├── Status changes to 'approved'
  │    │    ├── Database triggers fire → national metrics auto-update (BP-03)
  │    │    ├── Notification sent to reporter: "Your report was approved"
  │    │    └── Audit log entry created
  │    │
  │    └── NO → Reviewer clicks "Reject"
  │         ├── Reviewer enters rejection reason (mandatory)
  │         ├── Status changes to 'rejected'
  │         ├── Notification sent to reporter with rejection reason
  │         ├── Reporter may revise and resubmit (returns to BP-01)
  │         └── Audit log entry created
  │
END
```

**Business Rules:**
- Only users with `canApproveReports` permission may verify reports
- Rejection requires a written reason (mandatory field)
- Approved data immediately and automatically updates system metrics
- The reviewer's identity and timestamp are recorded on the report
- A reviewer cannot approve their own submission (separation of duties)

---

### BP-03: Automated Metric Calculation

**Process Owner:** System (fully automated — no human intervention)

**Objective:** Maintain accurate, real-time national biodiversity metrics by automatically computing aggregated values from approved report data.

**Trigger:** A report is approved (BP-02) OR a previously approved report is deleted

**Process Flow:**

```
START
  │
  ├─ Database trigger fires on report status change to 'approved'
  │
  ├─ System identifies the report's tool type (T01–T07)
  │
  ├─ System extracts relevant metric values from form_data JSONB
  │    ├── Forest hectares restored (T02)
  │    ├── Wetland hectares restored (T02)
  │    ├── Protected area coverage (T03)
  │    ├── HWC incidents recorded (T04)
  │    ├── Budget disbursed (T05)
  │    ├── EIA compliance rate (T06)
  │    └── Community participants (T07)
  │
  ├─ System updates the system_metrics table
  │    ├── Increment/decrement metric values
  │    ├── Recalculate percentages and averages
  │    └── Update last_updated timestamp
  │
  ├─ System recalculates target progress using tool weights
  │    ├── Each tool (T01–T07) has a configurable weight
  │    ├── Weighted progress = SUM(tool_progress × tool_weight)
  │    └── Target progress bar updated
  │
  ├─ WebSocket pushes real-time update to all connected browsers
  │
END
```

**On Report Deletion (Reversal):**
```
  ├─ Database trigger fires on deletion of an approved report
  ├─ System reverses all metric contributions of the deleted report
  ├─ Recalculates affected target progress
  └── Audit log entry created: "Metric reversal — Report [ID] deleted"
```

**Business Rules:**
- No manual metric calculation is permitted; all values are trigger-driven
- Each reporting tool has a configurable weight (stored in `tool_weights` table)
- 13 system-wide metric types are maintained automatically
- Metric reversal on deletion ensures data consistency

---

### BP-04: National Target Progress Monitoring

**Process Owner:** REMA Senior Management / Policy Monitors

**Objective:** Provide executive-level visibility into Rwanda's progress against all 22 NBSAP targets.

**Process Flow:**

```
START
  │
  ├─ Authorised user accesses the Dashboard
  │
  ├─ System displays:
  │    ├── 22 national targets organised by 4 KM-GBF Goals
  │    ├── Progress bars with 3-colour status (green/amber/red)
  │    ├── 13 automated system metrics
  │    ├── Recent approved reports
  │    └── District-level compliance map
  │
  ├─ User drills down into specific targets
  │    ├── Linked indicators with baseline and current values
  │    ├── Implementation milestones (2025–2030 timeline)
  │    ├── Responsible stakeholders
  │    └── Contributing report data
  │
  ├─ User may export data for external use (BP-07)
  │
END
```

**Progress Colour Coding:**

| Colour | Threshold | Meaning |
|---|---|---|
| Green | >= 70% | On track to meet 2030 target |
| Amber | 40% – 69% | At risk — intervention may be needed |
| Red | < 40% | Behind schedule — urgent attention required |

---

### BP-05: User Account & Role Management

**Process Owner:** REMA Administrators

**Objective:** Manage the lifecycle of user accounts, ensuring appropriate access levels and institutional accountability.

**Process Flow:**

```
START
  │
  ├─ New user registers via the authentication portal
  │    ├── Default role: Policy Monitor (read-only)
  │    └── Account status: Active
  │
  ├─ REMA Administrator reviews new account
  │    ├── Assigns appropriate role based on institutional mandate
  │    ├── Updates organisation and department fields
  │    └── Audit log entry created
  │
  ├─ ONGOING MANAGEMENT:
  │    ├── Suspend account (with reason and optional end date)
  │    │    └── Auto-reactivation on end date if set
  │    ├── Deactivate account (permanent)
  │    ├── Change user role
  │    └── Review login activity
  │
END
```

---

### BP-06: Role Change Request Workflow

**Process Owner:** System Users (requesters) / REMA Administrators (approvers)

**Objective:** Provide a formal, auditable process for users to request elevated or changed access levels.

**Process Flow:**

```
START
  │
  ├─ User submits role change request
  │    ├── Selects desired role from available options
  │    ├── Provides justification text
  │    └── Request created with status 'pending'
  │
  ├─ REMA Administrator reviews request
  │    ├── Evaluates justification and institutional need
  │    │
  │    ├── APPROVE → User's role is updated immediately
  │    │    ├── Notification sent to user
  │    │    └── Audit log entry created
  │    │
  │    └── REJECT → Request marked as rejected
  │         ├── Rejection reason recorded
  │         ├── Notification sent to user
  │         └── Audit log entry created
  │
END
```

---

### BP-07: Data Export & CBD Reporting

**Process Owner:** REMA Reporting Officers

**Objective:** Generate structured data exports suitable for internal analysis, government reporting, and international CBD obligations.

**Process Flow:**

```
START
  │
  ├─ REMA officer navigates to Reports page
  │
  ├─ Selects export scope:
  │    ├── By reporting tool (T01–T07)
  │    ├── By date range
  │    ├── By district
  │    ├── By NBSAP target
  │    └── Full dataset
  │
  ├─ Selects export format:
  │    ├── CSV — Raw data for spreadsheet analysis
  │    ├── PDF — Formatted report for printing/distribution
  │    └── JSON — Structured data for system interoperability
  │
  ├─ System generates export file
  │
  ├─ User downloads file
  │
  ├─ For CBD Reporting:
  │    ├── Indicator data maps to KM-GBF 3-tier structure
  │    ├── Headline indicators → Tier 1 (internationally comparable)
  │    ├── Component indicators → Tier 2 (implementation detail)
  │    └── Binary indicators → Tier 3 (policy condition assessments)
  │
END
```

---

### BP-08: Geographic & Biodiversity Data Integration

**Process Owner:** System (automated)

**Objective:** Provide real-time geographic and species data from external sources to enrich dashboard visualisations.

**Process Flow:**

```
START
  │
  ├─ GBIF Integration (species occurrence data):
  │    ├── System queries GBIF API (country=RW)
  │    ├── Rate-limited to 1 request/second
  │    ├── Proxied via Supabase Edge Function (CORS avoidance)
  │    ├── Results displayed on interactive map
  │    └── Auto-refresh every 30–60 seconds
  │
  ├─ RBIS Integration (Rwanda Biodiversity Information System):
  │    ├── 8 predefined data streams monitored
  │    ├── Connection status tracked (connected/disconnected/error)
  │    ├── Linkage to specific NBSAP indicators maintained
  │    └── Connection events logged for audit
  │
  ├─ GeoJSON Layers (static reference data):
  │    ├── Rwanda district boundaries (30 districts)
  │    ├── Protected area polygons
  │    ├── River network lines
  │    └── Lake boundaries
  │
END
```

---

### BP-09: Risk & Compliance Management

**Process Owner:** REMA / Policy Monitors

**Objective:** Identify, track, and mitigate risks to biodiversity targets, and monitor compliance with national and international frameworks.

**Process Flow:**

```
START
  │
  ├─ Risk Register:
  │    ├── Risks categorised by type and severity (High/Medium/Low)
  │    ├── Each risk has: description, likelihood, impact, mitigation, owner
  │    ├── Active risks flagged for dashboard visibility
  │    └── Risk status reviewed periodically
  │
  ├─ Compliance Tracking:
  │    ├── EIA compliance monitored per district and sector
  │    ├── Compliance scores auto-calculated from T06 submissions
  │    ├── District-level compliance visible on map
  │    └── Non-compliance flagged for follow-up
  │
END
```

---

## 3. Process Integration Map

The following diagram shows how the 9 business processes interact:

```
BP-01 (Data Collection)
    │
    ▼
BP-02 (Verification)
    │
    ├── Approved ──▶ BP-03 (Auto Metrics) ──▶ BP-04 (Target Monitoring)
    │                                              │
    │                                              ▼
    │                                        BP-07 (Export & CBD Reporting)
    │
    └── Rejected ──▶ Back to BP-01 (Reporter revises & resubmits)

BP-05 (User Management) ◀──▶ BP-06 (Role Change Requests)

BP-08 (External Data) ──▶ BP-04 (Target Monitoring — map & RBIS views)

BP-09 (Risk & Compliance) ◀── BP-01 (fed by T06 EIA compliance data)
```

---

## 4. Key Performance Indicators (KPIs)

| KPI | Target | Measurement Source |
|---|---|---|
| Average report verification turnaround | < 48 hours | Verification Queue timestamps |
| Percentage of districts with 'submitted' status | > 90% | District compliance tracking |
| Number of reports submitted per quarter | > 50 across all tools | Toolkit report counts |
| System uptime | 99.5% | Vercel/Supabase monitoring |
| Audit log completeness | 100% of system actions logged | Audit log table |
| CBD export readiness | Indicator data exportable in 3-tier structure | Export functionality |

---

## 5. Process Improvement Opportunities

| Opportunity | Current State | Future State | Priority |
|---|---|---|---|
| Automated notifications for overdue reports | Manual follow-up | Scheduled reminders to districts with 'missing' status | High |
| Multi-language support | English only | Kinyarwanda and French translations | Medium |
| Mobile application | Responsive web only | Native iOS/Android app for field data collection | Medium |
| Offline data collection | Online only | Offline-capable forms with sync-when-connected | Medium |
| Automated CBD report generation | Manual compilation from exports | One-click CBD National Report draft | High |

---

*Prepared by: NBSAP Dashboard Development Team*
*Document Reference: NBSAP-BPD-2026-003*
*Rwanda Environment Management Authority (REMA)*
