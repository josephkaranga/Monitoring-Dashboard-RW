# User Roles and Permissions Document
# Rwanda NBSAP Monitoring Dashboard 2025–2030

**Prepared for:** Rwanda Environment Management Authority (REMA)
**Document Reference:** NBSAP-URP-2026-007
**Version:** 1.0
**Date:** June 2026
**Classification:** Official — Government Use

---

## Document Control

| Field | Value |
|---|---|
| **Document Title** | User Roles and Permissions |
| **Project** | Rwanda NBSAP Monitoring Dashboard |
| **Prepared by** | NBSAP Dashboard Development Team |
| **Approved by** | REMA — Department of Biodiversity & Landscape Management |
| **Status** | Final |

---

## 1. Overview

The NBSAP Monitoring Dashboard enforces a **6-tier role-based access control (RBAC)** model. Each user is assigned exactly one role that determines which pages they can access, which actions they can perform, and which data they can view. Access control is enforced at two levels:

1. **Client-side** — Protected routes check the user's role before rendering pages
2. **Server-side** — PostgreSQL Row-Level Security (RLS) policies enforce data access at the database level, preventing bypass via direct API calls

---

## 2. Role Definitions

### 2.1 REMA Administrator (`dashboard_management`)

| Attribute | Value |
|---|---|
| **Label** | REMA Administrator |
| **Typical Users** | REMA national team, system administrators |
| **Description** | Full system access: verification queue, user management, audit log, all exports |
| **User Count** | 2–5 |

**Responsibilities:**
- Manage all user accounts (create, suspend, deactivate, change roles)
- Review and approve/reject all submitted reports in the verification queue
- Access and audit the immutable system audit log
- Export raw data in all formats (CSV, PDF, JSON)
- Configure system settings and tool weights
- Monitor system health and data pipeline status
- Prepare data exports for CBD National Reporting

---

### 2.2 Lead Government Ministry Reporter (`lead_government_ministry_reporting`)

| Attribute | Value |
|---|---|
| **Label** | Lead Government Ministry Reporter |
| **Typical Users** | Ministry focal points, sector ministry officers |
| **Description** | Submit reports via T01–T07, verify submissions, access analytics |
| **User Count** | 10–20 |

**Responsibilities:**
- Submit biodiversity data via all 7 reporting tools (T01–T07)
- Review and approve/reject reports in the verification queue
- Access analytics and reporting dashboards
- View the risk register and compliance tracking
- Export data for sector-level analysis

---

### 2.3 District Reporting Officer (`local_reporting`)

| Attribute | Value |
|---|---|
| **Label** | Local Reporter |
| **Typical Users** | District environmental officers (30 districts) |
| **Description** | Enter and validate district-level biodiversity monitoring data |
| **User Count** | 30–60 |

**Responsibilities:**
- Submit reports for their assigned district
- View their own submission history and status
- Access compliance tracking for their district
- View national dashboards and targets (read-only)

---

### 2.4 Policy Monitor (`policy_monitoring`)

| Attribute | Value |
|---|---|
| **Label** | Policy Monitor |
| **Typical Users** | National policymakers, Cabinet-level advisors, MoE oversight |
| **Description** | Read-only access to strategic dashboards and national progress summaries |
| **User Count** | 5–15 |

**Responsibilities:**
- View executive dashboards and national progress
- Monitor the risk register
- Access compliance tracking summaries
- View analytics and trend data
- No data entry or modification capability

---

### 2.5 Development Partner (`programme_alignment`)

| Attribute | Value |
|---|---|
| **Label** | Development Partner |
| **Typical Users** | NGOs, research institutions, private sector partners, donors |
| **Description** | Analytical viewing access for programme alignment and donor reporting |
| **User Count** | 10–30 |

**Responsibilities:**
- View analytical dashboards for programme alignment
- Access the risk register and compliance data
- View indicator and target progress
- No data entry, export, or modification capability

---

### 2.6 Public Viewer (`public_viewer`)

| Attribute | Value |
|---|---|
| **Label** | Public Viewer |
| **Typical Users** | General public, media, academic researchers, civil society |
| **Description** | External read-only access to view dashboards, reports, indicators, and maps |
| **User Count** | Unlimited |

**Responsibilities:**
- View public-facing dashboards
- View national targets and indicator progress
- View the interactive map
- No access to verification queue, audit log, user management, or raw exports

---

## 3. Permissions Matrix

### 3.1 Feature-Level Permissions

| Permission | REMA Admin | Ministry Reporter | District Officer | Policy Monitor | Dev Partner | Public Viewer |
|---|---|---|---|---|---|---|
| **Submit Reports (T01–T07)** | Yes | Yes | Yes | No | No | No |
| **Approve/Reject Reports** | Yes | Yes | No | No | No | No |
| **View Verification Queue** | Yes | Yes | No | No | No | No |
| **View Audit Log** | Yes | No | No | No | No | No |
| **Manage Users** | Yes | No | No | No | No | No |
| **Export Raw Data** | Yes | Yes | No | No | No | No |
| **View Risk Register** | Yes | Yes | No | Yes | Yes | No |
| **View Compliance** | Yes | Yes | Yes | Yes | Yes | No |
| **View Analytics** | Yes | Yes | No | Yes | Yes | No |

### 3.2 Page-Level Access

| Page | REMA Admin | Ministry Reporter | District Officer | Policy Monitor | Dev Partner | Public Viewer |
|---|---|---|---|---|---|---|
| **Dashboard** | Full | Full | Full | Full | Full | View |
| **National Targets** | Full | View | View | View | View | View |
| **Indicators** | Full | View | View | View | View | View |
| **Interactive Map** | Full | Full | Full | Full | Full | View |
| **Reporting Toolkit** | Full | Submit | Submit | No | No | No |
| **Verification Queue** | Full | Review | No | No | No | No |
| **Reports & Analytics** | Full | View | No | View | View | No |
| **RBIS Dashboard** | Full | View | View | View | View | View |
| **Compliance** | Full | View | View | View | View | No |
| **Risk Register** | Full | View | No | View | View | No |
| **Stakeholders** | Full | No | No | No | No | No |
| **Data Pipeline** | Full | No | No | No | No | No |
| **User Management** | Full | No | No | No | No | No |
| **Role Requests** | Full | No | No | No | No | No |
| **Settings** | Own | Own | Own | Own | Own | Own |
| **Adaptive Management** | Full | View | No | View | No | No |

---

## 4. Account Lifecycle

### 4.1 Account States

```
┌──────────┐     Admin assigns     ┌──────────┐
│  New     │────── role ──────────▶│  Active  │
│ (Default │                       │          │
│  role:   │                       │  Normal  │
│  Policy  │                       │  access  │
│  Monitor)│                       └────┬─────┘
└──────────┘                            │
                                        │
                          ┌─────────────┼─────────────┐
                          │             │             │
                          ▼             ▼             ▼
                   ┌──────────┐  ┌──────────┐  ┌──────────┐
                   │Suspended │  │Deactivated│  │  Role    │
                   │          │  │           │  │ Changed  │
                   │ Temporary│  │ Permanent │  │          │
                   │ lockout  │  │ lockout   │  │ Workflow │
                   │          │  │           │  │ approved │
                   └────┬─────┘  └──────────┘  └──────────┘
                        │
                        │ End date passes
                        ▼
                   ┌──────────┐
                   │  Active  │
                   │ (Auto-   │
                   │  reactivated)
                   └──────────┘
```

### 4.2 Account Status Definitions

| Status | Can Login | Description |
|---|---|---|
| **Active** | Yes | Normal operational status |
| **Suspended** | No | Temporary lockout with reason; auto-reactivates if end date set |
| **Suspended (Expired)** | Yes | Suspension end date has passed; auto-reactivation pending |
| **Deactivated** | No | Permanent lockout; requires admin to reactivate |

### 4.3 Suspension Controls

| Action | Who Can Do It | Requirements |
|---|---|---|
| **Suspend account** | REMA Administrator | Must provide reason; optional end date |
| **Set suspension end date** | REMA Administrator | Date in the future |
| **Auto-reactivate** | System | Triggers when suspension end date passes |
| **Deactivate account** | REMA Administrator | Permanent; overrides suspension |
| **Reactivate account** | REMA Administrator | Manual action required |

---

## 5. Role Change Workflow

### 5.1 Process Flow

```
User requests role change
    │
    ├── Selects desired role
    ├── Provides written justification
    └── Request status: PENDING
         │
         ▼
REMA Administrator reviews request
    │
    ├── APPROVE
    │    ├── User role updated immediately
    │    ├── Notification sent to user
    │    └── Audit log entry created
    │
    └── REJECT
         ├── Rejection reason recorded
         ├── Notification sent to user
         └── Audit log entry created
```

### 5.2 Role Change Constraints

| Constraint | Rule |
|---|---|
| Only REMA Administrators can approve role changes | Enforced by RBAC |
| Users cannot approve their own role change | System validation |
| All role changes are logged in the audit trail | Automatic trigger |
| Role changes take effect immediately upon approval | Database trigger |
| Previous role is recorded for audit purposes | Stored in request record |

---

## 6. Data Access Controls (Row-Level Security)

### 6.1 Database-Level Enforcement

| Data | REMA Admin | Ministry Reporter | District Officer | Policy Monitor | Dev Partner | Public Viewer |
|---|---|---|---|---|---|---|
| **All user profiles** | Read/Write | Own only | Own only | Own only | Own only | Own only |
| **All reports** | Read/Write/Delete | Read own + review all | Read own | No | No | No |
| **Indicators** | Read/Write | Read | Read | Read | Read | Read |
| **Targets** | Read/Write | Read | Read | Read | Read | Read |
| **Audit log** | Read | No | No | No | No | No |
| **Notifications** | Own | Own | Own | Own | Own | Own |
| **Risk register** | Read/Write | Read | No | Read | Read | No |
| **Compliance records** | Read/Write | Read | Read | Read | Read | No |

### 6.2 Security Enforcement Stack

```
Layer 1: Client-Side Route Guards
    │  ProtectedRoute component checks user.role
    │  Prevents rendering unauthorised pages
    │
Layer 2: Supabase Client (API Layer)
    │  JWT token includes user identity
    │  Every API call authenticated
    │
Layer 3: PostgreSQL Row-Level Security
    │  RLS policies evaluate auth.uid() and user role
    │  Database refuses unauthorised data access
    │  Cannot be bypassed via direct API calls
```

---

## 7. Default Role Assignment

| Scenario | Default Role | Rationale |
|---|---|---|
| New user registration | `policy_monitoring` (Policy Monitor) | Safest default — read-only access |
| REMA designates administrator | `dashboard_management` | Manual assignment by existing admin |
| Ministry focal point onboarded | `lead_government_ministry_reporting` | Admin assigns after institutional verification |
| District officer onboarded | `local_reporting` | Admin assigns after district verification |
| Development partner registered | `programme_alignment` | Admin assigns after partner verification |
| Public access requested | `public_viewer` | Admin assigns or self-service |

---

## 8. Audit & Accountability

### 8.1 Actions Logged

| Action Category | Example Actions | Logged Fields |
|---|---|---|
| **Authentication** | Login, logout, session refresh | User ID, timestamp, IP address |
| **Data Submission** | Report submitted (T01–T07) | User ID, tool type, district, timestamp |
| **Verification** | Report approved, report rejected | Reviewer ID, report ID, decision, reason |
| **User Management** | Role change, suspension, deactivation | Admin ID, target user, old/new state |
| **Data Export** | CSV/PDF/JSON export | User ID, export scope, timestamp |
| **System Access** | Page views for sensitive pages | User ID, page, timestamp |

### 8.2 Audit Log Retention

| Attribute | Value |
|---|---|
| **Retention Period** | Indefinite (append-only, never deleted) |
| **Access** | REMA Administrators only |
| **Immutability** | No UPDATE or DELETE operations permitted |
| **Fields** | User ID, action type, action description, detail, role at time of action, IP address, timestamp |

---

## 9. Institutional Mapping

| Institution | Recommended Role | Typical Users |
|---|---|---|
| **REMA** | REMA Administrator | Biodiversity department staff, IT team |
| **Ministry of Environment** | Lead Government Ministry Reporter / Policy Monitor | Focal points, senior advisors |
| **Ministry of Agriculture** | Lead Government Ministry Reporter | Sector reporting officers |
| **Ministry of Lands** | Lead Government Ministry Reporter | Land use reporting officers |
| **Rwanda Development Board** | Lead Government Ministry Reporter | Tourism & conservation officers |
| **District Local Government** | District Reporting Officer | Environmental officers (30 districts) |
| **UNDP / GIZ / USAID** | Development Partner | Programme managers, analysts |
| **University of Rwanda** | Development Partner | Research faculty, RBIS team |
| **Private Sector / CSOs** | Development Partner or Public Viewer | EIA compliance officers, NGO staff |
| **General Public** | Public Viewer | Citizens, journalists, researchers |

---

*Prepared by: NBSAP Dashboard Development Team*
*Document Reference: NBSAP-URP-2026-007*
*Rwanda Environment Management Authority (REMA)*
