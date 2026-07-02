# NBSAP Monitoring System — Rwanda

> National Biodiversity Strategy & Action Plan 2025–2030
> Full-stack React + Supabase with Role-Based Access Control

**Live:** [nbsap-dashboard-rw.vercel.app](https://nbsap-dashboard-rw.vercel.app)

---

## Project Structure

```
nbsap-monitoring-system/
├── src/
│   ├── components/
│   │   ├── App.tsx                    # React Router v6 with lazy-loaded routes
│   │   ├── AuthPage.tsx               # Login / Signup / Password reset (PKCE)
│   │   ├── ProtectedRoute.tsx         # RBAC route guard
│   │   ├── DashboardLayout.tsx        # Sidebar + topbar
│   │   ├── map/                       # Map layer components
│   │   └── panels/                    # Shared panel components
│   ├── pages/
│   │   ├── DashboardPage.tsx          # Main analytics dashboard
│   │   ├── IndicatorsPage.tsx         # 79 biodiversity indicators
│   │   ├── NationalTargetsPage.tsx    # 22 NBSAP targets
│   │   ├── ReportingToolkitPage.tsx   # T01–T07 report submissions
│   │   ├── VerifQueuePage.tsx         # Report verification queue
│   │   ├── MapPage.tsx                # GIS map with districts, protected areas
│   │   ├── BiodiversityDataPage.tsx   # RBIS/GBIF biodiversity data
│   │   ├── ReportsPage.tsx            # Analytics and exports
│   │   ├── CompliancePage.tsx         # EIA compliance tracking
│   │   ├── RiskPage.tsx               # Risk register
│   │   ├── AdaptiveManagementPage.tsx # Adaptive management
│   │   ├── StakeholdersPage.tsx       # Stakeholder mapping
│   │   ├── UserManagementPage.tsx     # User admin (REMA admin only)
│   │   ├── RoleRequestsPage.tsx       # Role change approvals
│   │   └── SettingsPage.tsx           # User preferences
│   ├── services/
│   │   ├── AuthContext.tsx            # Global auth state + password recovery
│   │   ├── authService.ts            # Login, signup, password reset
│   │   ├── reportService.ts          # Report CRUD + CSV/JSON export/import
│   │   ├── dataService.ts            # Indicators, risks, audit log, notifications
│   │   ├── roleChangeService.ts      # Role change approval workflow
│   │   ├── rbisService.ts            # RBIS API integration
│   │   ├── progressCalculator.ts     # Tool-weighted progress calculations
│   │   └── systemMetricsService.ts   # Dashboard metrics aggregation
│   ├── hooks/
│   │   ├── useData.ts                # useReports, useDashboardStats, etc.
│   │   ├── useBiodiversityData.ts    # Biodiversity data hooks
│   │   ├── useGBIF.ts                # GBIF species occurrence data
│   │   ├── useMapLayers.ts           # Map layer management
│   │   └── useLiveTargetProgress.ts  # Real-time target progress
│   └── utils/
│       ├── supabase.ts               # Supabase client (PKCE auth)
│       ├── progressColors.ts         # Green/amber/red status colors
│       └── geoUtils.ts               # Geographic utilities
├── migrations/                        # 22 SQL migrations (001–022)
├── docs/                              # System documentation
│   └── pdf/                           # PDF exports of all docs
├── vercel.json                        # Deployment config + security headers
├── vite.config.ts
└── tsconfig.json
```

---

## User Roles & Permissions

| Role                   | Label           | Submit | Approve | Verif Queue | Audit Log | User Mgmt |
| ---------------------- | --------------- | ------ | ------- | ----------- | --------- | --------- |
| `policy_monitoring`    | Policy Monitor  | —      | —       | —           | —         | —         |
| `sector_reporting`     | Sector Reporter | Yes    | Yes     | —           | —         | —         |
| `local_reporting`      | Local Reporter  | Yes    | —       | —           | —         | —         |
| `dashboard_management` | REMA Admin      | Yes    | Yes     | Yes         | Yes       | Yes       |
| `programme_alignment`  | Dev. Partner    | —      | —       | —           | —         | —         |

---

## Setup

### 1. Install & Configure

```bash
git clone https://github.com/josephkaranga/Monitoring-Dashboard-RW.git
cd Monitoring-Dashboard-RW
npm install

# Create .env with your Supabase credentials
```

Required environment variables:

| Variable                 | Required | Description              |
| ------------------------ | -------- | ------------------------ |
| `VITE_SUPABASE_URL`      | Yes      | Supabase project URL     |
| `VITE_SUPABASE_ANON_KEY` | Yes      | Public anon key          |
| `VITE_APP_URL`           | Yes      | Deployed app URL         |
| `VITE_ENABLE_REALTIME`   | No       | Toggle Supabase Realtime |

### 2. Run Database Migrations

In Supabase SQL Editor, run migrations `001` through `022` in order from the `migrations/` folder.

### 3. Configure Authentication

In Supabase Dashboard → Authentication → URL Configuration:

- **Site URL:** `https://nbsap-dashboard-rw.vercel.app`
- **Redirect URLs:** `https://nbsap-dashboard-rw.vercel.app/auth`

### 4. Create First Admin User

Sign up via the app, then promote yourself in SQL Editor:

```sql
UPDATE public.profiles
SET role = 'dashboard_management'
WHERE email = 'your@email.com';
```

### 5. Run Development Server

```bash
npm run dev
```

---

## Architecture

### Authentication (PKCE)

Uses Supabase Auth with PKCE flow — password reset links contain only a short-lived code, not raw tokens. `AuthContext.tsx` handles all auth events including `PASSWORD_RECOVERY` for the reset flow.

### Row Level Security

Every table has RLS enabled. The database enforces permissions via SQL functions:

- `get_user_role()` — returns current user's role
- `can_write()` — true for reporters and admin
- `is_admin()` — true only for `dashboard_management`

### Tool-Weighted Progress

Report approvals automatically update NBSAP target progress using tool-specific weights (T01=0.25, T02=0.20, etc.) via database triggers. Progress is reversed when reports are deleted.

### Realtime

`subscribeToReports()` and `subscribeToNotifications()` use Supabase Realtime (WebSockets) for live dashboard updates without polling.

### Code Splitting

`App.tsx` uses `React.lazy()` for all pages. Vite splits the bundle into vendor, supabase, and charts chunks.

---

## Database Tables

| Table                  | Purpose                       | RLS                           |
| ---------------------- | ----------------------------- | ----------------------------- |
| `profiles`             | User accounts + roles         | Own row; admin sees all       |
| `nbsap_targets`        | 22 NBSAP targets              | Read: all; Write: admin       |
| `indicators`           | 79 biodiversity indicators    | Read: all; Write: reporters   |
| `toolkit_reports`      | T01–T07 submissions           | Scoped by role                |
| `tool_weights`         | Tool weight factors (T01–T07) | Read: all; Write: admin       |
| `districts`            | 30 districts + coordinates    | Read: all; Write: local/admin |
| `provinces`            | 5 provinces                   | Read: all                     |
| `risks`                | Risk register                 | Read: all; Write: admin       |
| `compliance_records`   | EIA compliance issues         | Read: all; Write: reporters   |
| `role_change_requests` | Role change approval workflow | Scoped by role                |
| `system_metrics`       | Aggregated dashboard metrics  | Read: all; Write: triggers    |
| `notifications`        | Per-user alerts               | Own row only                  |
| `audit_log`            | Activity history              | Own rows; admin sees all      |
| `user_settings`        | Dashboard preferences         | Own row only                  |

---

## Reporting Tools

| Tool | Name                              | Weight |
| ---- | --------------------------------- | ------ |
| T01  | National Institutional Reporting  | 0.250  |
| T02  | District Biodiversity Monitoring  | 0.200  |
| T03  | Protected Area Monitoring         | 0.150  |
| T04  | Community Biodiversity Monitoring | 0.150  |
| T05  | Biodiversity Finance Tracking     | 0.100  |
| T06  | Private Sector Compliance         | 0.100  |
| T07  | Research & Academic Contribution  | 0.050  |

---

## Deployment

Deployed on **Vercel** with automatic deploys from the `main` branch. Security headers (CSP, X-Frame-Options, etc.) are configured in `vercel.json`.
