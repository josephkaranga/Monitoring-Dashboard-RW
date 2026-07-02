# NBSAP Monitoring System — Business Process Diagram

Copy the Mermaid code below into https://mermaid.live to generate the diagram image, then paste into your Word document.

---

## 1. Main Business Process Flow

```mermaid
flowchart TD
    START([START:<br/>Reporting Period Begins]) --> A

    subgraph PHASE1["PHASE 1: DATA COLLECTION"]
        A["Stakeholder logs into<br/>NBSAP Dashboard"] --> B{"Select Reporting<br/>Module"}
        B -->|T01| T01["National Institutional<br/>Reporting"]
        B -->|T02| T02["District Biodiversity<br/>Monitoring"]
        B -->|T03| T03["Protected Area<br/>Monitoring"]
        B -->|T04| T04["Community Biodiversity<br/>Monitoring"]
        B -->|T05| T05["Biodiversity Finance<br/>Tracking"]
        B -->|T06| T06["Private Sector<br/>Compliance"]
        B -->|T07| T07["Research & Academic<br/>Contribution"]
    end

    T01 --> C
    T02 --> C
    T03 --> C
    T04 --> C
    T05 --> C
    T06 --> C
    T07 --> C

    subgraph PHASE2["PHASE 2: DATA SUBMISSION"]
        C["Select Stakeholder Organization<br/>(filtered per module)"] --> D["Select NBSAP Target<br/>(filtered per stakeholder)"]
        D --> E["Select Related Indicator<br/>(filtered per target)"]
        E --> F["Fill Form Fields<br/>(current value, budget, activities)"]
        F --> G["Attach Evidence<br/>(documents, photos)"]
        G --> H["Submit Report"]
    end

    H --> I{"Validation<br/>Check"}
    I -->|"Required fields<br/>missing"| F
    I -->|"Valid"| J

    subgraph PHASE3["PHASE 3: VERIFICATION & APPROVAL"]
        J["Report enters<br/>Verification Queue<br/>(status: pending)"] --> K{"Reviewer<br/>Decision"}
        K -->|"Approve"| L["Report Approved<br/>(status: approved)"]
        K -->|"Reject"| M["Report Rejected<br/>(status: rejected)<br/>+ Review Note"]
        M --> N["Stakeholder notified<br/>to resubmit"]
        N --> F
    end

    subgraph PHASE4["PHASE 4: AUTOMATIC PROCESSING"]
        L --> O["Progress Engine<br/>Triggered"]
        O --> P["Compute Target Progress<br/>(weighted from approved reports)"]
        P --> Q["Compute Indicator Progress<br/>(70% target + 30% approval rate)"]
        Q --> R["Update Dashboard Metrics<br/>(forest, wetland, finance, HWC, EIA)"]
        R --> S["Real-Time Broadcast<br/>via Event Bus"]
    end

    subgraph PHASE5["PHASE 5: MONITORING & DECISION SUPPORT"]
        S --> T["Executive Dashboard Updated<br/>(donuts, KPIs, attention panel)"]
        T --> U["GIS Map Updated<br/>(district colors, overlays)"]
        U --> V["Goal → Target → Indicator<br/>Hierarchy Refreshed"]
        V --> W{"Performance<br/>Check"}
        W -->|"≥70%"| X["On Track<br/>(Green)"]
        W -->|"40-69%"| Y["At Risk<br/>(Amber)"]
        W -->|"<40%"| Z["Behind<br/>(Red)"]
        Y --> AA["Adaptive Management<br/>Recommendations Generated"]
        Z --> AA
    end

    AA --> BB["Management Reviews<br/>& Takes Action"]
    X --> CC([END:<br/>Reporting Cycle Complete])
    BB --> CC

    style PHASE1 fill:#eff6ff,stroke:#2563eb,color:#1e40af
    style PHASE2 fill:#f0fdf4,stroke:#16a34a,color:#166534
    style PHASE3 fill:#fffbeb,stroke:#d97706,color:#92400e
    style PHASE4 fill:#fdf2f8,stroke:#db2777,color:#be185d
    style PHASE5 fill:#faf5ff,stroke:#7c3aed,color:#6b21a8
```

---

## 2. Report Approval Workflow

```mermaid
stateDiagram-v2
    [*] --> Draft: Stakeholder starts form
    Draft --> Submitted: Submit report
    Submitted --> Pending: Enters verification queue
    Pending --> Approved: Reviewer approves
    Pending --> Rejected: Reviewer rejects
    Rejected --> Draft: Stakeholder revises
    Approved --> ProgressUpdate: Triggers progress engine
    ProgressUpdate --> DashboardRefresh: Updates all metrics
    DashboardRefresh --> [*]

    note right of Pending
        Visible in Verification Queue
        to Lead Gov Reporter
        and REMA Administrator
    end note

    note right of Approved
        Automatically triggers:
        - Target progress recalc
        - Indicator status update
        - Dashboard KPI refresh
        - GIS map layer update
    end note
```

---

## 3. Data Flow Summary

```mermaid
flowchart LR
    subgraph SOURCES["DATA SOURCES"]
        S1["80+ Institutions"]
        S2["30 Districts"]
        S3["GBIF API"]
        S4["GeoJSON Files"]
    end

    subgraph COLLECTION["COLLECTION"]
        C1["T01-T07<br/>Reporting Forms"]
    end

    subgraph PROCESSING["PROCESSING"]
        P1["Validation"]
        P2["Approval Workflow"]
        P3["Progress Engine"]
    end

    subgraph STORAGE["STORAGE"]
        D1[("Supabase<br/>PostgreSQL")]
    end

    subgraph OUTPUTS["OUTPUTS"]
        O1["Executive Dashboard"]
        O2["GIS Map"]
        O3["NBSAP Targets & Indicators"]
        O4["CSV/JSON Exports"]
        O5["CBD National Reports"]
    end

    S1 --> C1
    S2 --> C1
    S3 --> D1
    S4 --> D1
    C1 --> P1
    P1 --> P2
    P2 --> P3
    P3 --> D1
    D1 --> O1
    D1 --> O2
    D1 --> O3
    D1 --> O4
    D1 --> O5

    style SOURCES fill:#eff6ff,stroke:#2563eb
    style COLLECTION fill:#f0fdf4,stroke:#16a34a
    style PROCESSING fill:#fffbeb,stroke:#d97706
    style STORAGE fill:#fdf2f8,stroke:#db2777
    style OUTPUTS fill:#faf5ff,stroke:#7c3aed
```

---

## Business Process Phases

| Phase | Description | Key Actors |
|-------|------------|------------|
| 1. Data Collection | Stakeholders select their reporting module (T01-T07) based on their institutional mandate | All reporters |
| 2. Data Submission | Fill form with target-linked data, attach evidence, submit | Reporters |
| 3. Verification | Reports enter queue for review by authorized reviewers | Lead Gov Reporter, REMA Admin |
| 4. Auto Processing | Approved reports trigger progress engine — target/indicator progress auto-calculated | System (automated) |
| 5. Decision Support | Dashboard, map, and hierarchy update in real-time for management review | All users (view), Management (act) |

## Key Business Rules

1. **Stakeholder filtering**: Each reporting module only shows stakeholders assigned to that tool
2. **Target filtering**: Each stakeholder only sees targets they are responsible for
3. **Indicator filtering**: Only indicators linked to the selected target are shown
4. **Progress calculation**: `Target Progress = SUM(approved_reports × tool_weight)`, clamped 0-100%
5. **Indicator progress**: `70% × target_progress + 30% × approval_rate`
6. **Status thresholds**: ≥70% = On Track (green), 40-69% = At Risk (amber), <40% = Behind (red)
7. **Real-time sync**: Approved reports trigger immediate dashboard and map updates via Supabase subscriptions
