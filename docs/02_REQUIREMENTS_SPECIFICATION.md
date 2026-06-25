# Requirements Specification Document
# Rwanda NBSAP Monitoring Dashboard 2025–2030

**Prepared for:** Rwanda Environment Management Authority (REMA)
**Document Reference:** NBSAP-RSD-2026-002
**Version:** 1.0
**Date:** June 2026
**Classification:** Official — Government Use

---

## Document Control

| Field | Value |
|---|---|
| **Document Title** | Requirements Specification Document |
| **Project** | Rwanda NBSAP Monitoring Dashboard |
| **Prepared by** | NBSAP Dashboard Development Team |
| **Approved by** | REMA — Department of Biodiversity & Landscape Management |
| **Status** | Final |

---

## 1. Introduction

### 1.1 Purpose

This document defines the functional and non-functional requirements for the Rwanda National Biodiversity Strategy and Action Plan (NBSAP) Monitoring Dashboard. It serves as the authoritative reference for system capabilities, acceptance criteria, and stakeholder expectations.

### 1.2 Scope

The NBSAP Monitoring Dashboard is a national digital platform that enables Rwanda to track progress against its 22 NBSAP 2025–2030 targets, aligned to the Kunming-Montreal Global Biodiversity Framework (KM-GBF). The system replaces manual spreadsheet-based reporting with an automated, real-time, web-based monitoring platform.

### 1.3 Intended Audience

- REMA senior management and technical staff
- Ministry of Environment (MoE) oversight personnel
- Government ICT auditors
- System administrators and maintenance teams
- Development partners and international reporting bodies

### 1.4 Regulatory Context

| Framework | Relevance |
|---|---|
| **Convention on Biological Diversity (CBD)** | Rwanda is a signatory; the system supports National Report preparation |
| **Kunming-Montreal GBF (2022)** | 23 global targets; Rwanda's 22 national targets are mapped to these |
| **Rwanda NBSAP 2025–2030** | The system's primary policy instrument |
| **Rwanda ICT Policy** | System aligns with digital government transformation objectives |
| **Data Protection Law (2021)** | User data handling complies with Rwanda's data protection requirements |

---

## 2. Stakeholder Analysis

### 2.1 Primary Stakeholders

| Stakeholder | Role in System | Key Needs |
|---|---|---|
| **REMA** | System owner, administrator | Full oversight, data verification, user management, CBD reporting |
| **Lead Government Ministries** | Data providers (T01–T07 reports) | Structured reporting tools, verification feedback, analytics |
| **District Reporting Officers** | Field-level data entry | Simple forms, evidence upload, submission tracking |
| **Policy Monitors** | Strategic oversight | Read-only dashboards, national progress summaries |
| **Development Partners** | Programme alignment | Analytical views, indicator data access |
| **General Public** | Transparency audience | View-only access to dashboards and maps |
| **CBD Secretariat** | International reporting body | Structured indicator data in exportable formats |

### 2.2 Stakeholder Interaction Model

```
CBD Secretariat ←── Export (CSV/PDF/JSON) ←── REMA Administrators
                                                    ↑
                                              Verify & Approve
                                                    ↑
                              Ministry Reporters → Submit Reports (T01–T07)
                              District Officers  → Submit Reports (T02–T04)
                                                    ↓
                              Policy Monitors    ← View Dashboards (read-only)
                              Dev Partners       ← View Analytics (read-only)
                              Public             ← View Dashboard & Map (read-only)
```

---

## 3. Functional Requirements

### 3.1 User Authentication & Account Management

| Ref | Requirement | Priority |
|---|---|---|
| FR-AUTH-01 | The system shall authenticate users via email and password using JWT tokens | Must Have |
| FR-AUTH-02 | Sessions shall auto-refresh without requiring re-login during active use | Must Have |
| FR-AUTH-03 | Administrators shall be able to suspend accounts with reason and optional end date | Must Have |
| FR-AUTH-04 | Suspended accounts shall auto-reactivate when the suspension end date passes | Should Have |
| FR-AUTH-05 | Administrators shall be able to permanently deactivate accounts | Must Have |
| FR-AUTH-06 | Users shall be able to request a role change, subject to administrator approval | Should Have |

### 3.2 Role-Based Access Control

| Ref | Requirement | Priority |
|---|---|---|
| FR-RBAC-01 | The system shall enforce 6 distinct user roles with scoped permissions | Must Have |
| FR-RBAC-02 | Each page and action shall check user role before granting access | Must Have |
| FR-RBAC-03 | Only REMA Administrators shall access user management and audit logs | Must Have |
| FR-RBAC-04 | Public Viewers shall have read-only access to dashboards, maps, targets, and indicators | Must Have |
| FR-RBAC-05 | Role changes shall follow a formal request → review → approve/reject workflow | Should Have |

### 3.3 National Target Monitoring

| Ref | Requirement | Priority |
|---|---|---|
| FR-TGT-01 | The system shall display all 22 NBSAP 2025–2030 targets with progress tracking | Must Have |
| FR-TGT-02 | Each target shall show baseline data, implementation milestones, and current progress | Must Have |
| FR-TGT-03 | Targets shall be organised by 4 KM-GBF Goals (A, B, C, D) | Must Have |
| FR-TGT-04 | Target progress shall be auto-calculated from weighted tool report data | Must Have |
| FR-TGT-05 | A 3-colour progress system (green/amber/red) shall indicate status visually | Must Have |

### 3.4 Indicator Framework

| Ref | Requirement | Priority |
|---|---|---|
| FR-IND-01 | The system shall track ~80 indicators across 4 tiers: Headline, Component, Binary, Complementary | Must Have |
| FR-IND-02 | Each indicator shall display baseline, current value, midterm target, and 2030 target | Must Have |
| FR-IND-03 | Indicators shall be linked to their parent NBSAP target | Must Have |
| FR-IND-04 | Indicator status (on-track / at-risk / behind) shall be tracked and displayed | Must Have |
| FR-IND-05 | Indicators shall follow KM-GBF 3-tier reporting structure for CBD compatibility | Must Have |

### 3.5 Reporting Toolkit (T01–T07)

| Ref | Requirement | Priority |
|---|---|---|
| FR-RPT-01 | The system shall provide 7 structured reporting tools covering all NBSAP sectors | Must Have |
| FR-RPT-02 | T01: National Institutional Reporting — institution, budget, compliance score, policy progress | Must Have |
| FR-RPT-03 | T02: Ecosystem & Habitat Monitoring — district, forest ha, wetland ha, land cover change | Must Have |
| FR-RPT-04 | T03: Protected Area Management — area name, coverage, management effectiveness, illegal cases | Must Have |
| FR-RPT-05 | T04: Human-Wildlife Conflict — incident type, district, species, HWC cases, mitigation | Must Have |
| FR-RPT-06 | T05: Finance & Resource Mobilisation — budget allocated, disbursed, finance source | Must Have |
| FR-RPT-07 | T06: Private Sector EIA Compliance — company, EIA status, sector, restoration commitments | Must Have |
| FR-RPT-08 | T07: Community Engagement — community name, district, participants, traditional knowledge | Must Have |
| FR-RPT-09 | Each report shall support file/evidence attachments (documents, images) | Must Have |
| FR-RPT-10 | Submitted reports shall default to 'pending' status awaiting verification | Must Have |

### 3.6 Data Verification Queue

| Ref | Requirement | Priority |
|---|---|---|
| FR-VRF-01 | All submitted reports shall enter a mandatory verification queue | Must Have |
| FR-VRF-02 | Authorised reviewers shall be able to approve or reject submissions with written rationale | Must Have |
| FR-VRF-03 | Approved reports shall automatically update national metrics via database triggers | Must Have |
| FR-VRF-04 | Rejected submissions shall notify the original reporter with the rejection reason | Must Have |
| FR-VRF-05 | If an approved report is later deleted, all metric effects shall be automatically reversed | Must Have |

### 3.7 Dashboard & Visualisation

| Ref | Requirement | Priority |
|---|---|---|
| FR-DSH-01 | The dashboard shall display an executive summary of national biodiversity status | Must Have |
| FR-DSH-02 | 13 automated system metrics shall be displayed with real-time values | Must Have |
| FR-DSH-03 | An interactive map shall show all 30 districts across 5 provinces | Must Have |
| FR-DSH-04 | Map layers shall include protected areas, river networks, lakes, and species occurrences | Must Have |
| FR-DSH-05 | District-level compliance tracking shall be visible on the map | Should Have |
| FR-DSH-06 | Charts shall visualise indicator trends and target progress | Must Have |

### 3.8 Geographic Information System (GIS)

| Ref | Requirement | Priority |
|---|---|---|
| FR-GIS-01 | The system shall render an interactive map of Rwanda with district boundaries | Must Have |
| FR-GIS-02 | GeoJSON layers shall display protected areas, rivers, and lakes | Must Have |
| FR-GIS-03 | GBIF species occurrence data shall be overlaid on the map | Should Have |
| FR-GIS-04 | Users shall be able to toggle map layers on/off | Must Have |
| FR-GIS-05 | District detail panels shall display compliance and reporting status | Should Have |

### 3.9 Data Export & CBD Reporting

| Ref | Requirement | Priority |
|---|---|---|
| FR-EXP-01 | The system shall export data in CSV format for spreadsheet analysis | Must Have |
| FR-EXP-02 | The system shall export formatted PDF reports for distribution | Must Have |
| FR-EXP-03 | The system shall export structured JSON for system interoperability | Should Have |
| FR-EXP-04 | Export formats shall support direct use in CBD National Report preparation | Must Have |

### 3.10 Audit & Compliance

| Ref | Requirement | Priority |
|---|---|---|
| FR-AUD-01 | The system shall maintain an immutable, append-only audit log of all system actions | Must Have |
| FR-AUD-02 | The audit log shall record user identity, action type, timestamp, and affected data | Must Have |
| FR-AUD-03 | A risk register shall track identified biodiversity risks with severity levels | Should Have |
| FR-AUD-04 | Compliance records shall track adherence to regulatory frameworks | Should Have |

### 3.11 External System Integration

| Ref | Requirement | Priority |
|---|---|---|
| FR-INT-01 | The system shall integrate with GBIF API for species occurrence data (Rwanda) | Must Have |
| FR-INT-02 | The system shall integrate with RBIS (Rwanda Biodiversity Information System) | Should Have |
| FR-INT-03 | GBIF API calls shall be rate-limited to 1 request/second (client-side enforcement) | Must Have |
| FR-INT-04 | A Supabase Edge Function shall proxy GBIF requests to avoid CORS issues | Should Have |

### 3.12 Notifications

| Ref | Requirement | Priority |
|---|---|---|
| FR-NTF-01 | In-app notifications shall alert users of relevant events (report status changes, role approvals) | Must Have |
| FR-NTF-02 | Real-time WebSocket push shall deliver notifications without page refresh | Should Have |

---

## 4. Non-Functional Requirements

### 4.1 Performance

| Ref | Requirement | Target |
|---|---|---|
| NFR-PERF-01 | Initial page load time | < 3 seconds on 4G connection |
| NFR-PERF-02 | API response time for standard queries | < 500ms |
| NFR-PERF-03 | Dashboard metrics refresh interval | Real-time via WebSocket |
| NFR-PERF-04 | Concurrent user capacity | 500 users |
| NFR-PERF-05 | Report storage capacity | 10,000+ reports |

### 4.2 Security

| Ref | Requirement |
|---|---|
| NFR-SEC-01 | All traffic shall be encrypted via HTTPS/TLS |
| NFR-SEC-02 | Row-Level Security (RLS) shall enforce data access at the database level |
| NFR-SEC-03 | Security headers (CSP, X-Frame-Options, X-Content-Type-Options) shall be applied |
| NFR-SEC-04 | JWT tokens shall be used for authentication with automatic refresh |
| NFR-SEC-05 | Passwords shall be hashed using bcrypt (via Supabase Auth) |
| NFR-SEC-06 | All data modifications shall be logged in the immutable audit trail |

### 4.3 Availability & Reliability

| Ref | Requirement | Target |
|---|---|---|
| NFR-AVL-01 | System uptime | 99.5% annually |
| NFR-AVL-02 | Database backup frequency | Daily (automated) |
| NFR-AVL-03 | Recovery Point Objective (RPO) | 24 hours |
| NFR-AVL-04 | Recovery Time Objective (RTO) | 4 hours |

### 4.4 Usability

| Ref | Requirement |
|---|---|
| NFR-USB-01 | The system shall be responsive across desktop, tablet, and mobile devices |
| NFR-USB-02 | The interface shall use consistent colour coding (green/amber/red) for status |
| NFR-USB-03 | All interactive elements shall have ARIA labels for screen reader accessibility |
| NFR-USB-04 | The system shall meet WCAG 2.1 Level AA colour contrast requirements |

### 4.5 Maintainability

| Ref | Requirement |
|---|---|
| NFR-MNT-01 | The codebase shall use TypeScript for type safety and maintainability |
| NFR-MNT-02 | Database schema changes shall be managed through numbered migration files |
| NFR-MNT-03 | The system shall support zero-downtime deployments via CI/CD |
| NFR-MNT-04 | Comprehensive technical documentation shall be maintained |

### 4.6 Scalability

| Ref | Requirement |
|---|---|
| NFR-SCL-01 | The architecture shall support horizontal scaling through serverless deployment |
| NFR-SCL-02 | Static assets shall be served via global CDN for geographic distribution |
| NFR-SCL-03 | Database queries shall be optimised with 20+ indexes on frequently accessed columns |

---

## 5. Data Requirements

### 5.1 Data Sources

| Source | Type | Frequency | Description |
|---|---|---|---|
| **Manual Entry** | Structured forms | Quarterly / Ad hoc | T01–T07 reporting toolkit submissions |
| **GBIF API** | Automated feed | Real-time | Species occurrence records for Rwanda |
| **RBIS API** | Automated feed | Real-time | Rwanda Biodiversity Information System data streams |
| **GeoJSON Files** | Static reference | At deployment | District boundaries, protected areas, rivers, lakes |

### 5.2 Data Retention

| Data Category | Retention Period | Rationale |
|---|---|---|
| Audit logs | Indefinite | Regulatory compliance |
| Submitted reports | Duration of NBSAP period (2025–2030) | National reporting obligation |
| User profiles | Duration of account + 1 year | Data protection compliance |
| Indicator data | Indefinite | Historical trend analysis |

### 5.3 Data Quality Controls

1. **Structured forms** — All data entry via controlled fields with validation rules
2. **Mandatory verification** — No data affects national metrics until approved
3. **Audit trail** — Every modification is logged with user identity and timestamp
4. **Automated calculations** — Database triggers ensure consistency (no manual metric computation)
5. **Reversal on deletion** — Deleting an approved report auto-reverses its metric impact

---

## 6. Constraints & Assumptions

### 6.1 Constraints

| Constraint | Description |
|---|---|
| **Budget** | System designed for minimal operational cost (free/low-tier cloud services) |
| **Connectivity** | Users in districts may have limited bandwidth; system optimised for low-bandwidth |
| **Browser** | IE11 not supported; modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+) required |
| **Language** | Current version is English-only |

### 6.2 Assumptions

| Assumption | Rationale |
|---|---|
| District officers have internet access | Rwanda's national broadband coverage exceeds 95% of urban areas |
| REMA will designate system administrators | Ongoing user and data management requires institutional commitment |
| GBIF API will remain publicly accessible | GBIF is a multilateral research infrastructure with long-term funding |
| Supabase will maintain service availability | Supabase provides managed PostgreSQL with 99.9% uptime SLA |

---

## 7. Acceptance Criteria Summary

| Category | Criterion |
|---|---|
| **Authentication** | Users can register, log in, and maintain sessions without re-authentication |
| **RBAC** | Each of the 6 roles can access only their authorised pages and actions |
| **Reporting** | All 7 reporting tools (T01–T07) accept, validate, and store submissions |
| **Verification** | The approval/rejection workflow operates correctly with metric auto-update |
| **Dashboard** | The executive dashboard displays all 13 automated metrics accurately |
| **Map** | The interactive map renders all 30 districts with toggleable GeoJSON layers |
| **Export** | CSV, PDF, and JSON exports produce correct, complete data |
| **Audit** | The audit log records all significant system actions immutably |
| **Performance** | The system loads within 3 seconds and supports 500 concurrent users |
| **Security** | RLS, HTTPS, CSP headers, and JWT authentication are all operational |

---

*Prepared by: NBSAP Dashboard Development Team*
*Document Reference: NBSAP-RSD-2026-002*
*Rwanda Environment Management Authority (REMA)*
