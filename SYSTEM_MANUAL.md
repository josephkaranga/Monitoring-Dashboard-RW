# Rwanda NBSAP Monitoring Dashboard
## System Manual & Presentation Guide
### Rwanda 2025–2030 National Biodiversity Strategy and Action Plan

---

## TABLE OF CONTENTS

1. [System Overview](#1-system-overview)
2. [Why This System Was Built](#2-why-this-system-was-built)
3. [Technical Architecture](#3-technical-architecture)
4. [User Roles & Access Levels](#4-user-roles--access-levels)
5. [Module-by-Module Guide](#5-module-by-module-guide)
   - 5.1 Dashboard
   - 5.2 National Targets (22 Targets)
   - 5.3 Indicators Hierarchy
   - 5.4 Reporting Toolkit (7 Tools)
   - 5.5 Verification Queue
   - 5.6 Reports & Analytics
   - 5.7 Compliance Monitoring
   - 5.8 Map View
   - 5.9 User Management
   - 5.10 Settings
6. [Color Progress Metric System](#6-color-progress-metric-system)
7. [Data Flow — From Submission to Dashboard](#7-data-flow--from-submission-to-dashboard)
8. [Rwanda NBSAP 2025–2030 Targets Summary](#8-rwanda-nbsap-2025-2030-targets-summary)
9. [KM-GBF Indicator Framework](#9-km-gbf-indicator-framework)
10. [Security & Data Integrity](#10-security--data-integrity)
11. [Panel Presentation Script](#11-panel-presentation-script)
12. [Anticipated Panel Questions & Answers](#12-anticipated-panel-questions--answers)

---

## 1. SYSTEM OVERVIEW

The **Rwanda NBSAP Monitoring Dashboard** is a national digital platform built to track, report, verify, and visualise Rwanda's progress toward its 22 national biodiversity targets under the **National Biodiversity Strategy and Action Plan (NBSAP) 2025–2030**, aligned with the **Kunming-Montreal Global Biodiversity Framework (KM-GBF)**.

### What It Does

| Capability | Description |
|---|---|
| **Real-time Tracking** | Live progress monitoring across all 22 national targets |
| **Multi-stakeholder Reporting** | 7 structured reporting tools covering every NBSAP sector |
| **Verification Workflow** | All data passes through an approval queue before affecting national metrics |
| **Automated Metrics** | System-level biodiversity metrics auto-update when reports are approved |
| **AI-powered Narratives** | Claude AI generates progress summaries from live dashboard data |
| **Geographic Coverage** | All 30 Rwanda districts tracked and mapped |
| **Role-based Access** | 5 permission tiers from public viewer to national administrator |

### Deployment
- **Live URL:** https://nbsap-dashboard-rw.vercel.app
- **Database:** Supabase (PostgreSQL) — hosted on secure cloud infrastructure
- **Status:** Production-ready, live data

---

## 2. WHY THIS SYSTEM WAS BUILT

Rwanda is a signatory to the **Convention on Biological Diversity (CBD)** and committed to the **Kunming-Montreal Global Biodiversity Framework** adopted in December 2022. The framework requires countries to:

- Define national targets aligned to 23 global targets
- Monitor progress using a structured indicator hierarchy
- Report to the CBD Secretariat periodically
- Ensure multi-stakeholder participation in biodiversity governance

**Before this system**, Rwanda's biodiversity monitoring was fragmented across:
- Spreadsheets managed by individual ministries
- PDF reports submitted manually
- No central verification or audit trail
- No real-time visibility of national progress

**This dashboard solves all of that** by providing a single, authoritative, real-time source of truth for Rwanda's biodiversity data, accessible to government, districts, partner organisations, and the public.

---

## 3. TECHNICAL ARCHITECTURE

```
┌──────────────────────────────────────────────────────────┐
│                    FRONTEND (React + TypeScript)          │
│  ┌─────────────┐ ┌──────────────┐ ┌───────────────────┐  │
│  │  Dashboard   │ │  Reporting   │ │  Admin & Reports  │  │
│  │  & Targets  │ │  Toolkit     │ │  & Compliance     │  │
│  └─────────────┘ └──────────────┘ └───────────────────┘  │
│           Deployed on Vercel (Global CDN)                 │
└────────────────────────┬─────────────────────────────────┘
                         │ HTTPS / REST API
┌────────────────────────▼─────────────────────────────────┐
│                    SUPABASE BACKEND                        │
│  ┌───────────────┐ ┌────────────┐ ┌────────────────────┐ │
│  │  PostgreSQL   │ │  Auth      │ │  Row-Level         │ │
│  │  Database     │ │  (JWT)     │ │  Security (RLS)    │ │
│  └───────────────┘ └────────────┘ └────────────────────┘ │
│  ┌───────────────┐ ┌────────────┐ ┌────────────────────┐ │
│  │  File Storage │ │  Realtime  │ │  DB Triggers       │ │
│  │  (Evidence)   │ │  Updates   │ │  (Auto-metrics)    │ │
│  └───────────────┘ └────────────┘ └────────────────────┘ │
└──────────────────────────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────┐
│                    ANTHROPIC CLAUDE API                    │
│           AI-powered Progress Narrative Generation        │
└──────────────────────────────────────────────────────────┘
```

### Key Technical Features
- **Database triggers** automatically update national progress metrics when reports are approved — no manual calculations
- **Row-Level Security (RLS)** ensures each user only sees data they are authorised to access
- **Real-time subscriptions** push live target progress updates to all connected browsers instantly
- **Audit log** records every action taken in the system for full accountability
- **Cascading delete reversal** — deleting a report automatically reverses all metrics it previously updated

---

## 4. USER ROLES & ACCESS LEVELS

The system has **5 distinct roles** with carefully controlled permissions:

| Role | Who | What They Can Do |
|---|---|---|
| **Dashboard Management** | National administrator (REMA) | Full access: approve/reject reports, manage users, view all data, access compliance and audit logs |
| **Lead Government Ministry Reporting** | Ministry focal points (MoE, MINAGRI, etc.) | Submit reports, view verification queue, access analytics |
| **District Reporting Officer** | District environment officers (all 30 districts) | Submit reports for their district, view their own submissions |
| **Partner Organisation** | NGOs, research institutions, private sector | Submit reports for their tools, view public dashboards |
| **Public Viewer** | General public | View-only: dashboard, national targets, indicators |

### How to Log In
1. Navigate to https://nbsap-dashboard-rw.vercel.app
2. Enter email and password
3. The system automatically loads the correct interface for your role
4. First-time users receive an invitation email with a password-setup link

### Account Security
- Passwords are encrypted using industry-standard bcrypt hashing
- Sessions expire after inactivity
- Suspended accounts are blocked with an on-screen notification
- Role change requests go through an approval workflow

---

## 5. MODULE-BY-MODULE GUIDE

---

### 5.1 DASHBOARD

**What it shows:** A real-time executive summary of Rwanda's national biodiversity progress.

#### Metric Cards (top row)
| Card | What It Shows |
|---|---|
| **Total Targets** | 22 — Rwanda's full NBSAP 2025–2030 target set |
| **Data Submissions** | Total toolkit reports submitted + pending count |
| **Active Districts** | 30/30 — all 30 Rwanda districts covered |
| **Compliance Issues** | Number of unresolved compliance records |

#### Automated System Metrics
These **auto-calculate from approved reports** — no manual entry required:
- Forest & wetland hectares restored (from Tools T02, T03, T06)
- Finance mobilised in RWF millions (from Tools T01, T05)
- Districts actively reporting (from Tool T02)
- Human-Wildlife Conflict incidents (from Tools T03, T04)
- EIA compliance rates (from Tool T06)

#### Indicator Progress Trends
Shows the live breakdown of Rwanda's indicator monitoring:
- **Average Progress** bar — overall system health
- **On-Track** count (green) — indicators at ≥70% progress
- **At-Risk** count (amber) — indicators at 40–69% progress
- **Behind Schedule** count (red) — indicators below 40% progress
- **Tier chips** — headline / component / binary indicator counts

#### Recent Activity
Lists the 4 most recently approved submissions with tool name and timestamp.

#### NBSAP Target Progress Widget
A live mini-panel showing all 22 targets filterable by Goal (A/B/C/D) with per-target progress bars and report counts.

#### AI Progress Narrative
Click **"Generate Insight"** to produce a Claude AI-powered summary of the current national biodiversity situation, identifying risks and recommended actions — generated live from real dashboard data.

---

### 5.2 NATIONAL TARGETS (22 TARGETS)

**What it shows:** All 22 Rwanda NBSAP 2025–2030 targets with full detail.

#### Target Structure
Each target card shows:
- **Target number and title** (Rwanda-specific formulation)
- **Goal badge** (A/B/C/D) with KM-GBF alignment
- **Progress bar** colored green/amber/red per the progress metric
- **Status pill** (On Track / At Risk / Behind)

#### Expanding a Target
Click any target to expand and see:

| Section | Content |
|---|---|
| **Full Target Statement** | Complete Rwanda-specific target description |
| **Baseline / Current Status** | Official baseline data from Rwanda national reports and sector strategies |
| **Timeline & Milestones** | Phase-by-phase implementation roadmap from 2025 to 2030 with year badges |
| **Progress toward 2030** | Visual progress bar with status label and percentage |
| **Indicator Framework** | Headline indicator and component indicators linked to this target |
| **Key Strategic Actions** | Specific activities needed to achieve the target |
| **Live Linked Indicators** | Real-time indicator cards from the database, color-coded by progress |

#### Goal Structure (KM-GBF Aligned)
| Goal | Targets | Focus |
|---|---|---|
| **Goal A** | 1–4 | Reduce threats to biodiversity |
| **Goal B** | 5–8 | Meet people's needs through sustainable use |
| **Goal C** | 9–12 | Tools and solutions for implementation |
| **Goal D** | 13–22 | Means of implementation and mainstreaming |

---

### 5.3 INDICATORS HIERARCHY

**What it shows:** Rwanda's full indicator monitoring framework, KM-GBF aligned.

#### 4-Tier Indicator System

| Tier | Purpose | Count |
|---|---|---|
| **Headline** | High-level metrics; one per national target; required for CBD reporting | ~25 |
| **Component** | Detailed implementation metrics; 2–4 per target | ~39 |
| **Binary** | Yes/No policy conditions (e.g., law adopted Y/N) | ~1 |
| **Complementary** | Contextual/socioeconomic background indicators | ~17 |

#### How to Use Indicators Page
- **Search bar** — find any indicator by name, definition, or responsible organisation
- **Tier filter buttons** — filter to show only Headline, Component, or Binary indicators
- **Goal filter** — filter by GBF Goal A, B, C, or D
- **Group by Target** toggle — reorganises indicators grouped under each NBSAP target
- **Click any indicator** — opens a detailed modal with:
  - Progress bar (green/amber/red)
  - Current value vs 2030 target
  - Baseline (2020)
  - Midterm 2027 target
  - Data source and reporting frequency
  - Responsible organisations
  - Link to the parent NBSAP target

---

### 5.4 REPORTING TOOLKIT (7 TOOLS)

**What it shows:** The primary data entry interface for all stakeholders.

The toolkit contains **7 structured tools**, each targeting a specific NBSAP reporting domain:

| Tool | Name | Key Data Collected |
|---|---|---|
| **T01** | National Institutional Reporting | Institution, reporting period, NBSAP target linkage, compliance score, policy progress |
| **T02** | Ecosystem & Habitat Monitoring | Forest ha, wetland ha, district, land cover change |
| **T03** | Protected Area Management | Area name, coverage ha, management effectiveness, illegal activity cases, restoration ha |
| **T04** | Human-Wildlife Conflict Monitoring | Incident type, district, species involved, HWC cases count, mitigation measures |
| **T05** | Finance & Resource Mobilisation | Budget allocated (RWF), budget disbursed, finance source, reporting period |
| **T06** | Private Sector EIA Compliance | Company name, EIA status (Full/Partial/Non-compliant), sector, restoration commitments |
| **T07** | Community Engagement & Social Inclusion | Community name, district, engagement type, participant count, traditional knowledge |

#### Submission Workflow
1. Select a tool from the left sidebar
2. Fill in all required fields (marked with *)
3. Upload supporting evidence (PDF, images, reports) if applicable
4. Link to the relevant NBSAP target and indicator
5. Submit — the report enters the **Verification Queue** automatically
6. A national administrator reviews and approves or rejects with notes
7. Upon approval, national metrics and target progress auto-update

> **Important:** All submissions must pass through the Verification Queue. No data directly affects national metrics until verified and approved by an authorised reviewer.

---

### 5.5 VERIFICATION QUEUE

**Who uses it:** Dashboard Management and Lead Government Ministry roles.

**What it does:** Acts as the quality gate for all incoming data before it becomes part of the national record.

#### Review Process
1. Incoming submissions appear with tool name, submitter, date, and linked target
2. Reviewer reads the submission and attached evidence
3. Two actions available:
   - ✅ **Approve** — data is accepted; national metrics auto-update via database triggers
   - ❌ **Reject** — submission is returned with a reviewer note explaining what needs to be corrected
4. The submitter receives feedback and can resubmit

#### Why Verification Matters
- Prevents incorrect data from corrupting national statistics
- Creates an auditable chain of custody for all biodiversity data
- Ensures data quality for CBD reporting requirements
- All decisions are logged in the Audit Log with timestamp and reviewer identity

---

### 5.6 REPORTS & ANALYTICS

**What it shows:** Deep analytical views of all submitted data.

#### Analytics Tabs
| Tab | Content |
|---|---|
| **Overview** | KPI cards: total reports, pending, approved, national progress % |
| **Progress Analysis** | Target-by-target progress charts, on-track vs at-risk breakdown |
| **Compliance** | Tool-by-tool compliance rates, approved vs pending by tool |
| **Submitter Analytics** | Per-user and per-institution submission statistics |
| **Timeline** | Chronological feed of all submissions with status |

#### Export Options
- **CSV Export** — download all report data as a spreadsheet
- **PDF Report** — generate a formatted national progress report for printing/sharing
- **AI Summary** — generate a Claude AI narrative from current analytics data

#### Key Metrics Tracked
- Overall national NBSAP progress (% average across 22 targets)
- Report submission rate by tool, district, and institution
- Approval rate and pending backlog
- Late submission tracking against reporting deadlines

---

### 5.7 COMPLIANCE MONITORING

**What it shows:** Outstanding compliance issues across all sectors and districts.

- Tracks cases where reporting obligations have not been met
- Severity levels: Critical, High, Medium, Low
- Assigns responsible parties and resolution deadlines
- Integrates with the audit log for full accountability

---

### 5.8 MAP VIEW

**What it shows:** Geographic visualisation of biodiversity data across Rwanda.

- All 30 districts displayed on an interactive map
- Hover over districts to see reporting status and submission counts
- Filter by tool type, date range, and reporting status
- Identifies geographic gaps in reporting coverage

---

### 5.9 USER MANAGEMENT

**Who uses it:** Dashboard Management (national administrator) only.

#### Functions
- **View all users** — see every registered account with role, organisation, last login
- **Invite new users** — send email invitations to new stakeholders
- **Suspend / activate accounts** — block or restore access
- **Role change requests** — district officers or partners can request role upgrades; administrators approve or reject
- **Audit log** — complete record of every action in the system: who did what, when, from which IP

---

### 5.10 SETTINGS

- **Profile settings** — update display name and preferences
- **Display preferences** — dark mode, compact sidebar, animation toggles
- **Auto-refresh** — configure how often the dashboard refreshes live data

---

## 6. COLOR PROGRESS METRIC SYSTEM

The entire system uses a **unified three-color progress metric** applied consistently on every page:

| Color | Threshold | Status | Meaning |
|---|---|---|---|
| 🟢 **Green** | ≥ 70% | **On Track** | Progress is sufficient to meet the 2030 target |
| 🟡 **Amber** | 40–69% | **At Risk** | Progress is lagging; intervention may be needed |
| 🔴 **Red** | < 40% | **Behind** | Significant risk of missing the 2030 target |

### Where Colors Appear
- Target progress bars on the Dashboard
- Target cards on the National Targets page
- Indicator cards in the hierarchy
- NBSAP Target Progress widget
- Indicator detail modals
- System metric tiles
- All reporting analytics charts

This consistent visual language means **any stakeholder — from a district officer to a Cabinet Minister — can immediately understand the national biodiversity situation at a glance**.

---

## 7. DATA FLOW — FROM SUBMISSION TO DASHBOARD

```
District Officer / Partner / Ministry
           │
           │  Fills in Reporting Toolkit (T01–T07)
           ▼
   Submission enters PENDING status
           │
           │  Appears in Verification Queue
           ▼
   National Administrator Reviews
      ├── REJECT → Submitter notified with reason
      │
      └── APPROVE
              │
              ▼
    Database Trigger fires automatically:
    ┌─────────────────────────────────────┐
    │  1. Update nbsap_targets.progress   │
    │  2. Update indicators.status        │
    │  3. Update system_metrics           │
    │  4. Write to audit_log              │
    └─────────────────────────────────────┘
              │
              ▼
    Dashboard auto-refreshes:
    • Metric cards update
    • Progress bars animate
    • Automated metrics recalculate
    • AI narrative can be regenerated
```

### Delete Reversal (Data Integrity)
If an approved report is later deleted, **database triggers automatically reverse all effects** — target progress decrements, indicator status recalculates, system metrics subtract — ensuring the national record is always accurate.

---

## 8. RWANDA NBSAP 2025–2030 TARGETS SUMMARY

| # | Goal | Target Summary | Timeline |
|---|---|---|---|
| 1 | A | Biodiversity-inclusive spatial land use planning | 2025–2030 |
| 2 | A | Restore ≥10% of degraded land and inland waters | 2024–2030 |
| 3 | A | Conserve ≥11% of terrestrial & inland water areas | 2025–2030 |
| 4 | A | Halt extinction of threatened species; manage HWC | 2025–2030 |
| 5 | B | Sustainable management of wild species; curb illegal harvesting | 2025–2030 |
| 6 | B | Reduce IAS establishment in PAs by 50% | 2025–2030 |
| 7 | B | Reduce pollution from agriculture, industry, mining | 2025–2030 |
| 8 | B | Climate resilience through nature-based solutions | 2025–2030 |
| 9 | C | Sustainable use of wild species; socio-economic benefits | 2025–2030 |
| 10 | C | Sustainable management of agriculture, aquaculture, forestry | 2025–2030 |
| 11 | C | Restore and enhance ecosystem services via NbS | 2025–2030 |
| 12 | C | Biodiversity-inclusive urban planning and green spaces | 2025–2030 |
| 13 | D | Fair and equitable ABS for genetic resources and TK | 2025–2030 |
| 14 | D | Biodiversity integrated in all policies and governance | 2025–2030 |
| 15 | D | Business biodiversity risk disclosure | 2025–2030 |
| 16 | D | Sustainable consumption and production | 2025–2030 |
| 17 | D | Biosafety measures and sustainable biotechnology | 2025–2030 |
| 18 | D | Redirect harmful subsidies; scale positive incentives | 2025–2030 |
| 19 | D | Mobilise USD 500 million for biodiversity finance | 2025–2030 |
| 20 | D | Capacity-building, technology transfer, communication | 2025–2030 |
| 21 | D | Biodiversity data accessible and utilised (RBIS) | 2025–2030 |
| 22 | D | Inclusive participation of women, youth, PWDs | 2025–2030 |

---

## 9. KM-GBF INDICATOR FRAMEWORK

Rwanda's monitoring framework follows the **three-tier KM-GBF indicator structure**:

### Tier 1 — Headline Indicators
- One per national target
- High-level, internationally comparable
- Required for CBD national reporting
- Example: *"% of land/water under biodiversity-inclusive spatial plans"*

### Tier 2 — Component Indicators
- 2–4 per target
- Provide detailed evidence on specific implementation aspects
- Support adaptive management decisions
- Example: *"Area (ha) of Key Biodiversity Areas effectively conserved"*

### Tier 3 — Binary Indicators
- Yes/No assessments of legal or policy conditions
- Example: *"National legislation for IAS adopted (Y/N)"*

### Complementary Indicators
- Contextual socioeconomic and governance metrics
- Help interpret headline and component indicator results

---

## 10. SECURITY & DATA INTEGRITY

| Feature | Implementation |
|---|---|
| **Authentication** | Supabase Auth with JWT tokens; secure email/password |
| **Row-Level Security** | PostgreSQL RLS policies — users only access data they own or are permitted to see |
| **Audit Trail** | Every create, read, update, delete action is logged with user ID, timestamp, and action detail |
| **Verification Gate** | No data affects national metrics until reviewed and approved |
| **Delete Reversal** | Database triggers reverse all metric effects when a report is deleted |
| **Account Suspension** | Administrators can instantly block compromised or inactive accounts |
| **HTTPS** | All data in transit encrypted via TLS |
| **Password Reset** | Secure email-based reset flow via Supabase Auth |

---

## 11. PANEL PRESENTATION SCRIPT

*Use the following as a guide for your live demonstration. Adapt freely.*

---

### OPENING (2 minutes)

> "Good [morning/afternoon]. Thank you for the opportunity to present Rwanda's National Biodiversity Monitoring Dashboard — a purpose-built digital platform that operationalises Rwanda's commitments under the NBSAP 2025–2030 and the Kunming-Montreal Global Biodiversity Framework.
>
> What I will show you today is not a prototype. This is a **live, production system**, currently accessible at nbsap-dashboard-rw.vercel.app, with real data, real user accounts, and real automated tracking of our 22 national biodiversity targets."

---

### THE PROBLEM THIS SOLVES (2 minutes)

> "Before this system, Rwanda's biodiversity monitoring happened in silos. Ministries maintained their own spreadsheets. There was no single source of truth. There was no verification process. When the time came to report to the CBD Secretariat, compiling data was a weeks-long manual exercise with high risk of error.
>
> This dashboard changes that entirely. Every piece of biodiversity data — from a district forest restoration report to a private sector EIA compliance submission — flows into one place, gets verified, and immediately updates our national indicators."

---

### LIVE DEMONSTRATION (10–15 minutes)

**Step 1 — Dashboard (2 min)**
> "This is the national executive view. At a glance, you can see we are tracking 22 targets across 30 districts. The green-amber-red color system tells us immediately which indicators are on track, which are at risk, and which are behind schedule. These metrics update automatically whenever a new report is approved — no manual input required."

**Step 2 — National Targets (3 min)**
> "Let me open one of our targets — for example, Target 3 on Protected Areas. You can see the full Rwanda-specific target statement, the current baseline — 9.1% of land area under protected status — our phased implementation timeline from 2025 to 2030, and the live progress bar showing where we are today. The indicators linked to this target update in real time as field data comes in."

**Step 3 — Reporting Toolkit (3 min)**
> "Now I will show you how data enters the system. A District Reporting Officer, for example, would select Tool T02 — Ecosystem and Habitat Monitoring — and fill in the hectares of forest or wetland restored in their district, attach photographic or GPS evidence, link it to the relevant target and indicator, and submit. That submission immediately enters the verification queue."

**Step 4 — Verification Queue (2 min)**
> "Here is the verification queue. The national administrator reviews the submission, checks the evidence, and either approves or rejects with a written note. The moment they click Approve, our database triggers fire — the target progress bar updates, the indicator status recalculates, the system metrics increment. Everything is automatic."

**Step 5 — Indicators Hierarchy (2 min)**
> "Our indicator framework follows the three-tier KM-GBF structure — Headline, Component, and Binary indicators. Each indicator shows its current value, 2030 target, progress bar in green or amber or red, and the responsible organisation. This is exactly the format required for CBD national reporting."

**Step 6 — AI Narrative (1 min)**
> "Finally, let me show you the AI feature. With one click, the system generates an evidence-based biodiversity progress narrative using the Claude AI — summarising our current situation, identifying risks, and recommending priority actions. This can be used directly for ministerial briefings or donor reporting."

---

### CLOSING (2 minutes)

> "In summary, this system delivers:
> - A unified, real-time view of all 22 Rwanda NBSAP targets
> - A structured, verified reporting workflow for all 30 districts and all partner institutions
> - Automated metrics that eliminate manual calculation errors
> - A complete audit trail for full accountability
> - An internationally aligned indicator framework for CBD reporting
>
> Rwanda now has the infrastructure to not only meet its 2030 biodiversity commitments, but to demonstrate, with evidence, that it is meeting them.
>
> I am happy to take your questions."

---

## 12. ANTICIPATED PANEL QUESTIONS & ANSWERS

---

**Q: How do you ensure the data entered is accurate and not fabricated?**

> A: The system has a mandatory **Verification Queue** — no data affects any national metric until a designated administrator reviews it and approves it. Every approval is logged with the reviewer's identity and timestamp. Additionally, submitters are required to upload supporting evidence files. The audit log records every action in the system, creating a complete accountability chain.

---

**Q: Who has access to this system and how is it secured?**

> A: Access is strictly role-based. There are five roles — from District Reporting Officers who can only submit data for their district, to the national administrator who has full oversight. The database uses Row-Level Security at the PostgreSQL level, meaning even if someone obtained another user's credentials, they could only see what their role permits. All data is encrypted in transit using HTTPS/TLS.

---

**Q: What happens if incorrect data is approved by mistake?**

> A: Reports can be deleted by an administrator. When a report is deleted, the system automatically reverses all metric changes that report had caused — target progress decrements, indicators recalculate, system metrics subtract. No manual correction is needed. This is handled by database triggers.

---

**Q: Is this aligned with CBD reporting requirements?**

> A: Yes. The indicator framework follows the official KM-GBF three-tier structure — Headline, Component, and Binary indicators — as specified by the CBD Subsidiary Body on Scientific, Technical and Technological Advice (SBSTTA). The 22 targets are Rwanda's nationally-determined adaptations of the 23 global KM-GBF targets. Data collected here can be directly exported for Rwanda's next National Report to the CBD.

---

**Q: How do the 30 districts use the system?**

> A: Each district is assigned one or more District Reporting Officers with accounts on the platform. They use the 7 reporting tools to submit field data — forest monitoring, protected area management, HWC incidents, community engagement activities, and so on. Their submissions are automatically linked to their district and to the relevant national target, giving us geographic coverage across all of Rwanda.

---

**Q: What happens after 2030 — can the system be updated for the next NBSAP cycle?**

> A: Yes. The system is built on modular architecture. Targets, indicators, tools, and metrics are all database-driven — not hardcoded. For the next NBSAP cycle (post-2030), administrators can add new targets, update indicator definitions, and configure new reporting tools without rebuilding the platform. It is designed for long-term use.

---

**Q: What is the cost of running this system?**

> A: The system runs on Vercel (frontend hosting) and Supabase (backend infrastructure), both of which have generous free tiers suitable for national-scale use. At scale, annual costs are estimated in the range of a few hundred USD per year — a fraction of the cost of traditional government IT infrastructure.

---

**Q: Can the public access this data?**

> A: Yes. The Public Viewer role allows anyone to access the dashboard, national targets, and indicators without logging in. Sensitive administrative data (user management, audit logs, raw submissions) remain restricted to authorised roles. This supports Rwanda's commitment to open biodiversity data as required under KM-GBF Target 21.

---

**Q: How does the AI narrative feature work? Is it reliable?**

> A: The AI narrative is generated by Anthropic's Claude API — the same AI used by international organisations and Fortune 500 companies. It receives the actual live dashboard data as input and generates a contextualised summary. It is a decision-support tool, not a decision-making tool. All narrative text is clearly labelled as AI-generated, and the underlying data it describes is verifiable in the system itself.

---

*End of Manual*

---

**Document prepared for:** Rwanda NBSAP 2025–2030 Monitoring Dashboard panel presentation  
**System:** https://nbsap-dashboard-rw.vercel.app  
**Prepared by:** NBSAP Dashboard Development Team
