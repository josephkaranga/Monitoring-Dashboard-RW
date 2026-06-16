# NBSAP Monitoring System — Project Documentation

**Rwanda National Biodiversity Strategy & Action Plan 2025–2030**
**Version:** 1.0.0 | **Last Updated:** April 2026

---

## Table of Contents

1. [Setup Guide](#1-setup-guide)
2. [Architecture Overview](#2-architecture-overview)
3. [Database Structure](#3-database-structure)
4. [Admin & Operational Guide](#4-admin--operational-guide)
5. [Deployment Guide](#5-deployment-guide)
6. [Known Limitations](#6-known-limitations)

---

## 1. Setup Guide

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | ≥ 18.x | JavaScript runtime |
| npm | ≥ 9.x | Package manager |
| Git | Any | Version control |
| Supabase account | — | Backend / database |
| Vercel account | — | Hosting / deployment |

---

### A. Run Locally

**1. Clone the repository**

```bash
git clone https://github.com/josephkaranga/Monitoring-Dashboard-RW.git
cd Monitoring-Dashboard-RW
```

**2. Install dependencies**

```bash
npm install
```

**3. Create your environment file**

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Open `.env` and set:

```env
VITE_SUPABASE_URL=https://vivqcyzyvixdammtaidr.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

> Get these from: [Supabase Dashboard](https://app.supabase.com) → Your Project → Settings → API

**4. Start the development server**

```bash
npm run dev
```

The app opens at `http://localhost:3000`

**5. Other useful commands**

```bash
npm run build        # Production build → outputs to /dist
npm run preview      # Preview the production build locally
npm run type-check   # TypeScript type checking (no emit)
npm run lint         # ESLint check
```

---

### B. Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | ✅ Yes | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ Yes | Supabase public anon key (safe for browser) |
| `VITE_APP_NAME` | Optional | App display name |
| `VITE_APP_ENV` | Optional | `development` or `production` |
| `VITE_ENABLE_AI_NARRATIVE` | Optional | Enable AI summary panel (default: `true`) |
| `VITE_ENABLE_REALTIME` | Optional | Enable live data subscriptions (default: `true`) |

> ⚠️ **Never commit `.env` to Git.** It is already in `.gitignore`.
> For production, set these in Vercel Dashboard → Settings → Environment Variables.

---

### C. Database Setup

The database runs on Supabase (PostgreSQL). The schema is already applied to the live project. If you need to set up a fresh Supabase project:

1. Go to [app.supabase.com](https://app.supabase.com) → New Project
2. Open the SQL Editor
3. Run `001_initial_schema.sql` first
4. Run `002_seed_data.sql` second

These files are in the root of the repository.

---

## 2. Architecture Overview

### A. Frontend Structure

The frontend is a **React 18 + Vite + TypeScript** single-page application. All source files live at the **root level** (no `src/` subdirectory).

```
/
├── main.tsx              # App entry point
├── App.tsx               # Router + AuthProvider wrapper
├── index.ts              # All TypeScript types (single source of truth)
├── supabase.ts           # Supabase client initialisation
├── AuthContext.tsx        # Auth state, profile cache, session management
├── authService.ts         # Sign in, sign up, sign out, profile CRUD
├── dataService.ts         # All database queries (indicators, reports, etc.)
├── useData.ts             # React hooks wrapping dataService
├── reportService.ts       # Report generation (PDF/CSV)
├── aiNarrative.ts         # AI-generated dashboard summary
├── styles.ts              # Shared CSS-in-JS constants
├── DashboardLayout.tsx    # Sidebar + topbar shell
├── ProtectedRoute.tsx     # Route guard (auth + role check)
├── ErrorBoundary.tsx      # Page-level error catching
├── Skeleton.tsx           # Loading skeleton components
│
├── AuthPage.tsx           # Login / Sign Up page
├── DashboardPage.tsx      # Main overview dashboard
├── IndicatorsPage.tsx     # 4-tier indicator hierarchy
├── NationalTargetsPage.tsx # 22 NBSAP targets accordion
├── AdaptiveManagementPage.tsx # Decision support & feedback loops
├── ReportingToolkitPage.tsx   # T01–T07 reporting modules
├── VerifQueuePage.tsx     # Submission verification queue
├── CompliancePage.tsx     # Compliance tracking
├── RiskPage.tsx           # Risk register & heat map
├── MapPage.tsx            # District SVG map
├── ReportsPage.tsx        # Report generation & export
├── StakeholdersPage.tsx   # Stakeholder engagement matrix
├── RBISPage.tsx           # RBIS integration & data governance
├── DataPipelinePage.tsx   # 5-tier data pipeline & roadmap
├── SettingsPage.tsx       # User settings (tabs)
├── UserManagementPage.tsx # Admin user management
│
├── index.html             # HTML shell (Font Awesome, Google Fonts, CSS vars)
├── vite.config.ts         # Vite build config (code splitting)
├── vercel.json            # Vercel deployment config (headers, rewrites)
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
│
├── 001_initial_schema.sql # Database schema (run first)
└── 002_seed_data.sql      # Seed data (run second)
```

**Code splitting** — The build is split into chunks to reduce initial load:
- `vendor` — React, React DOM, React Router
- `supabase` — Supabase JS client
- `charts` — Chart.js + react-chartjs-2
- All pages are lazy-loaded via `React.lazy()`

---

### B. How the Frontend Talks to Supabase

All database access goes through the Supabase JS client (`supabase.ts`). There is no custom API server.

```
Browser
  └── supabase.ts (createClient)
        ├── dataService.ts   → reads/writes tables directly via PostgREST
        ├── authService.ts   → uses supabase.auth.*
        └── reportService.ts → reads toolkit_reports for export
```

The Supabase client uses:
- **PostgREST** for all table queries (REST over HTTPS)
- **Supabase Auth** for session management (JWT stored in `localStorage`)
- **Realtime** for live notification subscriptions (WebSocket)
- **Storage** for report file attachments

Row Level Security (RLS) on every table means the database enforces access control — the frontend cannot bypass it even if code is modified.

---

### C. Auth Flow

```
User visits app
  └── AuthContext.tsx initialises
        └── supabase.auth.onAuthStateChange fires
              ├── INITIAL_SESSION
              │     ├── No session → show /auth login page
              │     └── Has session → loadUserData()
              │           ├── Check profile cache (5 min TTL)
              │           ├── Fetch profiles table
              │           ├── Check is_active = true
              │           │     └── false → sign out (pending approval)
              │           └── Dispatch SET_SESSION → app renders
              │
              ├── SIGNED_IN → loadUserData()
              ├── SIGNED_OUT → clear state → redirect to /auth
              ├── TOKEN_REFRESHED → silent (no re-fetch)
              └── USER_UPDATED → clear cache → reload profile
```

**New user signup flow:**
1. User fills signup form → `authService.signUp()` called
2. Supabase creates `auth.users` record
3. DB trigger `handle_new_user` auto-creates `profiles` row with `is_active = false`
4. User sees "awaiting REMA Admin approval" message
5. Admin sees user in User Management → Pending Approvals section
6. Admin clicks Approve → `is_active` set to `true`
7. User can now sign in

**Safety timeout:** If profile loading takes more than 6 seconds, the loading state is cleared to prevent infinite loading on page refresh.

---

### D. Role-Based Access

Five user roles control what each user can see and do:

| Role | Label | Access Level |
|------|-------|-------------|
| `dashboard_management` | REMA Administrator | Full access — all pages, user management, audit log, exports |
| `sector_reporting` | Sector Reporter | Reporting modules T01–T07, verification queue, risk register |
| `local_reporting` | Local Reporter | Reporting modules T01–T07, compliance, district map |
| `policy_monitoring` | Policy Monitor | Read-only — dashboard, indicators, targets, compliance, risk |
| `programme_alignment` | Development Partner | Read-only — analytics, risk, compliance |

Route-level guards in `App.tsx` enforce these roles. Database RLS policies enforce them at the data layer independently.

---

## 3. Database Structure

### Tables Overview

| Table | Description |
|-------|-------------|
| `profiles` | User accounts (extends Supabase `auth.users`) |
| `nbsap_targets` | 22 NBSAP national targets (Goals A–D) |
| `indicators` | 82 biodiversity indicators (4 tiers) |
| `toolkit_reports` | T01–T07 submitted reports |
| `report_attachments` | Files attached to reports |
| `districts` | 30 Rwanda districts with compliance data |
| `provinces` | 5 provinces (Kigali, North, South, East, West) |
| `risks` | Risk register (12 seeded risks) |
| `compliance_records` | Compliance flags and resolutions |
| `notifications` | Per-user in-app notifications |
| `notification_preferences` | User notification settings |
| `audit_log` | All user actions (login, submit, approve, export) |
| `user_settings` | Per-user dashboard preferences |

---

### Key Table Schemas

**`profiles`**
```sql
id               UUID  (FK → auth.users)
email            TEXT
full_name        TEXT
role             user_role ENUM
organization     TEXT
department       TEXT
is_active        BOOLEAN  -- false = pending admin approval
last_login       TIMESTAMPTZ
avatar_initials  TEXT  (auto-generated)
```

**`indicators`**
```sql
id              SERIAL
name            TEXT
tier            ENUM ('headline','component','complementary','binary')
nbsap_target_id INTEGER  (FK → nbsap_targets)
progress        INTEGER  (0–100)
status          ENUM ('on-track','at-risk','behind')
km_gbf          TEXT     -- Kunming-Montreal GBF alignment
data_source     TEXT
responsible     TEXT[]   -- array of responsible institutions
```

**`toolkit_reports`**
```sql
id           UUID
tool_id      ENUM ('T01'–'T07')
submitted_by UUID  (FK → profiles)
status       ENUM ('pending','approved','rejected')
reviewed_by  UUID  (FK → profiles)
form_data    JSONB  -- flexible form fields
attachments  JSONB  -- file metadata array
district     TEXT
institution  TEXT
```

**`audit_log`**
```sql
id          UUID
user_id     UUID  (FK → profiles)
action_type TEXT  -- submit, approve, reject, export, login, delete
action      TEXT
detail      TEXT
role        TEXT
created_at  TIMESTAMPTZ
```

---

### Indicator Tiers

The system uses a 4-tier indicator framework aligned with the Kunming-Montreal GBF:

| Tier | Count | Description |
|------|-------|-------------|
| Headline | 22 | One per NBSAP target — primary progress measure |
| Component | ~30 | Sub-indicators that feed into headline indicators |
| Complementary | ~20 | Supporting context indicators |
| Binary | ~10 | Yes/No policy/legal compliance indicators |

Total: **82 indicators** covering all 22 national targets.

---

### Row Level Security (RLS) Summary

Every table has RLS enabled. Key policies:

| Table | Who can read | Who can write |
|-------|-------------|---------------|
| `profiles` | Own profile; admins see all | Own profile; admins update any |
| `indicators` | All authenticated users | Sector reporters + admins |
| `nbsap_targets` | All authenticated users | Admins only |
| `toolkit_reports` | Admins/policy/programme see all; local reporters see own | Writers (sector + local + admin) |
| `audit_log` | Own entries; admins see all | Any authenticated user (own entries) |
| `notifications` | Own notifications only | Own + admins |
| `user_settings` | Own settings only | Own settings only |

---

### Database Functions

| Function | Purpose |
|----------|---------|
| `get_user_role()` | Returns current user's role |
| `is_admin()` | Returns true if `dashboard_management` |
| `can_write()` | Returns true if sector/local/admin |
| `handle_new_user()` | Trigger: auto-creates profile + settings on signup |
| `handle_updated_at()` | Trigger: auto-updates `updated_at` on row change |

---

### Storage Buckets

| Bucket | Public | Purpose |
|--------|--------|---------|
| `report-attachments` | No | Files attached to T01–T07 reports |
| `exports` | No | Generated PDF/CSV exports |

---

## 4. Admin & Operational Guide

### A. How to Add Users

**Option 1 — User self-registers (recommended)**
1. User goes to the app URL and clicks "Sign Up"
2. They fill in name, email, password, role, and organisation
3. Account is created with `is_active = false`
4. Admin logs in → User Management → Pending Approvals
5. Click **Approve** to activate the account

**Option 2 — Admin creates user directly**
1. Log in as `josephkaranga0@gmail.com` (REMA Admin)
2. Go to User Management
3. Click **Create User** button (top right)
4. Fill in the form — the user is created as active immediately
5. Share credentials with the user

**Option 3 — Direct database (Supabase Dashboard)**
1. Go to [app.supabase.com](https://app.supabase.com) → Authentication → Users
2. Click "Invite user" or "Add user"
3. Then go to Table Editor → `profiles` → find the new user
4. Set `is_active = true` and the correct `role`

---

### B. How to Change User Roles

**Via the app (admin only):**
1. Log in as REMA Admin
2. Go to User Management
3. Find the user in the table
4. Use the Role dropdown in the Actions column
5. Select the new role — it saves immediately

**Via Supabase Dashboard:**
1. Table Editor → `profiles`
2. Find the user row
3. Edit the `role` column
4. Valid values: `policy_monitoring`, `sector_reporting`, `local_reporting`, `dashboard_management`, `programme_alignment`

---

### C. How to Manage Indicator Data

**Update indicator progress:**
1. Go to Indicator Hierarchy page
2. Find the indicator
3. Progress is updated via `dataService.updateIndicatorProgress(id, progress)`
4. Status auto-calculates: ≥70% = on-track, ≥40% = at-risk, <40% = behind

**Add new indicators (Supabase Dashboard):**
1. Table Editor → `indicators`
2. Insert new row
3. Required fields: `name`, `tier`, `nbsap_target_id`, `progress`, `status`

---

### D. How to Handle Errors

**Page shows "Something went wrong"**
- The `ErrorBoundary` component caught a React render error
- Check browser console for the specific error
- Common causes: null data before loading completes, missing DB columns

**Infinite loading on page refresh**
- The 6-second safety timeout in `AuthContext.tsx` should prevent this
- If it persists: check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set correctly in Vercel
- Check Supabase project is not paused (free tier pauses after 1 week of inactivity)

**User can't log in**
- Check `is_active = true` in `profiles` table
- Check Supabase Auth → Users — confirm the email is confirmed
- Check the user's role is a valid enum value

**Data not loading**
- Check Supabase project status at [app.supabase.com](https://app.supabase.com)
- Check RLS policies — the user's role must match the policy
- Check browser Network tab for failed API calls

---

### E. How to View the Audit Log

1. Log in as REMA Admin (`dashboard_management` role)
2. Go to Settings → Audit Log tab
3. Filter by action type or date
4. Export to CSV using the export button

The audit log records: logins, report submissions, approvals/rejections, exports, user management actions.

---

### F. How to Back Up Data

**Supabase automatic backups (built-in):**
- Supabase Pro plan includes daily backups with 7-day retention
- Go to Supabase Dashboard → Database → Backups

**Manual export via Supabase Dashboard:**
1. Go to Table Editor → select a table
2. Click the download icon to export as CSV

**Full database dump (requires Supabase CLI):**
```bash
supabase db dump --db-url "postgresql://postgres:[password]@db.vivqcyzyvixdammtaidr.supabase.co:5432/postgres" > backup.sql
```

**Export reports from the app:**
- Reports page → Export CSV or Export PDF buttons
- Audit log → Export CSV

---

### G. How to Approve/Reject Report Submissions

1. Log in as Sector Reporter or REMA Admin
2. Go to Verification Queue
3. Review each pending submission card
4. Click **Approve** or **Reject**
5. Add a review note if rejecting
6. The submitter's status updates immediately

---

## 5. Deployment Guide

### Live System

| Item | Value |
|------|-------|
| Live URL | Deployed on Vercel (check Vercel Dashboard for URL) |
| Repository | https://github.com/josephkaranga/Monitoring-Dashboard-RW |
| Backend | https://vivqcyzyvixdammtaidr.supabase.co |
| Framework | Vite (React) |
| Build command | `npm run build` |
| Output directory | `dist` |

---

### A. How to Deploy

**Automatic deployment (recommended):**
Every push to the `main` branch on GitHub automatically triggers a Vercel deployment.

```bash
git add .
git commit -m "your change description"
git push origin main
```

Vercel detects the push, runs `npm run build`, and deploys the `dist` folder.

**Manual redeploy (Vercel Dashboard):**
1. Go to [vercel.com](https://vercel.com) → your project
2. Click **Deployments** tab
3. Find the latest deployment → click the three-dot menu → **Redeploy**

---

### B. Environment Variables in Vercel

These must be set in Vercel — they are NOT in the repository:

1. Go to Vercel Dashboard → your project → **Settings** → **Environment Variables**
2. Add:
   - `VITE_SUPABASE_URL` = `https://vivqcyzyvixdammtaidr.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = your anon key from Supabase
3. Set scope to **Production**, **Preview**, and **Development**
4. Click Save — then redeploy

> If you see "Missing Supabase environment variables" on the live site, these are not set.

---

### C. If the Deployment Breaks

**Check build logs:**
1. Vercel Dashboard → Deployments → click the failed deployment
2. Read the build log — look for TypeScript errors or missing modules

**Common fixes:**

| Error | Fix |
|-------|-----|
| `Missing Supabase environment variables` | Set env vars in Vercel Dashboard |
| TypeScript compile error | Run `npm run type-check` locally first |
| `Cannot find module './X'` | Check import path — all files are at root level |
| Build succeeds but app is blank | Check browser console for runtime errors |

**Roll back to previous version:**
1. Vercel Dashboard → Deployments
2. Find the last working deployment
3. Click three-dot menu → **Promote to Production**

---

### D. Supabase Project Management

**If the Supabase project pauses** (free tier pauses after 1 week of inactivity):
1. Go to [app.supabase.com](https://app.supabase.com)
2. Click **Restore project**
3. Wait ~2 minutes for it to come back online

**To run a new migration:**
1. Write your SQL
2. Go to Supabase Dashboard → SQL Editor
3. Paste and run the SQL
4. Save a copy in the repository as `003_migration_name.sql`

---

## 6. Known Limitations

These are documented explicitly so future developers and administrators are not surprised.

### Frontend

| Limitation | Detail |
|-----------|--------|
| **No offline support** | The app requires an internet connection. There is no service worker or offline cache. |
| **No mobile-optimised forms** | The reporting toolkit forms (T01–T07) are designed for desktop. They are usable on mobile but not optimised. |
| **District map is SVG-only** | The map on the District Map page is a static SVG. It does not use a real GIS layer. Coordinates are approximate. |
| **RBIS integration is iframe-only** | The RBIS page embeds `https://rbis.ur.ac.rw` in an iframe. There is no live API data pull from RBIS into the dashboard. |
| **AI narrative is static** | The AI summary panel on the Dashboard generates text from indicator data using a local template function (`aiNarrative.ts`). It does not call an external AI API. |
| **No pagination on most tables** | Indicators support pagination (100 per page). Other tables (risks, compliance, audit log) load all records up to a fixed limit. |
| **Chart.js only** | Charts use Chart.js. There is no advanced geospatial visualisation. |

### Backend / Database

| Limitation | Detail |
|-----------|--------|
| **Free tier Supabase** | If on the free plan, the project pauses after 1 week of inactivity. Upgrade to Pro for production use. |
| **No audit log cleanup** | The `audit_log` table grows indefinitely. There is no automated cleanup job. Manual deletion or a cron job is needed for long-term use. |
| **No email notifications** | The Edge Function `notify-admin-new-signup` is deployed but email delivery depends on Supabase's SMTP configuration being set up. |
| **Service role key not used** | Admin operations (creating users, bypassing RLS) are done via the anon key + RLS policies. The service role key is not used in the app. |
| **No real-time for most tables** | Realtime subscriptions are only active for `notifications` and `toolkit_reports`. Other tables require a manual page refresh to see new data. |
| **JSONB form data** | Report form data is stored as JSONB (`form_data` column). This is flexible but means you cannot query individual form fields with standard SQL without using JSONB operators. |

### Security

| Limitation | Detail |
|-----------|--------|
| **JWT role claims not used** | User roles are read from the `profiles` table on every session load, not from JWT claims. This means a role change takes effect on next login, not immediately. |
| **No IP-based rate limiting** | There is no rate limiting on login attempts beyond what Supabase Auth provides by default. |
| **Species location fuzzing is a setting** | The `species_fuzzing` option in user settings is a UI preference flag. The actual fuzzing logic is not yet implemented in data queries. |
| **Anon key is public** | The Supabase anon key is visible in the browser. This is by design — RLS policies are the security layer. Never expose the service role key. |

### Data

| Limitation | Detail |
|-----------|--------|
| **Indicator data is partially seeded** | The seed file (`002_seed_data.sql`) includes 10 sample indicators. The remaining 72 indicators were added via a separate migration and may need verification against official NBSAP documents. |
| **Progress values are estimates** | Indicator progress percentages are initial estimates. They should be updated with real field data as reporting cycles complete. |
| **No historical time series** | The database stores current values only. There is no time-series table for tracking indicator progress over time. |
| **District compliance is static** | District compliance percentages in the seed data are illustrative. They should be recalculated from actual `toolkit_reports` submissions. |

---

## Quick Reference

### Admin Credentials
- **REMA Admin email:** `josephkaranga0@gmail.com`
- **Role:** `dashboard_management`

### Key URLs
- **App:** Vercel deployment URL (check Vercel Dashboard)
- **Supabase Dashboard:** https://app.supabase.com
- **Supabase Project:** https://vivqcyzyvixdammtaidr.supabase.co
- **GitHub Repo:** https://github.com/josephkaranga/Monitoring-Dashboard-RW

### Emergency Contacts / Escalation
- If Supabase is down: check https://status.supabase.com
- If Vercel is down: check https://www.vercel-status.com
- If the build fails: check Vercel deployment logs first, then run `npm run build` locally

---

*This documentation covers the system as built as of April 2026. Update this file whenever significant changes are made to the architecture, database schema, or deployment process.*
