# NBSAP Monitoring System — Rwanda
## Supabase Backend Integration Guide

> National Biodiversity Strategy & Action Plan 2025–2030  
> Full-stack React + Supabase with Role-Based Access Control

---

## Project Structure

```
nbsap-monitoring-system/
├── src/
│   ├── types/
│   │   └── index.ts              # All TypeScript types + RBAC permission maps
│   ├── services/
│   │   ├── supabase.ts           # Supabase client singleton
│   │   ├── authService.ts        # Login, signup, password reset, user management
│   │   ├── reportService.ts      # Toolkit report CRUD + CSV/JSON export/import
│   │   └── dataService.ts        # Indicators, risks, audit log, notifications, realtime
│   ├── context/
│   │   └── AuthContext.tsx       # Global auth state via React Context + useReducer
│   ├── hooks/
│   │   └── useData.ts            # Custom hooks: useReports, useDashboardStats, etc.
│   ├── components/
│   │   ├── auth/
│   │   │   ├── AuthPage.tsx      # Login / Signup / Password reset
│   │   │   └── ProtectedRoute.tsx # RBAC route guard
│   │   ├── layout/
│   │   │   └── DashboardLayout.tsx # Sidebar + topbar with auth-aware nav
│   │   └── dashboard/
│   │       ├── DashboardPage.tsx
│   │       ├── IndicatorsPage.tsx
│   │       ├── ReportingToolkitPage.tsx
│   │       ├── VerifQueuePage.tsx
│   │       ├── CompliancePage.tsx
│   │       ├── RiskPage.tsx
│   │       ├── MapPage.tsx
│   │       ├── ReportsPage.tsx
│   │       ├── SettingsPage.tsx
│   │       └── UserManagementPage.tsx
│   ├── utils/
│   │   └── aiNarrative.ts        # Claude API integration for AI narratives
│   ├── App.tsx                   # React Router v6 with protected routes
│   └── main.tsx                  # Entry point
├── supabase/migrations/
│   ├── 001_initial_schema.sql    # Full schema: tables, RLS, triggers, functions
│   └── 002_seed_data.sql         # Risk register, targets, indicators, compliance seed
├── .env.example                  # Environment variables template
├── vercel.json                   # Vercel deployment config with security headers
├── vite.config.ts
└── tsconfig.json
```

---

## User Roles & Permissions

| Role | Label | Can Submit | Can Approve | Verif Queue | Audit Log | User Mgmt | Raw Export |
|------|-------|-----------|------------|-------------|-----------|-----------|------------|
| `policy_monitoring` | Policy Monitor | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `sector_reporting` | Sector Reporter | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| `local_reporting` | Local Reporter | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `dashboard_management` | REMA Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `programme_alignment` | Dev. Partner | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 

### 2. Run Database Migrations

In the Supabase SQL Editor, run these files **in order**:

```sql
-- First: core schema, RLS policies, triggers
-- Paste contents of: supabase/migrations/001_initial_schema.sql

-- Second: seed data (risks, targets, indicators)
-- Paste contents of: supabase/migrations/002_seed_data.sql
```

### 3. Configure Authentication

In Supabase Dashboard → Authentication → Settings:
- Enable **Email provider**
- Set **Site URL** to your Vercel URL (e.g. `https://nbsap.vercel.app`)
- Add redirect URL: `https://nbsap.vercel.app/auth/reset-password`

### 4. Set Up Storage (for file attachments)

In Supabase Dashboard → Storage:
- The buckets `report-attachments` and `exports` are created by the migration
- Verify they appear with correct policies

### 5. Create First Admin User

After deployment, sign up normally via the app, then run this SQL to make yourself admin:

```sql
UPDATE public.profiles
SET role = 'dashboard_management'
WHERE email = 'your@email.com';
```

### 6. Local Development Setup

```bash
# Clone and install
git clone <your-repo>
cd nbsap-monitoring-system
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Supabase URL and anon key

# Run development server
npm run dev
```

###

## Key Architecture Decisions

### localStorage → Supabase Database

| Old (localStorage) | New (Supabase) |
|-------------------|----------------|
| `tkData` array | `toolkit_reports` table |
| Settings object | `user_settings` table |
| Notification prefs | `notification_preferences` table |
| Audit events | `audit_log` table |
| Notifications list | `notifications` table |

### Row Level Security (RLS)

Every table has RLS enabled. The database enforces permissions via SQL functions:
- `get_user_role()` — returns current user's role
- `can_write()` — true for sector/local/admin reporters
- `is_admin()` — true only for `dashboard_management`

This means even if someone bypasses the frontend, the database rejects unauthorised operations.

### Realtime

`subscribeToReports()` and `subscribeToNotifications()` use Supabase Realtime (WebSockets) so the dashboard updates live when any user submits or approves a report — no polling needed.

### Session Management

`AuthContext.tsx` listens to `supabase.auth.onAuthStateChange` and handles:
- `SIGNED_IN` → loads profile + settings
- `TOKEN_REFRESHED` → silent refresh
- `SIGNED_OUT` → clears all state
- `USER_UPDATED` → reloads profile

JWT tokens are auto-refreshed by the Supabase client every hour.

### Code Splitting

`App.tsx` uses `React.lazy()` for all page components. Vite splits the bundle into:
- `vendor` chunk — React, React Router
- `supabase` chunk — Supabase JS client
- `charts` chunk — Chart.js

---

## Adding New Indicator Data

To seed all 79 indicators, extend `002_seed_data.sql` following the same pattern:

```sql
INSERT INTO public.indicators 
(name, definition, tier, nbsap_target_id, target_2030, baseline, midterm, final_target, current_value, progress, status, km_gbf, periodicity, data_source, responsible)
VALUES (
  'Your Indicator Name',
  'Definition text',
  'headline',   -- headline | component | complementary | binary
  1,            -- nbsap_target_id (1-22)
  'Target by 2030',
  'Baseline value',
  'Midterm 2027',
  'Final 2030',
  'Current value',
  45,           -- progress 0-100
  'at-risk',    -- on-track | at-risk | behind
  'GBF Target X',
  'Annual',
  'Data source description',
  ARRAY['REMA', 'MINAGRI']
);
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Public anon key (safe for browser) |
| `VITE_APP_ENV` | ❌ | `development` / `production` |
| `VITE_ENABLE_AI_NARRATIVE` | ❌ | Toggle Claude API integration |
| `VITE_ENABLE_REALTIME` | ❌ | Toggle Supabase Realtime |

**Never use `SUPABASE_SERVICE_ROLE_KEY` in the browser.** Service role keys bypass RLS and should only be used in secure server-side functions.

---

## Database Tables Quick Reference

| Table | Purpose | RLS |
|-------|---------|-----|
| `profiles` | User accounts + roles | Own row only; admin sees all |
| `nbsap_targets` | 22 NBSAP targets | Read: all; Write: admin |
| `indicators` | 79 biodiversity indicators | Read: all; Write: reporters |
| `toolkit_reports` | T01–T07 submissions | Scoped by role |
| `districts` | 30 districts + status | Read: all; Write: local/admin |
| `provinces` | 5 provinces | Read: all |
| `risks` | Risk register | Read: all; Write: admin |
| `compliance_records` | Active issues | Read: all; Write: reporters |
| `notifications` | Per-user alerts | Own row only |
| `notification_preferences` | Alert settings | Own row only |
| `audit_log` | Activity history | Own rows; admin sees all |
| `user_settings` | Dashboard preferences | Own row only |
| `report_attachments` | File metadata | Scoped by role |
