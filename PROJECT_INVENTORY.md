# PROJECT INVENTORY
## Rwanda NBSAP Monitoring Dashboard — Complete File & Dependency Reference

---

## 1. Project Identity

| Property | Value |
|---|---|
| **Name** | nbsap-monitoring-system |
| **Version** | 1.0.0 |
| **Description** | Rwanda NBSAP Monitoring System — National Biodiversity Strategy & Action Plan 2025–2030 |
| **Live URL** | https://nbsap-dashboard-rw.vercel.app |
| **Repository** | Local git — main branch |
| **License** | Private |

---

## 2. Source File Inventory

### Entry Points
| File | Purpose |
|---|---|
| [main.tsx](main.tsx) | Vite entry point — renders `<App />` into `#root` |
| [index.html](index.html) | HTML shell — loads main.tsx via Vite script tag |

### Components (`src/components/`)
| File | Purpose | Role Restriction |
|---|---|---|
| [App.tsx](src/components/App.tsx) | Root component: BrowserRouter + AuthProvider + Routes | — |
| [AuthPage.tsx](src/components/AuthPage.tsx) | Login / signup / password reset forms | Public |
| [DashboardLayout.tsx](src/components/DashboardLayout.tsx) | Persistent sidebar + topbar shell for all dashboard pages | Authenticated |
| [ProtectedRoute.tsx](src/components/ProtectedRoute.tsx) | HOC: checks role + permission before rendering child routes | — |
| [ErrorBoundary.tsx](src/components/ErrorBoundary.tsx) | Catches React render errors; prevents full app crash | — |
| [NBSAPTargetProgress.tsx](src/components/NBSAPTargetProgress.tsx) | Dashboard widget: all 22 targets with progress bars + goal filter | Authenticated |
| [PendingRequestsBadge.tsx](src/components/PendingRequestsBadge.tsx) | Admin notification badge showing pending role request count | dashboard_management |
| [RoleChangeModal.tsx](src/components/RoleChangeModal.tsx) | User-facing modal to submit a role change request | Authenticated |
| [RoleChangeApprovalPanel.tsx](src/components/RoleChangeApprovalPanel.tsx) | Admin panel to approve/reject role change requests | dashboard_management |
| [RoleChangeStatus.tsx](src/components/RoleChangeStatus.tsx) | Shows status of user's existing role change requests | Authenticated |
| [Skeleton.tsx](src/components/Skeleton.tsx) | Loading skeleton components for content placeholders | — |

#### `src/components/common/`
Shared primitive UI components (buttons, modals, cards, tabs, search inputs, etc.)

#### `src/components/map/`
Map layer components: district rendering, overlay toggles, legend, click handlers.

#### `src/components/panels/`
Dashboard metric panels: metric tiles, indicator trend chart, recent activity feed.

#### `src/components/rbis/`
RBIS-specific components: biodiversity data frames, species filter panels.

---

### Pages (`src/pages/`)
| File | Route | Access Level |
|---|---|---|
| [DashboardPage.tsx](src/pages/DashboardPage.tsx) | `/dashboard` | All authenticated |
| [NationalTargetsPage.tsx](src/pages/NationalTargetsPage.tsx) | `/targets` | All authenticated |
| [IndicatorsPage.tsx](src/pages/IndicatorsPage.tsx) | `/indicators` | All authenticated |
| [ReportingToolkitPage.tsx](src/pages/ReportingToolkitPage.tsx) | `/reporting-toolkit` | local_reporting, lead_government_ministry_reporting, dashboard_management |
| [VerifQueuePage.tsx](src/pages/VerifQueuePage.tsx) | `/verification-queue` | lead_government_ministry_reporting, dashboard_management |
| [ReportsPage.tsx](src/pages/ReportsPage.tsx) | `/reports` | All authenticated |
| [MapPage.tsx](src/pages/MapPage.tsx) | `/map` | All authenticated |
| [CompliancePage.tsx](src/pages/CompliancePage.tsx) | `/compliance` | All except public_viewer |
| [RiskPage.tsx](src/pages/RiskPage.tsx) | `/risk` | policy_monitoring, lead_government_ministry_reporting, dashboard_management, programme_alignment |
| [StakeholdersPage.tsx](src/pages/StakeholdersPage.tsx) | `/stakeholders` | All authenticated |
| [BiodiversityDataPage.tsx](src/pages/BiodiversityDataPage.tsx) | `/rbis` | All authenticated |
| [DataPipelinePage.tsx](src/pages/DataPipelinePage.tsx) | `/data-pipeline` | All authenticated |
| [AdaptiveManagementPage.tsx](src/pages/AdaptiveManagementPage.tsx) | `/adaptive-management` | All authenticated |
| [UserManagementPage.tsx](src/pages/UserManagementPage.tsx) | `/users` | dashboard_management |
| [RoleRequestsPage.tsx](src/pages/RoleRequestsPage.tsx) | `/role-requests` | All authenticated |
| [SettingsPage.tsx](src/pages/SettingsPage.tsx) | `/settings` | All authenticated |

---

### Services (`src/services/`)
| File | Exports / Responsibility |
|---|---|
| [AuthContext.tsx](src/services/AuthContext.tsx) | `AuthProvider`, `useAuth`, `usePermissions`, `useIsAdmin`, `useCanSubmit`, `useCanApprove`, `checkAccountStatus` — central auth state via useReducer |
| [dataService.ts](src/services/dataService.ts) | `fetchIndicators`, `fetchTargets`, `fetchDistricts`, `fetchRisks`, `fetchAuditLog`, `writeAuditEntry`, `logAuditEvent`, `fetchNotifications`, `saveUserSettings`, `subscribeToReports`, `subscribeToNotifications`, `getIndicatorsByDistrict`, `getRisksByDistrict` |
| [reportService.ts](src/services/reportService.ts) | `submitReport`, `fetchReports`, `verifyReport`, `deleteReport`, `clearAllReports`, `getDashboardStats`, `exportReportsToCSV`, `exportReportsToJSON`, `importReportsFromJSON`, `fetchToolWeight`, `processReportAutomatic` |
| [aiNarrative.ts](src/services/aiNarrative.ts) | `generateAINarrative(stats)` — calls Anthropic Claude API with live dashboard data; fallback narrative if API unavailable |
| [aiExtractionService.ts](src/services/aiExtractionService.ts) | `triggerExtraction(report)` — async AI extraction of NBSAP data from report content; inserts to ai_extractions + ai_extraction_proposals |
| [roleChangeService.ts](src/services/roleChangeService.ts) | `submitRoleChangeRequest`, `fetchRoleChangeRequests`, `approveRoleChangeRequest`, `rejectRoleChangeRequest`, `cancelRoleChangeRequest` |
| [systemMetricsService.ts](src/services/systemMetricsService.ts) | `fetchSystemMetrics`, `recalculateMetrics` — reads system_metrics table and dashboard_metrics_live view |
| [automatedProcessingEngine.ts](src/services/automatedProcessingEngine.ts) | `recordSubmission` — logs reports with automated processing engine; computes contributionValue |
| [eventBus.ts](src/services/eventBus.ts) | Lightweight pub/sub event bus; `emit('dashboard-refresh')`, `emit('target-progress-updated')` — decouples UI refresh from report actions |
| [authService.ts](src/services/authService.ts) | `signIn`, `signUp`, `signOut`, `resetPassword`, `updatePassword` — wrappers over Supabase auth |
| [rbisService.ts](src/services/rbisService.ts) | RBIS data stream integration — fetches and transforms RBIS API data |

---

### Hooks (`src/hooks/`)
| File | Purpose |
|---|---|
| [useData.ts](src/hooks/useData.ts) | General-purpose data fetching hooks with loading/error state |
| [useBiodiversityData.ts](src/hooks/useBiodiversityData.ts) | Fetch and aggregate biodiversity metrics across districts |
| [useGBIF.ts](src/hooks/useGBIF.ts) | Fetch species occurrence data from GBIF API (via edge function proxy) |
| [useGBIFSpecies.ts](src/hooks/useGBIFSpecies.ts) | Species-specific GBIF queries with filtering and clustering |
| [useMapLayers.ts](src/hooks/useMapLayers.ts) | Manages map layer state: district overlay, indicators, threats |
| [useProtectedAreas.ts](src/hooks/useProtectedAreas.ts) | Loads and parses rwanda-protected-areas.geojson |
| [useRiverNetwork.ts](src/hooks/useRiverNetwork.ts) | Loads and parses rwanda-rivers.geojson |
| [useLakes.ts](src/hooks/useLakes.ts) | Loads lakes from DB and/or rwanda-lakes.geojson |
| [useRBIS.ts](src/hooks/useRBIS.ts) | Manages RBIS data stream state and connection |

---

### Types (`src/types/`)
| File | Key Exports |
|---|---|
| [index.ts](src/types/index.ts) | `UserRole`, `UserProfile`, `Indicator`, `NBSAPTarget`, `ToolkitReport`, `ReportAttachment`, `District`, `Province`, `Risk`, `ComplianceRecord`, `Notification`, `AuditEntry`, `DashboardStats`, `UserSettings`, `AIExtraction`, `AIExtractionProposal`, `hasPermission()`, `getAccountStatus()` |
| [automaticReporting.ts](src/types/automaticReporting.ts) | `ToolId`, `OrganizationConfig`, `ProcessingResult`, `ReportSubmission`, `TOOL_WEIGHTS`, `getToolWeight()`, `getToolDescription()` |
| [biodiversity.ts](src/types/biodiversity.ts) | Biodiversity data types: species, hotspots, occurrence records |
| [mapLayers.ts](src/types/mapLayers.ts) | Map layer configuration and state types |
| [overlays.ts](src/types/overlays.ts) | Map overlay types (protected areas, rivers, lakes) |
| [rbis.ts](src/types/rbis.ts) | RBIS data stream and biodiversity information types |

---

### Utilities (`src/utils/`)
| File | Purpose |
|---|---|
| [supabase.ts](src/utils/supabase.ts) | Supabase client singleton with auth config, realtime params, fetch patch for invalid refresh token detection |
| [styles.ts](src/utils/styles.ts) | Shared style constants and colour utilities |
| [validation.ts](src/utils/validation.ts) | Form validation functions |
| [errorHandling.ts](src/utils/errorHandling.ts) | Error normalisation and display utilities |
| [fetchWithTimeout.ts](src/utils/fetchWithTimeout.ts) | Fetch wrapper with configurable timeout |
| [geoUtils.ts](src/utils/geoUtils.ts) | Geographic utility functions (distance, bounds, coordinate transforms) |
| [biodiversityCalculations.ts](src/utils/biodiversityCalculations.ts) | Species richness, diversity index, and ecosystem health calculations |
| [hotspotDetection.ts](src/utils/hotspotDetection.ts) | Biodiversity hotspot detection algorithms |
| [pointClustering.ts](src/utils/pointClustering.ts) | Geographic point clustering for map species occurrences |
| [rbisFilters.ts](src/utils/rbisFilters.ts) | RBIS data filtering and transformation |
| [threatAssessment.ts](src/utils/threatAssessment.ts) | Threat level calculation from district and risk data |
| [accountStatusMessages.ts](src/utils/accountStatusMessages.ts) | User-facing messages for account suspension/deactivation states |
| `__tests__/` | Utility unit tests (Vitest) |

---

### Static Assets (`public/`)
| File | Description |
|---|---|
| [rwanda-districts.geojson](public/rwanda-districts.geojson) | GeoJSON polygons for all 30 Rwanda districts |
| [rwanda-protected-areas.geojson](public/rwanda-protected-areas.geojson) | GeoJSON boundaries for Rwanda's protected areas (national parks, reserves) |
| [rwanda-rivers.geojson](public/rwanda-rivers.geojson) | GeoJSON linestrings for Rwanda's river network |
| [rwanda-lakes.geojson](public/rwanda-lakes.geojson) | GeoJSON polygons for Rwanda's inland lakes |

---

### Supabase (`supabase/`)
| File | Purpose |
|---|---|
| [supabase/config.toml](supabase/config.toml) | Supabase CLI project configuration |
| [supabase/functions/gbif-proxy/](supabase/functions/gbif-proxy/) | Deno edge function: proxies GBIF API calls to bypass CORS restrictions |

---

### Configuration Files
| File | Purpose |
|---|---|
| [package.json](package.json) | Project metadata, NPM scripts, dependencies |
| [tsconfig.json](tsconfig.json) | TypeScript compiler configuration |
| [vite.config.ts](vite.config.ts) | Vite build and dev server configuration |
| [vercel.json](vercel.json) | Vercel deployment: build config, SPA rewrite, security headers, cache control |
| [.env](env) | Runtime environment variables (not committed to git) |
| [.env.example](.env.example) | Template showing required environment variables |
| [.gitignore](.gitignore) | Git ignore rules (node_modules, .env, dist, etc.) |

---

### Documentation Files
| File | Description |
|---|---|
| [README.md](README.md) | Project overview and setup instructions |
| [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) | Codebase reorganisation summary |
| [SYSTEM_MANUAL.md](SYSTEM_MANUAL.md) | Full system manual and panel presentation guide |
| [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) | *(this release)* Technical architecture documentation |
| [DATABASE_FOOTPRINT.md](DATABASE_FOOTPRINT.md) | *(this release)* Complete database schema reference |
| [DATA_FLOW_DIAGRAM.md](DATA_FLOW_DIAGRAM.md) | *(this release)* Data flow diagrams |
| [ERD.md](ERD.md) | *(this release)* Entity relationship diagrams |
| [PROJECT_INVENTORY.md](PROJECT_INVENTORY.md) | *(this release)* This file |
| [docs/PROJECT_HANDOVER.md](docs/PROJECT_HANDOVER.md) | Project handover guide for new developers |
| [docs/QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md) | Quick reference card |
| [docs/RBIS_DASHBOARD_DOCUMENTATION.md](docs/RBIS_DASHBOARD_DOCUMENTATION.md) | RBIS technical documentation |
| [docs/CREDENTIALS_TEMPLATE.md](docs/CREDENTIALS_TEMPLATE.md) | Credentials and access template |

---

## 3. Migration Inventory

| # | File | Tables/Objects Added | Key Change |
|---|---|---|---|
| 001 | [001_initial_schema.sql](migrations/001_initial_schema.sql) | profiles, provinces, districts, nbsap_targets, indicators, toolkit_reports, report_attachments, risks, compliance_records, notifications, notification_preferences, audit_log, user_settings | Full initial schema + RLS + core triggers |
| 002 | [002_seed_data.sql](migrations/002_seed_data.sql) | — | Seed NBSAP targets + indicator data |
| 003 | [003_add_district_coordinates.sql](migrations/003_add_district_coordinates.sql) | districts (latitude, longitude, elevation, wetland_area) | Geographic coordinates for all 30 districts |
| 004 | [004_rbis_tables.sql](migrations/004_rbis_tables.sql) | rbis_data_streams | RBIS integration tables |
| 005 | [005_seed_rbis_data_streams.sql](migrations/005_seed_rbis_data_streams.sql) | — | RBIS seed data |
| 006 | [006_role_change_approval.sql](migrations/006_role_change_approval.sql) | role_change_requests | Full role change workflow + 3 triggers + RLS |
| 007 | [007_terminology_update.sql](migrations/007_terminology_update.sql) | — | Role enum rename: sector_reporting |
| 008 | [008_add_lakes_table.sql](migrations/008_add_lakes_table.sql) | lakes | Rwanda lakes geographic table |
| 009 | [009_add_account_status_fields.sql](migrations/009_add_account_status_fields.sql) | profiles (suspended_at, suspended_by, suspension_reason, suspension_end_date) | Account suspension support |
| 010 | [010_add_public_viewer_role.sql](migrations/010_add_public_viewer_role.sql) | — | Add public_viewer enum value + policies |
| 011 | [011_rename_sector_reporting_role.sql](migrations/011_rename_sector_reporting_role.sql) | — | Rename → lead_government_ministry_reporting |
| 012 | [012_extend_reporting_period.sql](migrations/012_extend_reporting_period.sql) | — | Extend reporting period field options |
| 013 | [013_nbsap_target_integration.sql](migrations/013_nbsap_target_integration.sql) | toolkit_reports.nbsap_target_id | FK + initial progress trigger |
| 014 | [014_update_comprehensive_stakeholder_mapping.sql](migrations/014_update_comprehensive_stakeholder_mapping.sql) | nbsap_targets.responsible_stakeholders | RPC function + stakeholder arrays |
| 015 | [015_comprehensive_reporting_metrics_automation.sql](migrations/015_comprehensive_reporting_metrics_automation.sql) | system_metrics, dashboard_metrics_live view | Full metrics automation: 13 metric types + trigger + recalculate function |
| 016 | [016_automatic_reporting_tool_weights.sql](migrations/016_automatic_reporting_tool_weights.sql) | tool_weights | Tool weights table + `get_tool_weight()` |
| 017 | [017_weighted_progress_triggers.sql](migrations/017_weighted_progress_triggers.sql) | — | Enhanced `update_target_progress_from_reports()` with weights + `calculate_indicator_progress()` |
| 018 | [018_ai_extraction_layer.sql](migrations/018_ai_extraction_layer.sql) | ai_extractions, ai_extraction_proposals | Full AI extraction schema + RLS |
| 019 | [019_delete_cleanup_and_role_cast_fix.sql](migrations/019_delete_cleanup_and_role_cast_fix.sql) | — | Delete cascade fixes + role cast corrections |
| 020 | [020_rwanda_nbsap_2025_2030.sql](migrations/020_rwanda_nbsap_2025_2030.sql) | — | Full Rwanda NBSAP 2025–2030 target data (all 22 targets with descriptions, baselines, indicators, strategic actions) |
| 021 | [021_target_baselines_and_timelines.sql](migrations/021_target_baselines_and_timelines.sql) | nbsap_targets.timeline_milestones | Phase-by-phase implementation milestones for all 22 targets (JSONB) |

---

## 4. Dependencies Inventory

### Production Dependencies
| Package | Version | Purpose |
|---|---|---|
| `react` | ^18.2.0 | UI framework |
| `react-dom` | ^18.2.0 | React DOM rendering |
| `react-router-dom` | ^6.21.0 | Client-side routing (SPA) |
| `@supabase/supabase-js` | ^2.39.0 | Supabase client (auth, DB, storage, realtime) |
| `@supabase/auth-helpers-react` | ^0.4.2 | React auth helper utilities |
| `chart.js` | ^4.4.1 | Chart rendering engine |
| `react-chartjs-2` | ^5.2.0 | React wrapper for Chart.js |
| `zustand` | ^4.4.7 | Lightweight global state management |
| `lucide-react` | ^0.263.1 | Icon component library |
| `react-hot-toast` | ^2.4.1 | Toast notification system |
| `clsx` | ^2.1.0 | Conditional className utility |
| `date-fns` | ^3.0.6 | Date formatting and manipulation |
| `jspdf` | ^4.2.1 | Client-side PDF generation |
| `pptxgenjs` | ^4.0.1 | Client-side PowerPoint (.pptx) generation |
| `@fortawesome/fontawesome-free` | ^7.2.0 | FontAwesome icon set (CSS) |

### Development Dependencies
| Package | Version | Purpose |
|---|---|---|
| `vite` | ^5.0.8 | Build tool and dev server |
| `@vitejs/plugin-react` | ^4.2.1 | Vite React plugin (Fast Refresh, JSX transform) |
| `typescript` | ^5.2.2 | TypeScript compiler |
| `@types/react` | ^18.2.43 | React TypeScript definitions |
| `@types/react-dom` | ^18.2.17 | React DOM TypeScript definitions |
| `eslint` | ^8.55.0 | Code linting |
| `@typescript-eslint/eslint-plugin` | ^6.14.0 | TypeScript ESLint rules |
| `@typescript-eslint/parser` | ^6.14.0 | TypeScript ESLint parser |
| `eslint-plugin-react-hooks` | ^4.6.0 | React hooks linting rules |
| `eslint-plugin-react-refresh` | ^0.4.5 | Fast Refresh linting rules |
| `vitest` | ^4.1.8 | Vite-native test runner |
| `@vitest/ui` | ^4.1.8 | Vitest browser UI |
| `@testing-library/react` | ^16.3.2 | React component testing utilities |
| `@testing-library/jest-dom` | ^6.9.1 | Custom Jest DOM matchers |
| `@types/jest` | ^30.0.0 | Jest TypeScript definitions |
| `jest` | ^30.4.2 | Test framework (alongside Vitest) |
| `jsdom` | ^29.1.1 | DOM implementation for tests |

---

## 5. External Services & APIs

| Service | Type | Integration Method | Rate Limits / Notes |
|---|---|---|---|
| **Supabase** | BaaS (Auth + DB + Storage + Realtime) | `@supabase/supabase-js` client | Free tier; no-server architecture |
| **Anthropic Claude API** | AI (LLM) | Direct browser `fetch()` to `api.anthropic.com/v1/messages` | Model: `claude-sonnet-4-20250514`; `max_tokens: 500`; `anthropic-dangerous-direct-browser-access: true` header |
| **GBIF API** | Biodiversity open data | Supabase Edge Function proxy (gbif-proxy) | Bypasses CORS; public data |
| **RBIS** (rbis.ur.ac.rw) | Rwanda Biodiversity Information System | Embedded `<iframe>` | University of Rwanda system; CSP allows `frame-src` |
| **Vercel** | Hosting / CDN | Auto-deploy from git; `vercel.json` configuration | Global CDN; SPA rewrites; 1-year asset cache |

---

## 6. NPM Scripts

| Script | Command | Purpose |
|---|---|---|
| `dev` | `vite` | Start development server (localhost:5173) |
| `build` | `vite build` | Production build → `dist/` |
| `preview` | `vite preview` | Preview production build locally |
| `lint` | `eslint . --ext ts,tsx --max-warnings 0` | Lint all TypeScript files (zero warnings) |
| `type-check` | `tsc --noEmit` | TypeScript type checking (no emit) |
| `test` | `vitest` | Run tests in watch mode |
| `test:run` | `vitest run` | Run tests once (CI mode) |
| `test:ui` | `vitest --ui` | Open Vitest browser UI |

---

## 7. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project REST endpoint (e.g. `https://xyz.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous (public) key — safe to expose; protected by RLS |

> The Anthropic API key is currently embedded in `aiNarrative.ts`. In a production hardening pass this should be moved to a Supabase Edge Function to prevent key exposure in browser devtools.

---

## 8. Build Output

| Asset | Cache Strategy | Notes |
|---|---|---|
| `/assets/*.js` (chunks) | `Cache-Control: max-age=31536000, immutable` | Content-hashed filenames; cached forever |
| `/assets/*.css` | `Cache-Control: max-age=31536000, immutable` | Content-hashed; cached forever |
| `/index.html` | `Cache-Control: no-cache, no-store, must-revalidate` | Always fetched fresh for new deployments |
| `/public/*.geojson` | Default Vercel (1 day) | Static geographic data |

Vite produces code-split chunks per page (lazy-loaded via `React.lazy`). The `ChunkErrorBoundary` in `App.tsx` detects stale chunk URLs after a Vercel redeploy and forces a hard reload to pick up the new bundle.

---

## 9. Security Headers (vercel.json)

Applied to all routes (`source: "/(.*)"`)

| Header | Value |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Content-Security-Policy` | See below |

**CSP breakdown**:
```
default-src 'self'
script-src  'self' 'unsafe-inline' 'unsafe-eval'
style-src   'self' 'unsafe-inline' https://fonts.googleapis.com
font-src    'self' data: https://fonts.gstatic.com
media-src   'self' data:
img-src     'self' data: https:
frame-src   https://rbis.ur.ac.rw
connect-src 'self'
            https://*.supabase.co
            wss://*.supabase.co
            https://api.anthropic.com
            https://api.gbif.org
            https://www.geoboundaries.org
            https://*.geoboundaries.org
            https://api.allorigins.win
```

---

## 10. Kiro AI Specifications (`.kiro/specs/`)

AI-assisted feature specifications stored in the `.kiro/` directory, used during development with the Kiro AI assistant for spec-driven feature implementation. Not part of the production build.

---

## 11. Known Technical Notes

| Area | Note |
|---|---|
| **Anthropic API in browser** | `anthropic-dangerous-direct-browser-access: true` is required for browser-direct API calls. The API key is exposed in network devtools. Migrate to Supabase Edge Function for production hardening. |
| **Public viewer role** | `public_viewer` role added in migration 010. The RLS policies need to be verified to ensure public_viewer cannot access restricted tables. |
| **Tool weights** | Stored in `tool_weights` DB table (migration 016) with in-code fallback constants in `types/automaticReporting.ts`. Changes to weights apply to future submissions only; historical progress is not retroactively recalculated. |
| **Progress caps** | `nbsap_targets.progress` is capped at 100 by `LEAST(100, ...)` in the trigger. It never decrements automatically below the baseline (except on report deletion). |
| **Stats cache TTL** | `getDashboardStats()` uses a 60-second in-memory cache (`_statsCache`). Cache is invalidated on `verifyReport()` and `deleteReport()`. |
| **Profile cache** | Two-layer cache (memory + sessionStorage) with 5-minute TTL. Invalidated on `refreshProfile()`, `signOut()`, and `USER_UPDATED` auth event. |
| **RBIS integration** | Currently an iframe embed. Future enhancement: direct API integration via Supabase edge function. |
| **pptxgenjs** | Listed as devDependency but used in production export functionality. Should be moved to production dependencies. |

---

*Document version: 2026-06-17 | Rwanda NBSAP Monitoring Dashboard v1.0.0*
