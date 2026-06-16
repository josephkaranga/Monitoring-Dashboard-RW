warning: in the working copy of 'ReportingToolkitPage.tsx', LF will be replaced by CRLF the next time Git touches it
[1mdiff --git a/ReportingToolkitPage.tsx b/ReportingToolkitPage.tsx[m
[1mindex a950492..b3187ff 100644[m
[1m--- a/ReportingToolkitPage.tsx[m
[1m+++ b/ReportingToolkitPage.tsx[m
[36m@@ -12,7 +12,7 @@[m [mimport { validateYear } from './src/utils/validation';[m
 const TOOLKIT_TOOLS = [[m
   { id: 'T01', name: 'National Institutional Reporting', icon: '🏛️', color: '#1B6CA8', accent: '#4CA3DD', frequency: 'Quarterly', output: 'Institutional Compliance Scorecard',[m
     fields: [[m
[31m-      { key: 'institution', label: 'Reporting Institution', type: 'select', options: ['Environment Ministry','Agriculture Ministry','Infrastructure Ministry','Forestry Authority','Wildlife Authority','National Statistics Office','Water Resources Authority'], required: true },[m
[32m+[m[32m      { key: 'institution', label: 'Reporting Institution', type: 'select', options: ['Ministry of Environment (MoE)','Ministry of Agriculture and Animal Resources (MINAGRI),','Infrastructure Ministry','Rwanda Forestry Authority (RFA)','Wildlife Authority','National Institute of Statistics Rwanda (NISR)','Rwanda Water Resources Board (RWB),'], required: true },[m
       { key: 'period', label: 'Reporting Period', type: 'select', options: ['Q1 2025','Q2 2025','Q3 2025','Q4 2025','Q1 2026','Q2 2026','Q3 2026','Q4 2026','Q1 2027','Q2 2027','Q3 2027','Q4 2027','Q1 2028','Q2 2028','Q3 2028','Q4 2028','Q1 2029','Q2 2029','Q3 2029','Q4 2029','Q1 2030','Q2 2030','Q3 2030','Q4 2030'], required: true },[m
       { key: 'nbsap_target', label: 'NBSAP Target Number', type: 'text', placeholder: 'e.g. TARGET-03', required: true },[m
       { key: 'current_status', label: 'Current Status / Value', type: 'number', placeholder: '0', required: true },[m
[36m@@ -64,7 +64,7 @@[m [mconst TOOLKIT_TOOLS = [[m
   { id: 'T05', name: 'Biodiversity Finance Tracking', icon: '💰', color: '#0E6655', accent: '#1ABC9C', frequency: 'Annual', output: 'Finance Gap Analysis',[m
     fields: [[m
       { key: 'institution', label: 'Institution Name', type: 'text', placeholder: 'Institution or partner', required: true },[m
[31m-      { key: 'institution_type', label: 'Institution Type', type: 'select', options: ['Ministry of Finance','Environment Ministry','Development Partner','NGO','Private Sector','Other'], required: true },[m
[32m+[m[32m      { key: 'institution_type', label: 'Institution Type', type: 'select', options: ['Ministry of Finance','Ministry of Environment (MoE)','Development Partner','NGO','Private Sector','Other'], required: true },[m
       { key: 'year', label: 'Fiscal Year', type: 'select', options: ['2020','2021','2022','2023','2024','2025','2026','2027','2028','2029','2030'], required: true },[m
       { key: 'budget_allocated', label: 'Budget Allocated (RWF)', type: 'number', placeholder: '0', required: true },[m
       { key: 'budget_disbursed', label: 'Budget Disbursed (RWF)', type: 'number', placeholder: '0', required: true },[m
