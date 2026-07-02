# NBSAP Monitoring System — High-Level Architecture Diagram

Copy the Mermaid code below into https://mermaid.live or any Mermaid-compatible tool to generate the diagram image, then paste into your Word document.

---

```mermaid
graph TB
    subgraph USERS["USER LAYER"]
        U1["REMA Administrator<br/>(Dashboard Management)"]
        U2["Government Ministry Reporter<br/>(Lead Reporting)"]
        U3["District Reporter<br/>(Local Reporting)"]
        U4["Policy Monitoring<br/>(Read-Only Analytics)"]
        U5["Public Viewer<br/>(External Access)"]
    end

    subgraph FRONTEND["PRESENTATION LAYER — React 18 + TypeScript + Vite"]
        direction TB
        FE1["Authentication Module<br/>Login / Role Requests / Session"]
        FE2["Executive Dashboard<br/>KPIs / Donuts / Goal Hierarchy / Attention Panel"]
        FE3["Reporting Toolkit<br/>T01-T07 Data Submission Forms"]
        FE4["GIS Map Module<br/>SVG Map / 9 Layers / 5 Overlays / District Detail"]
        FE5["Governance Module<br/>Verification Queue / Compliance / Reports"]
        FE6["NBSAP Framework<br/>22 Targets / 82 Indicators / Milestones"]
        FE7["Stakeholder Module<br/>80+ Institutions / Module Mapping"]
        FE8["System Admin<br/>User Management / Audit Log / Settings"]
    end

    subgraph SERVICES["SERVICE LAYER — Business Logic"]
        S1["Report Service<br/>Submit / Approve / Reject / Export"]
        S2["Progress Calculator<br/>Weighted Target & Indicator Progress"]
        S3["System Metrics Service<br/>Automated KPI Aggregation"]
        S4["Real-Time Update Service<br/>Supabase Subscriptions / Event Bus"]
        S5["Data Validation Service<br/>Field Validation / Data Quality"]
        S6["Organization Config Service<br/>Stakeholder-Module Mapping"]
    end

    subgraph BACKEND["DATA LAYER — Supabase (PostgreSQL + Auth + Realtime)"]
        DB1[("toolkit_reports<br/>All T01-T07 Submissions")]
        DB2[("nbsap_targets<br/>22 National Targets")]
        DB3[("indicators<br/>82 Monitoring Indicators")]
        DB4[("districts<br/>30 Rwanda Districts")]
        DB5[("profiles<br/>User Accounts & Roles")]
        DB6[("notifications<br/>System Alerts")]
        DB7[("audit_log<br/>Action History")]
        DB8[("compliance_records<br/>EIA Compliance")]
        DB9[("risks<br/>Risk Register")]
        DB10[("dashboard_metrics_live<br/>Pre-computed View")]
    end

    subgraph EXTERNAL["EXTERNAL DATA SOURCES"]
        EX1["GBIF API<br/>Species Occurrence Data"]
        EX2["GeoJSON Files<br/>Districts / Lakes / Rivers / Protected Areas"]
        EX3["RBIS<br/>Rwanda Biodiversity Information System"]
    end

    subgraph OUTPUTS["OUTPUT LAYER"]
        O1["CSV / JSON Exports"]
        O2["PNG Map Export"]
        O3["Audit Trail Reports"]
        O4["CBD NBSAP Reporting"]
    end

    USERS --> FRONTEND
    FRONTEND --> SERVICES
    SERVICES --> BACKEND
    FRONTEND --> EXTERNAL
    SERVICES --> OUTPUTS

    S4 -.->|"Real-time<br/>WebSocket"| FRONTEND

    style USERS fill:#eff6ff,stroke:#2563eb,color:#1e40af
    style FRONTEND fill:#f0fdf4,stroke:#16a34a,color:#166534
    style SERVICES fill:#fffbeb,stroke:#d97706,color:#92400e
    style BACKEND fill:#fdf2f8,stroke:#db2777,color:#be185d
    style EXTERNAL fill:#f1f5f9,stroke:#64748b,color:#334155
    style OUTPUTS fill:#faf5ff,stroke:#7c3aed,color:#6b21a8
```

---

## Architecture Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Presentation | React 18, TypeScript, Vite, Chart.js | User interface, dashboards, maps, forms |
| Service | Custom hooks, Event Bus, Zustand | Business logic, progress calculation, real-time sync |
| Data | Supabase (PostgreSQL), Row Level Security | Persistent storage, authentication, real-time subscriptions |
| External | GBIF API, GeoJSON, RBIS | Biodiversity species data, geographic boundaries |
| Output | CSV, JSON, PNG | Data exports, reporting, CBD compliance |

## Key Integration Points

1. **Supabase Real-Time** — WebSocket subscriptions push target progress updates to all connected clients instantly
2. **GBIF API** — Species occurrence data fetched and cached, feeds biodiversity index calculation per district
3. **GeoJSON** — Rwanda district boundaries, lakes, rivers, protected areas loaded from static files
4. **Event Bus** — Internal pub/sub system propagates report approvals → target progress → dashboard refresh
5. **Deterministic Progress Engine** — PostgreSQL functions (`compute_target_progress`, `compute_indicator_progress`) auto-calculate progress from approved reports
