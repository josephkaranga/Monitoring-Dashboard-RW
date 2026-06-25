# DATA FLOW DIAGRAMS
## Rwanda NBSAP Monitoring Dashboard

---

## 1. System-Level Data Flow Overview

```mermaid
flowchart TD
    subgraph Users["External Users"]
        DO["District Officer<br/>(local_reporting)"]
        MF["Ministry Reporter<br/>(lead_government_ministry_reporting)"]
        REMA["REMA Admin<br/>(dashboard_management)"]
        PV["Policy Monitor / Partner<br/>(policy_monitoring / programme_alignment)"]
        PUB["Public Viewer"]
    end

    subgraph Frontend["Frontend — Vercel CDN"]
        RT["Reporting Toolkit<br/>(T01–T07 Forms)"]
        VQ["Verification Queue"]
        DASH["Dashboard<br/>(live metrics)"]
        IND["Indicators Page"]
        TAR["National Targets Page"]
        MAP["Map View"]
        REP["Reports & Analytics"]
        UM["User Management"]
    end

    subgraph Supabase["Supabase Backend"]
        AUTH["Auth Service (JWT)"]
        DB["PostgreSQL + RLS"]
        STOR["Storage (S3)"]
        RT_WS["Realtime (WebSocket)"]
        EDGE["Edge Function (GBIF Proxy)"]
    end

    subgraph ExternalAPIs["External APIs"]
        CLAUDE["Anthropic Claude API<br/>(claude-sonnet-4-20250514)"]
        GBIF["GBIF API<br/>(species data)"]
        RBIS_SYS["RBIS System<br/>(rbis.ur.ac.rw)"]
    end

    DO & MF -->|Submit reports| RT
    RT -->|HTTPS + JWT| DB
    REMA -->|Review| VQ
    VQ -->|Approve/Reject| DB
    DB -->|DB Triggers| DB
    DB -->|WebSocket push| RT_WS
    RT_WS -->|Live updates| DASH & TAR & IND

    PV & PUB -->|Read-only| DASH & IND & TAR & MAP
    DASH -->|"On-demand click"| CLAUDE
    CLAUDE -->|AI narrative| DASH

    RT -->|File upload| STOR
    MAP -->|Species data| EDGE -->|Proxy| GBIF
    MAP -->|iframe| RBIS_SYS

    ALL_USERS["All authenticated users"] -->|Session| AUTH
    AUTH -->|JWT| DB
```

---

## 2. Report Submission Flow (Detailed)

```mermaid
sequenceDiagram
    participant U as User (Reporter)
    participant FE as React Frontend
    participant Storage as Supabase Storage
    participant DB as PostgreSQL
    participant Trigger as DB Triggers
    participant AI as Claude API (async)
    participant WS as Realtime WebSocket
    participant Admin as Reviewer

    U->>FE: Fill T01–T07 form
    U->>FE: Select NBSAP Target + Indicator
    U->>FE: Upload evidence files (PDF/image)

    FE->>Storage: Upload each file → report-attachments/{userId}/{ts}_{name}
    Storage-->>FE: storage_path per file

    FE->>DB: INSERT into toolkit_reports<br/>{ tool_id, form_data (JSONB), attachments, nbsap_target_id, status:'pending' }
    DB-->>FE: Report row (with id, submitted_at)

    Note over FE,AI: triggerExtraction(report) — fire and forget
    FE->>AI: POST /v1/messages (report text + form_data)
    AI-->>DB: INSERT ai_extractions + ai_extraction_proposals (async)

    DB-->>WS: postgres_changes event (INSERT on toolkit_reports)
    WS-->>Admin: Real-time notification (new pending submission)

    Admin->>FE: Open Verification Queue
    FE->>DB: SELECT toolkit_reports WHERE status='pending'
    DB-->>FE: Pending reports list

    Admin->>FE: Click Approve + optional note

    FE->>DB: UPDATE toolkit_reports SET status='approved', reviewed_by=?, reviewed_at=NOW()
    
    DB->>Trigger: AFTER UPDATE fires trigger_update_target_progress
    Trigger->>DB: get_tool_weight(tool_id) FROM tool_weights
    Trigger->>DB: UPDATE nbsap_targets SET progress = LEAST(100, prev + CEIL(20 × weight))
    Trigger->>DB: UPDATE indicators SET status = (on-track|at-risk|behind)
    Trigger->>DB: INSERT audit_log { action_type:'progress_update', detail: JSON calc }

    DB->>Trigger: AFTER UPDATE fires trigger_update_system_metrics
    Trigger->>DB: UPDATE system_metrics (forest_ha, wetland_ha, finance, hwc, eia, districts...)

    DB-->>WS: postgres_changes event (UPDATE on toolkit_reports)
    WS-->>U: Real-time dashboard refresh
    WS-->>Admin: Dashboard metrics update

    Note over Admin,U: All connected browsers see updated progress instantly
```

---

## 3. Authentication & Session Flow

```mermaid
flowchart TD
    subgraph Browser["Browser Session"]
        LS["localStorage<br/>(nbsap-auth-token)"]
        SS["sessionStorage<br/>(nbsap_profile_cache, 5 min TTL)"]
        MEM["In-memory profileCache<br/>(5 min TTL)"]
    end

    subgraph AuthFlow["Authentication Flow"]
        A1["User visits app"]
        A2["Supabase.auth.onAuthStateChange()"]
        A3{{"INITIAL_SESSION event"}}
        A4{{"Session valid?"}}
        A5["Redirect → /auth"]
        A6["signInWithPassword()"]
        A7["Load JWT + user.id"]

        P1{{"Check in-memory cache"}}
        P2{{"Check sessionStorage cache"}}
        P3["SELECT profiles WHERE id = user.id"]
        P4["checkAccountStatus()"]

        P5{{"is_active = false?"}}
        P6{{"suspended_at IS NOT NULL?"}}
        P7{{"suspension_end_date < NOW()?"}}

        P8["Force signOut + error toast"]
        P9["Auto-clear suspension (DB UPDATE)"]
        P10["dispatch SET_SESSION"]
        P11["Update last_login (background)"]
        P12["Load user_settings (background)"]
        P13["Render dashboard"]
    end

    A1 --> A2 --> A3 --> A4
    A4 -->|No| A5 --> A6 --> A7 --> P1
    A4 -->|Yes| P1
    P1 -->|HIT| P4
    P1 -->|MISS| P2
    P2 -->|HIT| P4
    P2 -->|MISS| P3 --> P4
    P3 --> MEM
    P3 --> SS

    P4 --> P5
    P5 -->|Yes| P8
    P5 -->|No| P6
    P6 -->|Yes| P7
    P6 -->|No| P10
    P7 -->|Yes| P9 --> P10
    P7 -->|No| P8

    P10 --> P11 & P12 --> P13
```

---

## 4. Automated Metrics Update Flow

```mermaid
flowchart TD
    subgraph Trigger["DB Trigger Chain (on toolkit_reports UPDATE/INSERT)"]
        Report["toolkit_reports row<br/>status = 'approved'<br/>nbsap_target_id IS NOT NULL"]

        subgraph T1["Trigger 1: target progress"]
            W1["get_tool_weight(tool_id)"]
            W2["weighted = 20 × weight"]
            W3["new_progress = LEAST(100, old + CEIL(weighted))"]
            W4["UPDATE nbsap_targets SET progress = new_progress"]
            W5["UPDATE indicators SET status = (on-track|at-risk|behind)"]
            W6["INSERT audit_log (progress_update)"]
        end

        subgraph T2["Trigger 2: system metrics"]
            M1{{"tool_id == 'T02'?"}}
            M2["forest_ha_total += forest_ha"]
            M3["wetland_ha_total += wetland_ha"]
            M4["districts_reporting = COUNT DISTINCT district"]

            M5{{"tool_id == 'T03'?"}}
            M6["forest_ha_total += coverage_change_ha + restoration_ha"]
            M7["protected_areas_monitored = COUNT DISTINCT area_name"]
            M8["hwc_incidents_total += illegal_cases"]

            M9{{"tool_id == 'T04'?"}}
            M10["hwc_incidents_total += hwc_incidents"]

            M11{{"tool_id == 'T05'?"}}
            M12["finance_rwf_allocated += budget_allocated"]
            M13["finance_rwf_disbursed += budget_disbursed"]

            M14{{"tool_id == 'T06'?"}}
            M15{{"eia_compliance = ?"}}
            M16["eia_full += 1"]
            M17["eia_partial += 1"]
            M18["eia_non += 1"]
            M19["companies_reporting = COUNT DISTINCT company"]
            M20["restoration_commitments_ha += restoration_ha"]

            M21{{"tool_id == 'T01'?"}}
            M22["finance_rwf_utilized += budget_utilized"]
        end

        subgraph View["Live View"]
            V1["dashboard_metrics_live VIEW<br/>(auto-refreshes on next SELECT)"]
        end
    end

    Report --> T1 & T2
    T1 --> W1 --> W2 --> W3 --> W4 --> W5 --> W6
    T2 --> M1
    M1 -->|Yes| M2 & M3 & M4
    T2 --> M5
    M5 -->|Yes| M6 & M7 & M8
    T2 --> M9
    M9 -->|Yes| M10
    T2 --> M11
    M11 -->|Yes| M12 & M13
    T2 --> M14
    M14 -->|Yes| M15
    M15 -->|Full| M16
    M15 -->|Partial| M17
    M15 -->|Non-compliant| M18
    M14 -->|Yes| M19 & M20
    T2 --> M21
    M21 -->|Yes| M22
    T2 --> View
```

---

## 5. Delete Reversal Flow

```mermaid
sequenceDiagram
    participant Admin as REMA Admin
    participant FE as Frontend
    participant DB as PostgreSQL
    participant Trigger as DB Triggers
    participant EventBus as eventBus

    Admin->>FE: Click Delete Report
    FE->>DB: SELECT report (tool_id, status, target_id, period)
    DB-->>FE: Report metadata

    FE->>DB: DELETE FROM toolkit_reports WHERE id = ?
    
    DB->>Trigger: AFTER DELETE — trigger_update_target_progress fires
    Note over Trigger: Status is no longer 'approved' → progress DECREMENTS
    Trigger->>DB: Recalculate nbsap_targets.progress (subtract contribution)
    Trigger->>DB: Recalculate indicators.status

    DB->>Trigger: AFTER DELETE — trigger_update_system_metrics fires
    Trigger->>DB: Recalculate all affected system_metrics FROM SCRATCH
    Note over Trigger: recalculate_system_metrics() rebuilds from all remaining approved reports

    FE->>DB: INSERT audit_log { action_type:'delete', detail: report metadata }

    FE->>EventBus: emit('dashboard-refresh', {})
    FE->>EventBus: emit('target-progress-updated', { targetId })
    EventBus-->>FE: All subscribed dashboard components re-fetch data

    Note over Admin,FE: Dashboard metrics auto-reverse; no manual correction needed
```

---

## 6. AI Extraction Flow

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant DB as PostgreSQL
    participant ExtrSvc as aiExtractionService.ts
    participant Claude as Anthropic Claude API
    participant Reviewer as Admin Reviewer

    FE->>DB: INSERT toolkit_reports (submission)
    DB-->>FE: Report with id

    Note over FE,ExtrSvc: Fire-and-forget (non-blocking)
    FE->>ExtrSvc: triggerExtraction(report)

    ExtrSvc->>DB: INSERT ai_extractions { report_id, status:'processing' }
    
    ExtrSvc->>ExtrSvc: Concatenate form_data fields into raw_text
    ExtrSvc->>ExtrSvc: Extract text from attachments (if any)

    ExtrSvc->>Claude: POST /v1/messages<br/>{ model, messages: [{ role:'user', content: analysisPrompt }] }
    Claude-->>ExtrSvc: extraction_result JSONB

    ExtrSvc->>DB: UPDATE ai_extractions SET status='complete', extraction_result=?

    loop For each progress update / proposal
        ExtrSvc->>DB: INSERT ai_extraction_proposals<br/>{ proposal_type, target_id, indicator_id, proposed_value, confidence_score, reasoning }
    end

    Reviewer->>FE: Open report in Verification Queue
    FE->>DB: SELECT ai_extractions WHERE report_id = ?
    DB-->>FE: Extraction result + proposals

    Reviewer->>FE: Review each proposal (Approve / Reject / Modify)
    FE->>DB: UPDATE ai_extraction_proposals SET status=?, reviewer_id=?, modified_value=?

    alt Proposal approved
        FE->>DB: Apply proposed_value to nbsap_targets or indicators
    else Proposal modified
        FE->>DB: Apply modified_value instead
    end
```

---

## 7. Role Change Workflow

```mermaid
stateDiagram-v2
    [*] --> Submitted: User submits role change request<br/>(justification ≥ 20 chars)

    Submitted --> PendingReview: DB INSERT → role_change_requests<br/>on_role_request_created trigger fires<br/>→ Notifications sent to all active admins

    PendingReview --> UnderReview: Admin opens Role Requests page

    UnderReview --> Approved: Admin clicks Approve<br/>(reviewed_by ≠ user_id constraint)
    UnderReview --> Rejected: Admin clicks Reject<br/>(rejection_reason ≥ 10 chars required)
    UnderReview --> Stale: 30 days pass without action<br/>flag_stale_role_requests()

    Approved --> RoleUpdated: on_role_request_approved trigger fires<br/>→ UPDATE profiles SET role = to_role<br/>→ INSERT audit_log (role_updated)
    Rejected --> NotifyUser: on_role_request_decided trigger fires<br/>→ INSERT notifications for requester<br/>is_notified = TRUE

    RoleUpdated --> NotifyUser

    NotifyUser --> [*]: User sees in-app notification

    PendingReview --> Cancelled: User cancels own pending request
    Cancelled --> [*]
    Stale --> [*]
```

---

## 8. Real-time Data Subscription Flow

```mermaid
flowchart LR
    subgraph DB["PostgreSQL (Supabase)"]
        TR["toolkit_reports"]
        NOTIF["notifications"]
    end

    subgraph Realtime["Supabase Realtime Engine"]
        WS["WebSocket Server<br/>(wss://*.supabase.co)"]
        CH1["Channel: toolkit_reports_changes:{random}<br/>Event: * (INSERT|UPDATE|DELETE)"]
        CH2["Channel: notifications:{userId}<br/>Event: INSERT<br/>Filter: user_id=eq.{id}"]
    end

    subgraph FE["React Frontend Components"]
        DashComp["DashboardPage<br/>→ refresh stats on any event"]
        RepComp["ReportsPage<br/>→ refresh list on any event"]
        NotifBell["Notification Bell<br/>→ show new notification"]
    end

    TR -->|WAL (Write-Ahead Log)| WS
    NOTIF -->|WAL| WS
    WS --> CH1 --> DashComp & RepComp
    WS --> CH2 --> NotifBell

    Note1["Rate limit: 10 events/second<br/>Channel is random per session to<br/>prevent duplicate subscriptions"]
```

---

## 9. Map Data Flow

```mermaid
flowchart TD
    subgraph MapSources["Data Sources for MapPage"]
        GeoJSON1["/public/rwanda-districts.geojson<br/>(static, all 30 districts)"]
        GeoJSON2["/public/rwanda-protected-areas.geojson<br/>(static, PA boundaries)"]
        GeoJSON3["/public/rwanda-rivers.geojson<br/>(static, river network)"]
        GeoJSON4["/public/rwanda-lakes.geojson<br/>(static, lake polygons)"]
        GBIF_Proxy["Supabase Edge Function: /gbif-proxy/*<br/>(proxies GBIF API calls)"]
        RBIS_iFrame["RBIS iframe<br/>(https://rbis.ur.ac.rw)"]
        Districts_DB["Supabase: districts table<br/>(status, compliance, forest_cover)"]
        Indicators_DB["Supabase: indicators table<br/>(progress per target)"]
        Risks_DB["Supabase: risks table<br/>(threat scores)"]
    end

    subgraph MapLayers["Map Layer Types"]
        L1["District Layer<br/>(color = reporting status)"]
        L2["Protected Areas Overlay"]
        L3["River Network Overlay"]
        L4["Lakes Overlay"]
        L5["Species Occurrences Layer<br/>(GBIF points)"]
        L6["Indicator Progress Layer<br/>(choropleth — avg progress)"]
        L7["Risk/Threat Layer<br/>(threat score per district)"]
    end

    subgraph Hooks["Custom Hooks"]
        H1["useMapLayers.ts"]
        H2["useProtectedAreas.ts"]
        H3["useRiverNetwork.ts"]
        H4["useLakes.ts"]
        H5["useGBIF*.ts (GBIF data)"]
    end

    GeoJSON1 --> H1 --> L1
    GeoJSON2 --> H2 --> L2
    GeoJSON3 --> H3 --> L3
    GeoJSON4 --> H4 --> L4
    GBIF_Proxy --> H5 --> L5
    Districts_DB --> L1
    Indicators_DB --> L6
    Risks_DB --> L7
    RBIS_iFrame -->|Biodiversity data iframe| MapPage["MapPage / BiodiversityDataPage"]
```

---

## 10. Dashboard Stats Calculation Flow

```mermaid
flowchart TD
    subgraph Cache["Stats Cache (60s TTL)"]
        StatsCache["_statsCache<br/>{ data, ts }"]
    end

    subgraph Fetch["getDashboardStats() — Promise.all"]
        Q1["SELECT tool_id, status, form_data FROM toolkit_reports"]
        Q2["SELECT status, progress, tier FROM indicators"]
        Q3["SELECT status, compliance FROM districts"]
        Q4["SELECT id FROM compliance_records WHERE is_resolved=false"]
        Q5["SELECT id FROM nbsap_targets (COUNT)"]
    end

    subgraph Calc["buildStats() Calculations"]
        C1["totalSubmissions = reports.length"]
        C2["pendingVerifications = filter(status='pending').length"]
        C3["reportsByTool = group by tool_id"]
        C4["forestHa = SUM T02.approved.form_data.forest_ha"]
        C5["wetlandHa = SUM T02.approved.form_data.wetland_ha"]
        C6["hwcIncidents = SUM T04.approved.form_data.hwc_incidents"]
        C7["financeAllocated = SUM T05.approved.form_data.budget_allocated"]
        C8["financeDisbursed = SUM T05.approved.form_data.budget_disbursed"]
        C9["onTrack/atRisk/behind = filter by indicator.status"]
        C10["avgProgress = SUM(progress) / count"]
        C11["activeDistricts = '{submitted}/{total}'"]
        C12["headlineCount = filter(tier='headline').length"]
    end

    subgraph Output["DashboardStats object"]
        O1["Passed to metric cards, charts, AI narrative"]
    end

    StatsCache -->|HIT (< 60s)| O1
    StatsCache -->|MISS| Fetch
    Q1 & Q2 & Q3 & Q4 & Q5 --> Calc
    Calc --> C1 & C2 & C3 & C4 & C5 & C6 & C7 & C8 & C9 & C10 & C11 & C12
    C1 & C2 & C3 & C4 & C5 & C6 & C7 & C8 & C9 & C10 & C11 & C12 --> O1
    O1 --> StatsCache
```

---

## 11. AI Narrative Generation Flow

```mermaid
sequenceDiagram
    participant User as Dashboard User
    participant FE as DashboardPage
    participant Stats as getDashboardStats()
    participant AINarr as aiNarrative.ts
    participant Claude as Anthropic Claude API

    User->>FE: Click "Generate Insight" button
    FE->>Stats: getDashboardStats()
    Stats-->>FE: DashboardStats { onTrack, atRisk, behind, avgProgress, forestHa, financeAllocated, disbGap, ... }

    FE->>AINarr: generateAINarrative(stats)

    AINarr->>AINarr: Build dataSnapshot string (live metrics)
    AINarr->>AINarr: Build prompt (3-paragraph policy narrative)

    AINarr->>Claude: POST https://api.anthropic.com/v1/messages<br/>{ model: 'claude-sonnet-4-20250514', max_tokens: 500,<br/>  messages: [{ role:'user', content: prompt }] }

    alt API Success
        Claude-->>AINarr: { content: [{ text: "Rwanda's NBSAP..." }] }
        AINarr-->>FE: Policy narrative string (200–240 words)
    else API Error / Timeout
        Claude-->>AINarr: Error response
        AINarr->>AINarr: generateFallbackNarrative(stats, disbGap)
        AINarr-->>FE: Data-driven fallback narrative
    end

    FE->>User: Display narrative in AI Insight panel
```

---

*Document version: 2026-06-17 | Rwanda NBSAP Monitoring Dashboard v1.0.0*
