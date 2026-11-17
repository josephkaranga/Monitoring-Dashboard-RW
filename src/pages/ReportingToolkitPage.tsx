import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useReports } from '../hooks/useData';
import {
  submitReport,
  processReportAutomatic,
  exportReportsToCSV,
  exportReportsToJSON,
  deleteReport,
  importReportsFromJSON,
} from '../services/reportService';
import { organizationConfigService } from '../services/organizationConfigService';
import {
  writeAuditEntry,
  fetchUserResponsibleTargets,
  fetchIndicators,
  fetchDistricts,
  updateDistrictStatus,
} from '../services/dataService';
import { useAuth } from '../services/AuthContext';
import { eventBus } from '../services/eventBus';
import toast from 'react-hot-toast';
import type {
  Institution,
  ReportType,
  ReportAttachment,
  NBSAPTarget,
  Indicator,
  District,
} from '../types/index';
import { supabase } from '../utils/supabase';
import { formatFieldLabel, formatFieldValue } from '../utils/formData';
import { validateYear } from '../utils/validation';
import { groupStakeholders, STAKEHOLDER_CATEGORIES } from '../utils/stakeholderGroups';
import { useInstitutions, useMyScopes } from '../hooks/useInstitutions';
import { allowedDistrictIds } from '../services/institutionService';
import ResubmitReportModal from '../components/ResubmitReportModal';
import DraftStatusBar from '../components/DraftStatusBar';
import TwoStepStakeholderSelect from '../components/TwoStepStakeholderSelect';
import { useDraftAutosave } from '../hooks/useDraftAutosave';
import DataQualityChecklist from '../components/DataQualityChecklist';
import QualityFlagsList from '../components/QualityFlagsList';
import { useChecklistItems, useQualityPreview } from '../hooks/useDataQuality';
import { emptyDeclaration, isChecklistComplete } from '../utils/dataQuality';
import type { DqaDeclaration } from '../types/index';
import {
  deleteDraft,
  listMyDrafts,
  uploadDraftEvidence,
  type ReportDraft,
} from '../services/draftService';
import type { ToolkitReport } from '../types/index';
import {
  EVIDENCE_ACCEPTED_EXT,
  EVIDENCE_TYPES,
  evidenceFileProblem,
  evidenceSubmissionProblem,
  fileExtension,
  isEvidenceClassified,
} from '../utils/evidence';

// ── STAKEHOLDERS (M01) ────────────────────────────────────────
// Institutions, their responsibilities, targets and reporting modules come
// from the database (institutions table, migration 039). A user is offered
// only the institutions and districts their data-entry scope covers.
type StakeholderConfig = {
  code: string;
  name: string;
  category: Institution['category'];
  responsibilities: string[];
  targets: number[];
  modules: string[];
  institutionType: 'single' | 'district';
  institution?: string; // defined for 'single'; absent for 'district'
};

function toStakeholderConfig(inst: Institution | undefined): StakeholderConfig | undefined {
  if (!inst) return undefined;
  return {
    code: inst.code,
    name: inst.name,
    category: inst.category,
    responsibilities: inst.responsibilities,
    targets: inst.target_ids,
    modules: inst.tool_ids,
    // District Authorities stands for all 30 districts: the district is chosen.
    institutionType: inst.covers_all_districts ? 'district' : 'single',
    institution: inst.covers_all_districts ? undefined : inst.name,
  };
}

// ── Tool Definitions ─────────────────────────────────────────
const TOOLKIT_TOOLS = [
  {
    id: 'T01',
    name: 'National Institutional Reporting',
    icon: '🏛️',
    color: '#1B6CA8',
    accent: '#4CA3DD',
    frequency: 'Quarterly',
    output: 'Institutional Compliance Scorecard',
    fields: [
      {
        key: 'stakeholder',
        label: 'Reporting Stakeholder',
        type: 'stakeholder_select',
        required: true,
      },
      {
        key: 'institution',
        label: 'Lead Institution',
        type: 'institution_auto',
        required: true,
      },
      {
        key: 'period',
        label: 'Reporting Period',
        type: 'select',
        options: [
          'Q1 2025',
          'Q2 2025',
          'Q3 2025',
          'Q4 2025',
          'Q1 2026',
          'Q2 2026',
          'Q3 2026',
          'Q4 2026',
          'Q1 2027',
          'Q2 2027',
          'Q3 2027',
          'Q4 2027',
          'Q1 2028',
          'Q2 2028',
          'Q3 2028',
          'Q4 2028',
          'Q1 2029',
          'Q2 2029',
          'Q3 2029',
          'Q4 2029',
          'Q1 2030',
          'Q2 2030',
          'Q3 2030',
          'Q4 2030',
        ],
        required: true,
      },
      { key: 'nbsap_target', label: 'NBSAP Target', type: 'target_select', required: true },
      { key: 'indicator', label: 'Related Indicator', type: 'indicator_select', required: true },
      {
        key: 'reported_value',
        label: 'Reported Value',
        type: 'number',
        placeholder: '0',
        required: true,
      },
      {
        key: 'budget_utilized',
        label: 'Budget Utilized (RWF)',
        type: 'number',
        placeholder: 'e.g. 5000000 for 5M RWF',
        hint: 'Enter the exact amount in Rwandan Francs (RWF)',
        required: true,
      },
      {
        key: 'activities',
        label: 'Implementation Activities',
        type: 'textarea',
        placeholder: 'Describe completed activities...',
        required: true,
      },
      {
        key: 'challenges',
        label: 'Challenges Encountered',
        type: 'textarea',
        placeholder: 'Describe constraints...',
        required: false,
      },
    ],
  },
  {
    id: 'T02',
    name: 'District Biodiversity Monitoring',
    icon: '🌿',
    color: '#1E7D4B',
    accent: '#4CBB7F',
    frequency: 'Quarterly',
    output: 'District Biodiversity Performance Index',
    fields: [
      {
        key: 'stakeholder',
        label: 'Reporting Stakeholder',
        type: 'stakeholder_select',
        required: true,
      },
      { key: 'district', label: 'District Name', type: 'district_select', required: true },
      {
        key: 'officer',
        label: 'Reporting Officer',
        type: 'text',
        placeholder: 'Officer name',
        required: true,
      },
      {
        key: 'period',
        label: 'Reporting Period',
        type: 'select',
        options: [
          'Q1 2025',
          'Q2 2025',
          'Q3 2025',
          'Q4 2025',
          'Q1 2026',
          'Q2 2026',
          'Q3 2026',
          'Q4 2026',
          'Q1 2027',
          'Q2 2027',
          'Q3 2027',
          'Q4 2027',
          'Q1 2028',
          'Q2 2028',
          'Q3 2028',
          'Q4 2028',
          'Q1 2029',
          'Q2 2029',
          'Q3 2029',
          'Q4 2029',
          'Q1 2030',
          'Q2 2030',
          'Q3 2030',
          'Q4 2030',
        ],
        required: true,
      },
      { key: 'nbsap_target', label: 'NBSAP Target', type: 'target_select', required: true },
      { key: 'indicator', label: 'Related Indicator', type: 'indicator_select', required: true },
      {
        key: 'forest_ha',
        label: 'Forest Restoration (ha)',
        type: 'number',
        placeholder: '0',
        required: true,
      },
      {
        key: 'wetland_ha',
        label: 'Wetland Rehabilitation (ha)',
        type: 'number',
        placeholder: '0',
        required: true,
      },
      {
        key: 'agroforestry_hh',
        label: 'Agroforestry Households',
        type: 'number',
        placeholder: '0',
        required: false,
      },
      {
        key: 'soil_structures',
        label: 'Soil Conservation Structures',
        type: 'number',
        placeholder: '0',
        required: false,
      },
      {
        key: 'conservation_groups',
        label: 'Conservation Groups',
        type: 'number',
        placeholder: '0',
        required: false,
      },
      {
        key: 'illegal_cases',
        label: 'Illegal Activities Reported',
        type: 'number',
        placeholder: '0',
        required: false,
      },
      {
        key: 'notes',
        label: 'Additional Notes',
        type: 'textarea',
        placeholder: 'Any observations...',
        required: false,
      },
    ],
  },
  {
    id: 'T03',
    name: 'Protected Area Monitoring',
    icon: '🛡️',
    color: '#5B3FA6',
    accent: '#9C78E0',
    frequency: 'Biannual',
    output: 'Ecosystem Integrity Report',
    fields: [
      {
        key: 'stakeholder',
        label: 'Reporting Stakeholder',
        type: 'stakeholder_select',
        required: true,
      },
      {
        key: 'area_name',
        label: 'Protected Area Name',
        type: 'text',
        placeholder: 'e.g. Nyungwe National Park',
        required: true,
      },
      {
        key: 'agency',
        label: 'Managing Agency',
        type: 'text',
        placeholder: 'Agency name',
        required: true,
      },
      {
        key: 'period',
        label: 'Reporting Period',
        type: 'select',
        options: [
          'H1 2024',
          'H2 2024',
          'H1 2025',
          'H2 2025',
          'H1 2026',
          'H2 2026',
          'H1 2027',
          'H2 2027',
          'H1 2028',
          'H2 2028',
          'H1 2029',
          'H2 2029',
          'H1 2030',
          'H2 2030',
        ],
        required: true,
      },
      { key: 'nbsap_target', label: 'NBSAP Target', type: 'target_select', required: true },
      { key: 'indicator', label: 'Related Indicator', type: 'indicator_select', required: true },
      {
        key: 'coverage_change_ha',
        label: 'Coverage Change (ha)',
        type: 'number',
        placeholder: '0',
        required: true,
      },
      {
        key: 'species_trend',
        label: 'Species Population Trend',
        type: 'select',
        options: ['Increasing', 'Stable', 'Declining', 'Unknown'],
        required: true,
      },
      {
        key: 'habitat_quality',
        label: 'Habitat Quality (1–10)',
        type: 'number',
        placeholder: '1',
        required: true,
      },
      {
        key: 'illegal_cases',
        label: 'Illegal Activities Detected',
        type: 'number',
        placeholder: '0',
        required: false,
      },
      {
        key: 'restoration_ha',
        label: 'Restoration Activities (ha)',
        type: 'number',
        placeholder: '0',
        required: false,
      },
      {
        key: 'observations',
        label: 'Field Observations',
        type: 'textarea',
        placeholder: 'Key findings...',
        required: false,
      },
    ],
  },
  {
    id: 'T04',
    name: 'Community Biodiversity Monitoring',
    icon: '👥',
    color: '#B56A00',
    accent: '#F0A030',
    frequency: 'Quarterly',
    output: 'Community Observation Dataset',
    fields: [
      {
        key: 'stakeholder',
        label: 'Reporting Stakeholder',
        type: 'stakeholder_select',
        required: true,
      },
      {
        key: 'community',
        label: 'Community / Village',
        type: 'text',
        placeholder: 'Community name',
        required: true,
      },
      {
        key: 'reporter',
        label: 'Reporter / Group Name',
        type: 'text',
        placeholder: 'Name or group',
        required: true,
      },
      {
        key: 'reporter_type',
        label: 'Reporter Type',
        type: 'select',
        options: [
          'Community Conservation Committee',
          'Youth Environmental Club',
          "Women's Cooperative",
          'Local Knowledge Holder',
          'Other',
        ],
        required: true,
      },
      {
        key: 'period',
        label: 'Reporting Period',
        type: 'select',
        options: [
          'Q1 2025',
          'Q2 2025',
          'Q3 2025',
          'Q4 2025',
          'Q1 2026',
          'Q2 2026',
          'Q3 2026',
          'Q4 2026',
          'Q1 2027',
          'Q2 2027',
          'Q3 2027',
          'Q4 2027',
          'Q1 2028',
          'Q2 2028',
          'Q3 2028',
          'Q4 2028',
          'Q1 2029',
          'Q2 2029',
          'Q3 2029',
          'Q4 2029',
          'Q1 2030',
          'Q2 2030',
          'Q3 2030',
          'Q4 2030',
        ],
        required: true,
      },
      { key: 'nbsap_target', label: 'NBSAP Target', type: 'target_select', required: true },
      { key: 'indicator', label: 'Related Indicator', type: 'indicator_select', required: true },
      {
        key: 'hwc_incidents',
        label: 'Human-Wildlife Conflict Incidents',
        type: 'number',
        placeholder: '0',
        required: true,
      },
      {
        key: 'tree_planting_hh',
        label: 'Tree Planting Households',
        type: 'number',
        placeholder: '0',
        required: false,
      },
      {
        key: 'water_source_status',
        label: 'Water Source Condition',
        type: 'select',
        options: ['Good', 'Fair', 'Degraded', 'Dry / Absent'],
        required: false,
      },
      {
        key: 'species_sightings',
        label: 'Species Sightings',
        type: 'textarea',
        placeholder: 'e.g. Mountain gorilla – 3 sightings',
        required: false,
      },
    ],
  },
  {
    id: 'T05',
    name: 'Biodiversity Finance Tracking',
    icon: '💰',
    color: '#0E6655',
    accent: '#1ABC9C',
    frequency: 'Annual',
    output: 'Finance Gap Analysis',
    fields: [
      {
        key: 'stakeholder',
        label: 'Reporting Stakeholder',
        type: 'stakeholder_select',
        required: true,
      },
      {
        key: 'institution',
        label: 'Institution Name',
        type: 'text',
        placeholder: 'Institution or partner',
        required: true,
      },
      {
        key: 'institution_type',
        label: 'Institution Type',
        type: 'select',
        // Same groups as the Reporting Stakeholder dropdown (institutions.category).
        options: [...STAKEHOLDER_CATEGORIES, 'Other'],
        required: true,
      },
      {
        key: 'year',
        label: 'Fiscal Year',
        type: 'select',
        options: [
          '2020',
          '2021',
          '2022',
          '2023',
          '2024',
          '2025',
          '2026',
          '2027',
          '2028',
          '2029',
          '2030',
        ],
        required: true,
      },
      { key: 'nbsap_target', label: 'NBSAP Target', type: 'target_select', required: true },
      { key: 'indicator', label: 'Related Indicator', type: 'indicator_select', required: true },
      {
        key: 'budget_allocated',
        label: 'Budget Allocated (RWF)',
        type: 'number',
        placeholder: '0',
        required: true,
      },
      {
        key: 'budget_disbursed',
        label: 'Budget Disbursed (RWF)',
        type: 'number',
        placeholder: '0',
        required: true,
      },
      {
        key: 'implementation_pct',
        label: 'Implementation Status (%)',
        type: 'number',
        placeholder: '0',
        required: true,
      },
      {
        key: 'activity_funded',
        label: 'Activity / Program Funded',
        type: 'textarea',
        placeholder: 'Description...',
        required: false,
      },
    ],
  },
  {
    id: 'T06',
    name: 'Private Sector Compliance',
    icon: '🏗️',
    color: '#922B21',
    accent: '#E74C3C',
    frequency: 'Annual',
    output: 'Private-Sector Compliance Index',
    fields: [
      {
        key: 'stakeholder',
        label: 'Reporting Stakeholder',
        type: 'stakeholder_select',
        required: true,
      },
      {
        key: 'company',
        label: 'Company Name',
        type: 'text',
        placeholder: 'Company name',
        required: true,
      },
      {
        key: 'sector',
        label: 'Sector',
        type: 'select',
        options: [
          'Infrastructure',
          'Agribusiness',
          'Mining',
          'Tourism',
          'Finance / Investment',
          'Other',
        ],
        required: true,
      },
      {
        key: 'year',
        label: 'Reporting Year',
        type: 'select',
        options: [
          '2020',
          '2021',
          '2022',
          '2023',
          '2024',
          '2025',
          '2026',
          '2027',
          '2028',
          '2029',
          '2030',
        ],
        required: true,
      },
      { key: 'nbsap_target', label: 'NBSAP Target', type: 'target_select', required: true },
      { key: 'indicator', label: 'Related Indicator', type: 'indicator_select', required: true },
      {
        key: 'eia_compliance',
        label: 'EIA Compliance',
        type: 'select',
        options: ['Full compliance', 'Partial compliance', 'Non-compliant', 'Not applicable'],
        required: true,
      },
      {
        key: 'restoration_ha',
        label: 'Restoration Commitments (ha)',
        type: 'number',
        placeholder: '0',
        required: false,
      },
      {
        key: 'esg_score',
        label: 'ESG Biodiversity Score (1–100)',
        type: 'number',
        placeholder: '0',
        required: false,
      },
      {
        key: 'waste_management',
        label: 'Waste Management Rating',
        type: 'select',
        options: ['Excellent', 'Good', 'Fair', 'Poor'],
        required: false,
      },
    ],
  },
  {
    id: 'T07',
    name: 'Research & Academic Contribution',
    icon: '🔬',
    color: '#1A5276',
    accent: '#2E86C1',
    frequency: 'Annual',
    output: 'Biodiversity Evidence Repository',
    fields: [
      {
        key: 'stakeholder',
        label: 'Reporting Stakeholder',
        type: 'stakeholder_select',
        required: true,
      },
      {
        key: 'institution',
        label: 'Lead Institution',
        type: 'text',
        placeholder: 'University or institute',
        required: true,
      },
      {
        key: 'study_title',
        label: 'Study Title',
        type: 'text',
        placeholder: 'Full title',
        required: true,
      },
      {
        key: 'year',
        label: 'Year Completed',
        type: 'select',
        options: [
          '2020',
          '2021',
          '2022',
          '2023',
          '2024',
          '2025',
          '2026',
          '2027',
          '2028',
          '2029',
          '2030',
        ],
        required: true,
      },
      { key: 'nbsap_target', label: 'NBSAP Target', type: 'target_select', required: true },
      { key: 'indicator', label: 'Related Indicator', type: 'indicator_select', required: true },
      {
        key: 'ecosystem_assessed',
        label: 'Ecosystem Assessed',
        type: 'select',
        options: ['Forest', 'Wetland', 'Savanna', 'Aquatic', 'Agricultural', 'Urban', 'Multiple'],
        required: true,
      },
      {
        key: 'key_findings',
        label: 'Key Findings Summary',
        type: 'textarea',
        placeholder: 'Summarize main findings...',
        required: true,
      },
      {
        key: 'policy_relevance',
        label: 'Policy Relevance & NBSAP Linkage',
        type: 'textarea',
        placeholder: 'How does this support NBSAP?',
        required: false,
      },
    ],
  },
];

// ── Report Form ───────────────────────────────────────────────
const ReportForm = ({
  tool,
  onBack,
  onSuccess,
  initialDraft,
}: {
  tool: (typeof TOOLKIT_TOOLS)[0];
  onBack: () => void;
  onSuccess: () => void;
  /** M03: resume this draft (from any device). */
  initialDraft?: ReportDraft | null;
}) => {
  const { settings, user } = useAuth();
  const { institutions, loading: loadingInstitutions } = useInstitutions();
  const { scopes, isAdmin, loading: loadingScopes } = useMyScopes();
  const institutionsByCode = useMemo(
    () => new Map(institutions.map(i => [i.code, i])),
    [institutions]
  );
  const getStakeholderConfig = useCallback(
    (key: string) => toStakeholderConfig(institutionsByCode.get(key)),
    [institutionsByCode]
  );
  const [formData, setFormData] = useState<Record<string, string>>(
    () => initialDraft?.form_data ?? {}
  );
  const [attachments, setAttachments] = useState<ReportAttachment[]>(
    () => initialDraft?.attachments ?? []
  );
  const [submitting, setSubmitting] = useState(false);
  // M04: data-quality checklist and a live preview of the database checks.
  const checklist = useChecklistItems();
  const [declaration, setDeclaration] = useState<DqaDeclaration>(emptyDeclaration);
  const checklistComplete = isChecklistComplete(checklist.items, declaration);
  const previewTarget = formData.nbsap_target ? parseInt(formData.nbsap_target, 10) : null;
  const previewIndicator = formData.indicator ? parseInt(formData.indicator, 10) : null;
  const preview = useQualityPreview(
    tool.id as ReportType,
    formData,
    previewTarget,
    previewIndicator,
    !!formData.stakeholder
  );
  // Missing period, target and indicator are already shown as required fields.
  const previewFlags = useMemo(
    () =>
      preview.flags.filter(f => !['period_missing', 'no_target', 'no_indicator'].includes(f.code)),
    [preview.flags]
  );
  const previewHasErrors = previewFlags.some(f => f.severity === 'error');
  // M03: auto-save to a server draft.
  const draft = useDraftAutosave({
    toolId: tool.id as ReportType,
    formData,
    attachments,
    initialDraft,
  });
  // When a draft is loaded, its stakeholder/target are already chosen: the
  // "reset dependent fields" effects below must not clear them on first run.
  const skipStakeholderResetRef = useRef(!!initialDraft?.form_data?.stakeholder);
  const skipTargetResetRef = useRef(!!initialDraft?.form_data?.nbsap_target);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [responsibleTargets, setResponsibleTargets] = useState<NBSAPTarget[]>([]);
  const [availableIndicators, setAvailableIndicators] = useState<Indicator[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [loadingIndicators, setLoadingIndicators] = useState(false);
  const [allDistricts, setAllDistricts] = useState<District[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Institutions that report through this module and that the user may submit for.
  const availableStakeholders = useMemo(() => {
    return institutions
      .filter(i => i.tool_ids.includes(tool.id))
      .filter(
        i => isAdmin || scopes.some(s => s.scope_role === 'data_entry' && s.institution_id === i.id)
      )
      .map(i => ({ id: i.code, name: i.name, category: i.category }));
  }, [institutions, scopes, isAdmin, tool.id]);

  // Districts the user may report for with the selected institution.
  const districtChoices = useMemo(() => {
    if (isAdmin) return allDistricts;
    const inst = institutionsByCode.get(formData.stakeholder || '');
    if (!inst) return allDistricts;
    const allowed = allowedDistrictIds(scopes, inst.id);
    return allowed === null ? allDistricts : allDistricts.filter(d => allowed.includes(d.id));
  }, [isAdmin, institutionsByCode, formData.stakeholder, scopes, allDistricts]);
  // Grouped by institution type for the dropdown (ministries, authorities, boards, ...)
  const stakeholderGroups = useMemo(
    () => groupStakeholders(availableStakeholders),
    [availableStakeholders]
  );

  // Get filtered targets based on selected stakeholder
  const filteredTargets = useMemo(() => {
    console.log(
      '🎯 Filtering targets - stakeholder:',
      formData.stakeholder,
      'responsibleTargets count:',
      responsibleTargets.length
    );

    if (!formData.stakeholder) {
      console.log(
        '📍 No stakeholder selected, returning all responsible targets:',
        responsibleTargets.length
      );
      return responsibleTargets;
    }

    const stakeholderInfo = getStakeholderConfig(formData.stakeholder);
    if (!stakeholderInfo) {
      console.log('❌ No stakeholder info found for:', formData.stakeholder);
      console.log(
        '🔍 Available stakeholders:',
        availableStakeholders.map(x => x.id)
      );
      return responsibleTargets;
    }

    const filtered = responsibleTargets.filter(target =>
      stakeholderInfo.targets.includes(target.id)
    );

    console.log('📊 FILTERING RESULTS:');
    console.log(
      '  - Selected stakeholder:',
      formData.stakeholder,
      '(' + stakeholderInfo.name + ')'
    );
    console.log('  - Stakeholder should have targets:', stakeholderInfo.targets);
    console.log(
      '  - Available responsible targets from database:',
      responsibleTargets.map(t => ({
        id: t.id,
        title: t.title,
        stakeholders: t.responsible_stakeholders || [],
      }))
    );
    console.log(
      '  - Targets that match stakeholder:',
      filtered.map(t => ({ id: t.id, title: t.title }))
    );

    if (filtered.length === 0) {
      console.log('⚠️  WARNING: No targets found for stakeholder "' + formData.stakeholder + '"');
      console.log('🔧 This might mean:');
      console.log(
        '   1. Database targets dont include this stakeholder in responsible_stakeholders'
      );
      console.log('   2. The stakeholder name doesnt match exactly');
      console.log('   3. The target mapping needs updating');
    }

    return filtered;
  }, [responsibleTargets, formData.stakeholder, getStakeholderConfig]);

  // Load NBSAP targets based on user's organization
  useEffect(() => {
    const loadTargets = async () => {
      setLoadingTargets(true);
      try {
        // All targets; the selected institution narrows them (filteredTargets).
        const userOrg = '';
        const targets = await fetchUserResponsibleTargets(userOrg);
        console.log('✅ Loaded targets:', targets.length, 'targets total');
        console.log(
          '📋 Target details:',
          targets.map(t => ({
            id: t.id,
            title: t.title,
            stakeholders: t.responsible_stakeholders || [],
          }))
        );
        console.log('🔍 User org for database query:', userOrg);
        setResponsibleTargets(targets);
      } catch (error) {
        console.error('❌ Error loading NBSAP targets:', error);
        toast.error('Failed to load NBSAP targets');
      }
      setLoadingTargets(false);
    };

    loadTargets();
  }, []);

  // Load all districts for district_select (T02) and institution_auto (T01 — needed when
  // District Authorities is selected, which maps to individual districts)
  useEffect(() => {
    const needsDistricts =
      tool.fields.some(f => f.type === 'district_select') ||
      tool.fields.some(f => f.type === 'institution_auto');
    if (!needsDistricts) return;
    const loadDistricts = async () => {
      setLoadingDistricts(true);
      try {
        const districts = await fetchDistricts();
        setAllDistricts(districts);
      } catch (error) {
        console.error('Error loading districts:', error);
      }
      setLoadingDistricts(false);
    };
    loadDistricts();
  }, [tool.id]);

  // Load all indicators for the selected target.
  // The stakeholder already narrows the target list; filtering indicators
  // a second time by stakeholder adds no value and causes empty dropdowns
  // when indicator.responsible arrays are incomplete.
  useEffect(() => {
    const loadIndicators = async () => {
      if (!formData.nbsap_target) {
        setAvailableIndicators([]);
        return;
      }
      const targetId = parseInt(formData.nbsap_target, 10);
      setLoadingIndicators(true);
      try {
        const indicators = await fetchIndicators({ targetId });
        setAvailableIndicators(indicators);
      } catch (error) {
        console.error('Failed to load indicators:', error);
        toast.error('Failed to load indicators');
      }
      setLoadingIndicators(false);
    };
    loadIndicators();
  }, [formData.nbsap_target]);

  // Reset dependent fields when stakeholder changes.
  // For single-institution stakeholders the institution field is auto-filled;
  // for District Authorities it is cleared so the user picks from the dropdown.
  useEffect(() => {
    if (skipStakeholderResetRef.current) {
      skipStakeholderResetRef.current = false;
      return;
    }
    if (formData.stakeholder) {
      const config = getStakeholderConfig(formData.stakeholder);
      setFormData(prev => ({
        ...prev,
        nbsap_target: '',
        indicator: '',
        institution: config?.institutionType === 'single' ? (config.institution ?? '') : '',
      }));
    }
  }, [formData.stakeholder, getStakeholderConfig]);

  // Reset indicator when target changes
  useEffect(() => {
    if (skipTargetResetRef.current) {
      skipTargetResetRef.current = false;
      return;
    }
    if (formData.nbsap_target) {
      setFormData(prev => ({
        ...prev,
        indicator: '',
      }));
    }
  }, [formData.nbsap_target]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      // Validate required fields
      const newErrors: Record<string, boolean> = {};
      tool.fields.forEach(f => {
        if (f.required && !formData[f.key]?.trim()) newErrors[f.key] = true;
      });
      if (Object.keys(newErrors).length) {
        setErrors(newErrors);
        toast.error('Please fill in all required fields');
        return;
      }

      // Supporting evidence: at least one file, each classified (quality control)
      const evidenceProblem = evidenceSubmissionProblem(attachments);
      if (evidenceProblem) {
        toast.error(evidenceProblem);
        return;
      }

      // M04: data-quality checklist (the database refuses the report otherwise)
      if (checklist.error) {
        toast.error(checklist.error);
        return;
      }
      if (!isChecklistComplete(checklist.items, declaration)) {
        toast.error('Confirm every data-quality point and the declaration before submitting');
        return;
      }

      // Validate year fields
      const yearField = tool.fields.find(f => f.key === 'year');
      if (yearField && formData.year) {
        const yearValue = parseInt(formData.year, 10);
        const yearValidation = validateYear(yearValue);
        if (!yearValidation.valid) {
          setErrors({ ...newErrors, year: true });
          toast.error(yearValidation.error || 'Invalid year');
          return;
        }
      }

      // ── Duplicate submission check ──────────────────────────────────────────
      // Resolve the target ID early so we can query before setting submitting=true.
      const checkTargetId = formData.nbsap_target ? parseInt(formData.nbsap_target, 10) : null;

      if (user?.id && formData.period && checkTargetId) {
        // 1. Hard block: same user already has a non-rejected report for this combo.
        const { data: selfDupe } = await supabase
          .from('toolkit_reports')
          .select('id, submitted_at')
          .eq('submitted_by', user.id)
          .eq('tool_id', tool.id)
          .eq('period', formData.period)
          .eq('nbsap_target_id', checkTargetId)
          .neq('status', 'rejected')
          .maybeSingle();

        if (selfDupe) {
          toast.error(
            `You already submitted this report (${tool.id} · ${formData.period} · Target ${checkTargetId}). Ask your administrator to reject it before resubmitting.`
          );
          return;
        }

        // 2. Soft warning: someone else from the same institution already submitted.
        const institution = formData.institution?.trim();
        if (institution) {
          const { data: orgDupe } = await supabase
            .from('toolkit_reports')
            .select('id, institution, submitted_at')
            .eq('institution', institution)
            .eq('tool_id', tool.id)
            .eq('period', formData.period)
            .eq('nbsap_target_id', checkTargetId)
            .neq('status', 'rejected')
            .neq('submitted_by', user.id)
            .maybeSingle();

          if (orgDupe) {
            toast(
              `Note: someone else from ${institution} has already submitted this report for ${formData.period} / Target ${checkTargetId}. Both submissions will be sent for review.`,
              { icon: '⚠️', duration: 6000 }
            );
          }
        }
      }
      // ────────────────────────────────────────────────────────────────────────

      setSubmitting(true);

      // Determine whether this report should bypass manual verification based on
      // the submitting organization's automatic-update configuration. Falls back
      // to the existing per-user setting if no organization config is available.
      let orgConfig = null;
      if (user?.organization) {
        try {
          orgConfig = await organizationConfigService.getOrCreateConfig(user.organization);
        } catch (err) {
          console.warn('Failed to load organization config, falling back to user settings:', err);
        }
      }
      const requireVerification = true;

      const nbsapTargetId = formData.nbsap_target ? parseInt(formData.nbsap_target, 10) : null;
      const indicatorId = formData.indicator ? parseInt(formData.indicator, 10) : null;
      const stakeholderId = formData.stakeholder || null;

      const result = await submitReport(
        tool.id as ReportType,
        tool.name,
        formData,
        requireVerification,
        attachments,
        nbsapTargetId,
        indicatorId,
        declaration
      );

      if (result.error) {
        toast.error(result.error);
      } else {
        const selectedTarget = filteredTargets.find(t => t.id === nbsapTargetId);
        const selectedIndicator = availableIndicators.find(i => i.id === indicatorId);
        const selectedStakeholder = stakeholderId ? getStakeholderConfig(stakeholderId) : null;

        const targetInfo = selectedTarget
          ? ` → Target ${selectedTarget.id}: ${selectedTarget.title}`
          : '';
        const indicatorInfo = selectedIndicator ? ` → Indicator: ${selectedIndicator.name}` : '';
        const stakeholderInfo = selectedStakeholder
          ? ` → Stakeholder: ${selectedStakeholder.name}`
          : '';

        await writeAuditEntry(
          'submit',
          `${tool.name} submitted${stakeholderInfo}${targetInfo}${indicatorInfo}`,
          `Tool: ${tool.id} · Status: ${result.data?.status} · Stakeholder: ${stakeholderId || 'None'} · NBSAP Target: ${nbsapTargetId || 'None'} · Indicator: ${indicatorId || 'None'}`
        );

        // Log the automatic-processing outcome for audit purposes. When the
        // report was auto-approved, the progress update was already applied by
        // the database trigger as part of the submission above.
        if (orgConfig && result.data) {
          await processReportAutomatic(result.data, orgConfig);
        }

        // Update district reporting status on the map when a T02 report is submitted
        if (tool.id === 'T02' && formData.district) {
          const matchedDistrict = allDistricts.find(d => d.name === formData.district);
          if (matchedDistrict) {
            const newDistrictStatus = requireVerification ? 'pending' : 'submitted';
            await updateDistrictStatus(matchedDistrict.id, newDistrictStatus);
            eventBus.emit('district-status-updated', {
              districtId: matchedDistrict.id,
              districtName: matchedDistrict.name,
            });
          }
        }

        // Enhanced success message
        const successMsg = requireVerification
          ? 'Submitted for validation ⏳' +
            (selectedTarget
              ? ` Data will count toward Target ${selectedTarget.id} once published.`
              : '')
          : 'Report submitted successfully ✓' +
            (selectedTarget ? ` Target ${selectedTarget.id} updated automatically.` : '') +
            (selectedIndicator ? ` Indicator "${selectedIndicator.name}" updated.` : '');

        toast.success(successMsg);
        await draft.finish({ discarded: false });
        onSuccess();
      }
      setSubmitting(false);
    },
    [
      formData,
      tool,
      settings,
      attachments,
      onSuccess,
      responsibleTargets,
      allDistricts,
      draft,
      checklist.items,
      checklist.error,
      declaration,
    ]
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const accepted: ReportAttachment[] = [...attachments];
      Array.from(files).forEach(file => {
        const problem = evidenceFileProblem(file, accepted);
        if (problem) {
          toast.error(problem);
          return;
        }
        const ext = fileExtension(file.name);
        const placeholder: ReportAttachment = { name: file.name, ext, size: file.size };
        accepted.push(placeholder);
        const reader = new FileReader();
        reader.onload = async e => {
          const local: ReportAttachment = {
            name: file.name,
            ext,
            size: file.size,
            data_url: e.target?.result as string,
            evidence_type: '',
            description: '',
          };
          setAttachments(prev => [...prev, local]);
          // M03: store the file with the draft now, so it survives a closed browser.
          if (!user) return;
          const draftId = await draft.ensureDraft();
          if (!draftId) return; // kept in memory; uploaded on submit
          const up = await uploadDraftEvidence(user.id, draftId, local);
          if (up.data) {
            const storagePath = up.data.storage_path;
            setAttachments(prev =>
              prev.map(a =>
                a.name === local.name && a.size === local.size && !a.storage_path
                  ? { ...a, storage_path: storagePath }
                  : a
              )
            );
          }
        };
        reader.readAsDataURL(file);
      });
    },
    [attachments, draft, user]
  );

  const updateAttachment = useCallback((index: number, patch: Partial<ReportAttachment>) => {
    setAttachments(prev => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }, []);

  return (
    <div>
      <button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          color: '#0ea5e9',
          fontSize: '0.82rem',
          fontWeight: 600,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          marginBottom: 18,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        ← Back to Tools
      </button>
      <div
        style={{
          background: '#fff',
          borderRadius: 14,
          border: '1px solid #e2e8f0',
          padding: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 22,
            paddingBottom: 18,
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <span style={{ fontSize: '2rem' }}>{tool.icon}</span>
          <div>
            <div
              style={{
                fontSize: '0.65rem',
                color: tool.accent,
                fontFamily: "'DM Mono', monospace",
                letterSpacing: '0.1em',
                marginBottom: 2,
              }}
            >
              {tool.id} · {tool.frequency}
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{tool.name}</div>
            <div style={{ fontSize: '0.73rem', color: '#94a3b8' }}>Output: {tool.output}</div>
          </div>
        </div>

        <DraftStatusBar
          status={draft.status}
          savedAt={draft.savedAt}
          error={draft.error}
          hasDraft={!!draft.draftId}
          onKeepMine={() => void draft.keepMine()}
          onTakeTheirs={async () => {
            const theirs = await draft.takeTheirs();
            if (theirs) {
              skipStakeholderResetRef.current = true;
              skipTargetResetRef.current = true;
              setFormData(theirs.form_data);
              setAttachments(theirs.attachments);
            }
          }}
          onDiscard={async () => {
            if (
              !window.confirm('Discard this draft? Its values and attached files will be deleted.')
            )
              return;
            await draft.finish({ discarded: true });
            toast.success('Draft discarded');
            onBack();
          }}
        />
        <form onSubmit={handleSubmit}>
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}
          >
            {tool.fields.map(f => (
              <div key={f.key} style={{ gridColumn: f.type === 'textarea' ? 'span 2' : 'span 1' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: '#94a3b8',
                    marginBottom: 5,
                  }}
                >
                  {f.label}
                  {f.required && <span style={{ color: '#f43f5e', marginLeft: 2 }}>*</span>}
                  {!f.required && (
                    <span
                      style={{
                        color: '#94a3b8',
                        fontWeight: 400,
                        textTransform: 'none',
                        letterSpacing: 0,
                      }}
                    >
                      {' '}
                      (optional)
                    </span>
                  )}
                </label>
                {f.type === 'textarea' ? (
                  <textarea
                    value={formData[f.key] || ''}
                    onChange={e => {
                      setFormData(d => ({ ...d, [f.key]: e.target.value }));
                      setErrors(err => ({ ...err, [f.key]: false }));
                    }}
                    placeholder={f.placeholder}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      border: `1.5px solid ${errors[f.key] ? '#f43f5e' : '#e2e8f0'}`,
                      borderRadius: 8,
                      fontSize: '0.83rem',
                      fontFamily: "'DM Sans', sans-serif",
                      outline: 'none',
                      resize: 'vertical',
                      boxShadow: errors[f.key] ? '0 0 0 3px rgba(244,63,94,0.1)' : 'none',
                    }}
                  />
                ) : f.type === 'stakeholder_select' ? (
                  <TwoStepStakeholderSelect
                    groups={stakeholderGroups}
                    value={formData[f.key] || ''}
                    onChange={code => {
                      setFormData(d => ({ ...d, [f.key]: code }));
                      setErrors(err => ({ ...err, [f.key]: false }));
                    }}
                    invalid={!!errors[f.key]}
                    loading={loadingInstitutions || loadingScopes}
                    emptyMessage="No data-entry access for this module — ask your institution administrator"
                  />
                ) : f.type === 'target_select' ? (
                  <select
                    value={formData[f.key] || ''}
                    onChange={e => {
                      setFormData(d => ({ ...d, [f.key]: e.target.value }));
                      setErrors(err => ({ ...err, [f.key]: false }));
                    }}
                    disabled={loadingTargets || !formData.stakeholder}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      border: `1.5px solid ${errors[f.key] ? '#f43f5e' : '#e2e8f0'}`,
                      borderRadius: 8,
                      fontSize: '0.83rem',
                      fontFamily: "'DM Sans', sans-serif",
                      outline: 'none',
                      background: '#fff',
                      color: '#0f172a',
                    }}
                  >
                    <option value="">
                      {!formData.stakeholder
                        ? 'Select stakeholder first'
                        : loadingTargets
                          ? 'Loading targets...'
                          : '— Select NBSAP Target —'}
                    </option>
                    {filteredTargets.map(target => (
                      <option key={target.id} value={target.id}>
                        Target {target.id}: {target.title} ({target.progress}% complete)
                      </option>
                    ))}
                  </select>
                ) : f.type === 'indicator_select' ? (
                  <select
                    value={formData[f.key] || ''}
                    onChange={e => {
                      setFormData(d => ({ ...d, [f.key]: e.target.value }));
                      setErrors(err => ({ ...err, [f.key]: false }));
                    }}
                    disabled={loadingIndicators || !formData.nbsap_target}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      border: `1.5px solid ${errors[f.key] ? '#f43f5e' : '#e2e8f0'}`,
                      borderRadius: 8,
                      fontSize: '0.83rem',
                      fontFamily: "'DM Sans', sans-serif",
                      outline: 'none',
                      background: '#fff',
                      color: '#0f172a',
                    }}
                  >
                    <option value="">
                      {!formData.nbsap_target
                        ? 'Select target first'
                        : loadingIndicators
                          ? 'Loading indicators...'
                          : '— Select Indicator —'}
                    </option>
                    {availableIndicators.map(indicator => (
                      <option key={indicator.id} value={indicator.id}>
                        {indicator.name} ({indicator.status})
                      </option>
                    ))}
                  </select>
                ) : f.type === 'institution_auto' ? (
                  (() => {
                    const config = formData.stakeholder
                      ? getStakeholderConfig(formData.stakeholder)
                      : null;
                    if (!formData.stakeholder || !config) {
                      return (
                        <div
                          style={{
                            padding: '9px 12px',
                            border: '1.5px solid #e2e8f0',
                            borderRadius: 8,
                            fontSize: '0.83rem',
                            color: '#94a3b8',
                            background: '#f8fafc',
                            fontFamily: "'DM Sans', sans-serif",
                          }}
                        >
                          Select stakeholder first
                        </div>
                      );
                    }
                    if (config.institutionType === 'single') {
                      return (
                        <div
                          style={{
                            padding: '9px 12px',
                            border: `1.5px solid ${errors[f.key] ? '#f43f5e' : '#d1fae5'}`,
                            borderRadius: 8,
                            fontSize: '0.83rem',
                            color: '#0f172a',
                            background: '#f0fdf4',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontFamily: "'DM Sans', sans-serif",
                          }}
                        >
                          <span style={{ color: '#16a34a', fontWeight: 700 }}>✓</span>
                          {config.institution}
                        </div>
                      );
                    }
                    // institutionType === 'district': user picks from the loaded districts
                    return (
                      <select
                        value={formData[f.key] || ''}
                        onChange={e => {
                          setFormData(d => ({ ...d, [f.key]: e.target.value }));
                          setErrors(err => ({ ...err, [f.key]: false }));
                        }}
                        disabled={loadingDistricts}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          border: `1.5px solid ${errors[f.key] ? '#f43f5e' : '#e2e8f0'}`,
                          borderRadius: 8,
                          fontSize: '0.83rem',
                          fontFamily: "'DM Sans', sans-serif",
                          outline: 'none',
                          background: '#fff',
                          color: '#0f172a',
                        }}
                      >
                        <option value="">
                          {loadingDistricts
                            ? 'Loading districts…'
                            : '— Select Reporting District —'}
                        </option>
                        {['Kigali', 'North', 'South', 'East', 'West'].map(province => {
                          const provDistricts = districtChoices.filter(
                            d => d.province?.name === province
                          );
                          if (provDistricts.length === 0) return null;
                          return (
                            <optgroup key={province} label={`${province} Province`}>
                              {provDistricts.map(d => (
                                <option key={d.id} value={d.name}>
                                  {d.name}
                                </option>
                              ))}
                            </optgroup>
                          );
                        })}
                      </select>
                    );
                  })()
                ) : f.type === 'district_select' ? (
                  <select
                    value={formData[f.key] || ''}
                    onChange={e => {
                      setFormData(d => ({ ...d, [f.key]: e.target.value }));
                      setErrors(err => ({ ...err, [f.key]: false }));
                    }}
                    disabled={loadingDistricts}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      border: `1.5px solid ${errors[f.key] ? '#f43f5e' : '#e2e8f0'}`,
                      borderRadius: 8,
                      fontSize: '0.83rem',
                      fontFamily: "'DM Sans', sans-serif",
                      outline: 'none',
                      background: '#fff',
                      color: '#0f172a',
                    }}
                  >
                    <option value="">
                      {loadingDistricts ? 'Loading districts…' : '— Select District —'}
                    </option>
                    {['Kigali', 'North', 'South', 'East', 'West'].map(province => {
                      const provDistricts = districtChoices.filter(
                        d => d.province?.name === province
                      );
                      if (provDistricts.length === 0) return null;
                      return (
                        <optgroup key={province} label={`${province} Province`}>
                          {provDistricts.map(d => (
                            <option key={d.id} value={d.name}>
                              {d.name}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                ) : f.type === 'select' ? (
                  <select
                    value={formData[f.key] || ''}
                    onChange={e => {
                      setFormData(d => ({ ...d, [f.key]: e.target.value }));
                      setErrors(err => ({ ...err, [f.key]: false }));
                    }}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      border: `1.5px solid ${errors[f.key] ? '#f43f5e' : '#e2e8f0'}`,
                      borderRadius: 8,
                      fontSize: '0.83rem',
                      fontFamily: "'DM Sans', sans-serif",
                      outline: 'none',
                      background: '#fff',
                      color: '#0f172a',
                    }}
                  >
                    <option value="">— Select —</option>
                    {f.options?.map(o => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type}
                    value={formData[f.key] || ''}
                    onChange={e => {
                      setFormData(d => ({ ...d, [f.key]: e.target.value }));
                      setErrors(err => ({ ...err, [f.key]: false }));
                    }}
                    placeholder={f.placeholder}
                    min={f.type === 'number' ? 0 : undefined}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      border: `1.5px solid ${errors[f.key] ? '#f43f5e' : '#e2e8f0'}`,
                      borderRadius: 8,
                      fontSize: '0.83rem',
                      fontFamily: "'DM Sans', sans-serif",
                      outline: 'none',
                      boxShadow: errors[f.key] ? '0 0 0 3px rgba(244,63,94,0.1)' : 'none',
                    }}
                  />
                )}
                {'hint' in f && f.hint && (
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: '0.7rem',
                      color: 'var(--text-3)',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {String(f.hint)}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Selected Stakeholder Information */}
          {formData.stakeholder && (
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: 10,
                padding: 16,
                marginBottom: 18,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: '1.2rem' }}>👥</span>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                  Selected Stakeholder
                </div>
              </div>
              {(() => {
                const stakeholderInfo = getStakeholderConfig(formData.stakeholder);
                if (!stakeholderInfo) return null;

                return (
                  <div>
                    <div
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: '#0f172a',
                        marginBottom: 4,
                      }}
                    >
                      {stakeholderInfo.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 8 }}>
                      <strong>Key Responsibilities:</strong>
                    </div>
                    <ul
                      style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, paddingLeft: 20 }}
                    >
                      {stakeholderInfo.responsibilities.map((responsibility, idx) => (
                        <li key={idx}>{responsibility}</li>
                      ))}
                    </ul>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 8 }}>
                      Responsible for {stakeholderInfo.targets.length} NBSAP targets
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Selected NBSAP Target Information */}
          {formData.nbsap_target && (
            <div
              style={{
                background: '#f0f9ff',
                border: '1px solid #0ea5e9',
                borderRadius: 10,
                padding: 16,
                marginBottom: 18,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: '1.2rem' }}>🎯</span>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0ea5e9' }}>
                  Selected NBSAP Target
                </div>
              </div>
              {(() => {
                const selectedTarget = filteredTargets.find(
                  t => t.id === parseInt(formData.nbsap_target)
                );
                if (!selectedTarget) return null;

                return (
                  <div>
                    <div
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: '#0f172a',
                        marginBottom: 4,
                      }}
                    >
                      Target {selectedTarget.id}: {selectedTarget.title}
                    </div>
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: '#64748b',
                        marginBottom: 8,
                        lineHeight: 1.4,
                      }}
                    >
                      {selectedTarget.description}
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        Progress:{' '}
                        <span style={{ fontWeight: 700, color: '#10b981' }}>
                          {selectedTarget.progress}%
                        </span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        Goal: <span style={{ fontWeight: 600 }}>{selectedTarget.goal}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Selected Indicator Information */}
          {formData.indicator && (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #16a34a',
                borderRadius: 10,
                padding: 16,
                marginBottom: 18,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: '1.2rem' }}>📊</span>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a' }}>
                  Selected Indicator
                </div>
              </div>
              {(() => {
                const selectedIndicator = availableIndicators.find(
                  i => i.id === parseInt(formData.indicator)
                );
                if (!selectedIndicator) return null;

                return (
                  <div>
                    <div
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: '#0f172a',
                        marginBottom: 4,
                      }}
                    >
                      {selectedIndicator.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 8 }}>
                      {selectedIndicator.definition}
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        Status:{' '}
                        <span
                          style={{
                            fontWeight: 700,
                            color:
                              selectedIndicator.status === 'on-track'
                                ? '#16a34a'
                                : selectedIndicator.status === 'at-risk'
                                  ? '#ea580c'
                                  : '#dc2626',
                          }}
                        >
                          {selectedIndicator.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        Progress:{' '}
                        <span style={{ fontWeight: 700, color: '#16a34a' }}>
                          {selectedIndicator.progress}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* File drop zone */}
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
            Supporting evidence <span style={{ color: '#f43f5e' }}>*</span>
          </div>
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              handleFiles(e.dataTransfer.files);
            }}
            style={{
              border: '2px dashed #e2e8f0',
              borderRadius: 10,
              padding: 20,
              textAlign: 'center',
              cursor: 'pointer',
              marginBottom: 14,
              transition: '0.2s',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = '#0ea5e9')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0')}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={EVIDENCE_ACCEPTED_EXT.map(e => `.${e}`).join(',')}
              style={{ display: 'none' }}
              onChange={e => handleFiles(e.target.files)}
            />
            <span style={{ fontSize: '1.4rem', display: 'block', marginBottom: 6 }}>📎</span>
            <div style={{ fontSize: '0.82rem', color: '#475569' }}>
              Drop files or{' '}
              <span style={{ color: tool.accent, textDecoration: 'underline' }}>browse</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 3 }}>
              PDF · Excel · CSV · Word · Images (PNG, JPG, GIF, WebP) — at least one required · max
              10 MB each · choose an evidence type for every file
            </div>
          </div>

          {/* Attached files: each must be classified for validators */}
          {attachments.map((att, i) => {
            const classified = isEvidenceClassified(att);
            const typeHint = EVIDENCE_TYPES.find(t => t.value === att.evidence_type)?.hint;
            return (
              <div
                key={i}
                style={{
                  padding: '8px 12px',
                  background: '#f8fafc',
                  border: `1px solid ${classified ? '#e2e8f0' : '#fbbf24'}`,
                  borderRadius: 8,
                  marginBottom: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(att.ext) && att.data_url ? (
                    <img
                      src={att.data_url}
                      alt={att.name}
                      style={{
                        width: 34,
                        height: 34,
                        objectFit: 'cover',
                        borderRadius: 6,
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: '0.82rem' }}>📄</span>
                  )}
                  <span
                    style={{
                      flex: 1,
                      fontSize: '0.78rem',
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {att.name}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                    {(att.size / 1024).toFixed(1)} KB
                  </span>
                  <button
                    type="button"
                    onClick={() => setAttachments(a => a.filter((_, j) => j !== i))}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#f43f5e',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}
                >
                  <div>
                    <select
                      aria-label={`Evidence type for ${att.name}`}
                      value={att.evidence_type || ''}
                      onChange={e => updateAttachment(i, { evidence_type: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        border: `1.5px solid ${att.evidence_type ? '#e2e8f0' : '#fbbf24'}`,
                        borderRadius: 7,
                        fontSize: '0.78rem',
                        fontFamily: "'DM Sans', sans-serif",
                        outline: 'none',
                        background: '#fff',
                        color: '#0f172a',
                      }}
                    >
                      <option value="">— Evidence type (required) —</option>
                      {EVIDENCE_TYPES.map(t => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    {typeHint && (
                      <div style={{ fontSize: '0.66rem', color: '#94a3b8', marginTop: 3 }}>
                        {typeHint}
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    aria-label={`Description of ${att.name}`}
                    value={att.description || ''}
                    onChange={e => updateAttachment(i, { description: e.target.value })}
                    placeholder={
                      att.evidence_type === 'other'
                        ? 'Describe this evidence (required)'
                        : 'What does this file show? (optional)'
                    }
                    maxLength={200}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: 7,
                      fontSize: '0.78rem',
                      fontFamily: "'DM Sans', sans-serif",
                      outline: 'none',
                      color: '#0f172a',
                    }}
                  />
                </div>
              </div>
            );
          })}

          <QualityFlagsList
            flags={previewFlags}
            title={previewHasErrors ? 'Fix before submitting' : 'Validators will see'}
          />
          <DataQualityChecklist
            items={checklist.items}
            declaration={declaration}
            onChange={setDeclaration}
            loading={checklist.loading}
            error={checklist.error}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              type="submit"
              disabled={submitting || !checklistComplete || previewHasErrors}
              title={
                !checklistComplete
                  ? 'Complete the data-quality check first'
                  : previewHasErrors
                    ? 'Fix the data-quality errors first'
                    : undefined
              }
              style={{
                padding: '10px 28px',
                background: `linear-gradient(135deg, ${tool.color}, ${tool.accent})`,
                color: '#fff',
                border: 'none',
                borderRadius: 9,
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor:
                  submitting || !checklistComplete || previewHasErrors ? 'not-allowed' : 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                opacity: submitting || !checklistComplete || previewHasErrors ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {submitting && (
                <div
                  style={{
                    width: 14,
                    height: 14,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                  }}
                />
              )}
              {submitting ? 'Submitting…' : 'Submit Report →'}
            </button>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </form>
      </div>
    </div>
  );
};

// ── Success screen ────────────────────────────────────────────
const SuccessScreen = ({
  tool,
  onAnother,
  onBack,
}: {
  tool: (typeof TOOLKIT_TOOLS)[0];
  onAnother: () => void;
  onBack: () => void;
}) => (
  <div
    style={{
      background: '#fff',
      borderRadius: 14,
      border: '1px solid #e2e8f0',
      padding: 48,
      textAlign: 'center',
    }}
  >
    <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 6, color: '#0f172a' }}>
      Report Submitted Successfully
    </h3>
    <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 20 }}>
      {tool.name} · {new Date().toLocaleDateString()}
    </p>
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
      <button
        onClick={onAnother}
        style={{
          padding: '8px 20px',
          borderRadius: 8,
          border: `1.5px solid ${tool.accent}`,
          color: tool.accent,
          background: 'transparent',
          fontSize: '0.82rem',
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        Submit Another
      </button>
      <button
        onClick={onBack}
        style={{
          padding: '8px 20px',
          borderRadius: 8,
          border: 'none',
          background: tool.accent,
          color: '#fff',
          fontSize: '0.82rem',
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        ← Back to Tools
      </button>
    </div>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────
export default function ReportingToolkitPage() {
  const [searchParams] = useSearchParams();
  const { user: currentUser } = useAuth();
  // M02: a returned report the user is correcting.
  const [resubmitTarget, setResubmitTarget] = useState<ToolkitReport | null>(null);
  // M03: the user's drafts, and the one being resumed.
  const [drafts, setDrafts] = useState<ReportDraft[]>([]);
  const [resumeDraft, setResumeDraft] = useState<ReportDraft | null>(null);
  const loadDrafts = useCallback(() => {
    listMyDrafts()
      .then(setDrafts)
      .catch(() => setDrafts([]));
  }, []);
  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);
  const { institutions } = useInstitutions();
  const institutionNames = useMemo(
    () => new Map(institutions.map(i => [i.code, i.name])),
    [institutions]
  );
  const initTool = searchParams.get('tool');
  const [activeTool, setActiveTool] = useState<(typeof TOOLKIT_TOOLS)[0] | null>(
    initTool ? TOOLKIT_TOOLS.find(t => t.id === initTool) || null : null
  );
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'submissions' | 'analytics'>('submissions');
  const [toolFilter, setToolFilter] = useState('ALL');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { reports, loading, refetch } = useReports({
    toolId: toolFilter !== 'ALL' ? (toolFilter as ReportType) : undefined,
    pageSize: 50,
  });

  const handleDelete = useCallback(
    async (reportId: string, toolName: string) => {
      if (!window.confirm(`Delete "${toolName}" submission? This cannot be undone.`)) return;
      const result = await deleteReport(reportId);
      if (result.error) toast.error(result.error);
      else {
        toast.success('Submission deleted');
        refetch();
      }
    },
    [refetch]
  );

  const handleExportCSV = useCallback(() => {
    const csv = exportReportsToCSV(reports);
    if (!csv) {
      toast.error('No data to export');
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `nbsap_toolkit_${Date.now()}.csv`;
    a.click();
    toast.success('CSV exported');
  }, [reports]);

  const handleExportJSON = useCallback(() => {
    const json = exportReportsToJSON(reports);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = `nbsap_toolkit_backup_${Date.now()}.json`;
    a.click();
    toast.success('JSON backup exported');
  }, [reports]);

  const handleImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      const result = await importReportsFromJSON(text);
      if (result.error) toast.error(result.error);
      else {
        toast.success(`Imported ${result.data?.imported} records`);
        refetch();
      }
    },
    [refetch]
  );

  const toolCounts: Record<string, number> = {};
  reports.forEach(r => {
    toolCounts[r.tool_id] = (toolCounts[r.tool_id] || 0) + 1;
  });

  if (activeTool && !showSuccess) {
    return (
      <ReportForm
        key={resumeDraft?.id ?? activeTool.id}
        tool={activeTool}
        initialDraft={resumeDraft}
        onBack={() => {
          setActiveTool(null);
          setShowSuccess(false);
          setResumeDraft(null);
          loadDrafts();
        }}
        onSuccess={() => {
          setShowSuccess(true);
          setResumeDraft(null);
          loadDrafts();
          refetch();
        }}
      />
    );
  }
  if (activeTool && showSuccess) {
    return (
      <SuccessScreen
        tool={activeTool}
        onAnother={() => setShowSuccess(false)}
        onBack={() => {
          setActiveTool(null);
          setShowSuccess(false);
        }}
      />
    );
  }

  return (
    <div>
      {/* Info banner */}
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          padding: '14px 18px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          borderLeft: '4px solid #0ea5e9',
        }}
      >
        <span style={{ fontSize: '1.5rem' }}>📝</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
            Integrated Reporting Modules (T01–T07)
          </div>
          <div style={{ fontSize: '0.73rem', color: '#94a3b8', marginTop: 2 }}>
            Structured templates linked to NBSAP targets and the 5-tier data pipeline. Each
            submission automatically updates target progress and indicators.
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <span
            style={{
              fontSize: '0.65rem',
              padding: '3px 9px',
              borderRadius: 10,
              background: '#dcfce7',
              color: '#166534',
              fontWeight: 700,
              fontFamily: "'DM Mono', monospace",
            }}
          >
            Auto-Update
          </span>
          {['Quarterly', 'Biannual', 'Annual'].map(f => (
            <span
              key={f}
              style={{
                fontSize: '0.65rem',
                padding: '3px 9px',
                borderRadius: 10,
                background:
                  f === 'Quarterly' ? '#dcfce7' : f === 'Biannual' ? '#dbeafe' : '#fef9c3',
                color: f === 'Quarterly' ? '#166534' : f === 'Biannual' ? '#1e40af' : '#854d0e',
                fontWeight: 700,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* M03: drafts — resume on any device */}
      {drafts.length > 0 && (
        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '14px 18px',
            marginBottom: 18,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 8 }}>
            Your drafts ({drafts.length})
          </div>
          {drafts.map(d => {
            const t = TOOLKIT_TOOLS.find(x => x.id === d.tool_id);
            const who = d.form_data?.stakeholder
              ? (institutionNames.get(d.form_data.stakeholder) ?? d.form_data.stakeholder)
              : 'No stakeholder chosen yet';
            return (
              <div
                key={d.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '7px 0',
                  borderTop: '1px solid #f1f5f9',
                  fontSize: '0.8rem',
                }}
              >
                <span>{t?.icon}</span>
                <span style={{ flex: 1 }}>
                  <strong>{t?.name ?? d.tool_id}</strong> · {who}
                  {d.form_data?.period ? ` · ${d.form_data.period}` : ''}
                  <span style={{ color: '#94a3b8' }}>
                    {' '}
                    · saved {new Date(d.updated_at).toLocaleString()}
                  </span>
                </span>
                <button
                  onClick={() => {
                    if (!t) return;
                    setResumeDraft(d);
                    setShowSuccess(false);
                    setActiveTool(t);
                  }}
                  style={{
                    background: '#1e3a5f',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Resume
                </button>
                <button
                  onClick={async () => {
                    if (!window.confirm('Delete this draft and its attached files?')) return;
                    const r = await deleteDraft(d);
                    if (r.error) toast.error(r.error);
                    else toast.success('Draft deleted');
                    loadDrafts();
                  }}
                  aria-label="Delete draft"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#f43f5e',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                >
                  🗑
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Tool cards grid — responsive */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 14,
          marginBottom: 28,
        }}
      >
        {TOOLKIT_TOOLS.map(t => {
          const cnt = toolCounts[t.id] || 0;
          return (
            <div
              key={t.id}
              onClick={() => {
                setResumeDraft(null); // a tool card always starts a new report
                setActiveTool(t);
                setShowSuccess(false);
              }}
              style={{
                background: '#fff',
                borderRadius: 14,
                border: '1px solid #e2e8f0',
                borderTop: `3px solid ${t.accent}`,
                padding: 18,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
              }}
            >
              <span style={{ fontSize: '1.6rem', marginBottom: 10, display: 'block' }}>
                {t.icon}
              </span>
              <div
                style={{
                  fontSize: '0.62rem',
                  color: t.accent,
                  fontFamily: "'DM Mono', monospace",
                  marginBottom: 4,
                  letterSpacing: '0.08em',
                }}
              >
                {t.id} · {t.frequency}
              </div>
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  lineHeight: 1.3,
                  marginBottom: 4,
                }}
              >
                {t.name}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 10 }}>
                → {t.output}
              </div>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span
                  style={{
                    fontSize: '0.62rem',
                    padding: '2px 7px',
                    borderRadius: 8,
                    background: `${t.accent}22`,
                    color: t.accent,
                    fontWeight: 600,
                    fontFamily: "'DM Mono', monospace",
                  }}
                >
                  {t.frequency}
                </span>
                {cnt > 0 && (
                  <span style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 700 }}>
                    ✓ {cnt} submitted
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Submissions section */}
      <div
        style={{
          background: '#fff',
          borderRadius: 14,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        {/* Sub-tabs */}
        <div
          style={{ display: 'flex', gap: 2, borderBottom: '1px solid #e2e8f0', padding: '0 16px' }}
        >
          {[
            ['submissions', '🗂 Submissions'],
            ['analytics', '📊 Analytics'],
          ].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setActiveSubTab(k as 'submissions' | 'analytics')}
              style={{
                padding: '9px 16px',
                border: 'none',
                borderBottom: activeSubTab === k ? '2px solid #0ea5e9' : '2px solid transparent',
                marginBottom: -1,
                background: 'none',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                color: activeSubTab === k ? '#0ea5e9' : '#94a3b8',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {l}
            </button>
          ))}
        </div>

        {activeSubTab === 'submissions' && (
          <div style={{ padding: 16 }}>
            {/* Filter row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
                marginBottom: 14,
              }}
            >
              <select
                value={toolFilter}
                onChange={e => setToolFilter(e.target.value)}
                style={{
                  padding: '7px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  fontSize: '0.8rem',
                  fontFamily: "'DM Sans', sans-serif",
                  outline: 'none',
                  background: '#fff',
                }}
              >
                <option value="ALL">All Tools</option>
                {TOOLKIT_TOOLS.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.id} – {t.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleExportCSV}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  border: '1.5px solid #0ea5e9',
                  borderRadius: 8,
                  color: '#0ea5e9',
                  background: 'transparent',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                📥 Export CSV
              </button>
              <button
                onClick={handleExportJSON}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  border: '1.5px solid #8b5cf6',
                  borderRadius: 8,
                  color: '#8b5cf6',
                  background: 'transparent',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                📦 Export JSON
              </button>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  border: '1.5px solid #10b981',
                  borderRadius: 8,
                  color: '#10b981',
                  background: 'transparent',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                📂 Import JSON
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={handleImport}
                />
              </label>
            </div>

            {loading ? (
              <div
                style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}
              >
                Loading…
              </div>
            ) : reports.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📥</div>
                <p style={{ fontSize: '0.85rem' }}>
                  No submissions yet. Use a reporting tool above.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {[
                        'Tool',
                        'NBSAP Target',
                        'Stakeholder · Indicator',
                        'Date',
                        'Status',
                        'Submitted By',
                        '',
                      ].map(h => (
                        <th
                          key={h}
                          style={{
                            padding: '10px 14px',
                            textAlign: 'left',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            color: '#94a3b8',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(r => {
                      const tool = TOOLKIT_TOOLS.find(t => t.id === r.tool_id);
                      // M02 workflow state (older rows fall back to the derived status).
                      const ws =
                        r.workflow_status ??
                        (r.status === 'approved'
                          ? 'published'
                          : r.status === 'rejected'
                            ? 'rejected'
                            : 'submitted');
                      const statusConf = {
                        draft: { bg: '#f1f5f9', color: '#475569', label: 'Draft' },
                        submitted: { bg: '#fef9c3', color: '#854d0e', label: '⏳ In validation' },
                        in_validation: {
                          bg: '#e0f2fe',
                          color: '#0369a1',
                          label: '⏳ In validation',
                        },
                        returned: { bg: '#ffedd5', color: '#9a3412', label: '↩ Returned' },
                        published: { bg: '#dcfce7', color: '#166534', label: '✓ Published' },
                        rejected: { bg: '#fee2e2', color: '#991b1b', label: '✕ Rejected' },
                      }[ws];
                      const canResubmit =
                        ws === 'returned' && !!currentUser && r.submitted_by === currentUser.id;
                      const keyField = Object.entries(r.form_data || {}).find(([k]) =>
                        [
                          'district',
                          'institution',
                          'company',
                          'area_name',
                          'community',
                          'study_title',
                        ].includes(k)
                      );
                      return (
                        <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '11px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: '1.1rem' }}>{tool?.icon}</span>
                              <div>
                                <div
                                  style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.78rem' }}
                                >
                                  {r.tool_id}
                                </div>
                                <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                                  {tool?.frequency}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '11px 14px', maxWidth: 180 }}>
                            {r.nbsap_target_id ? (
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>🎯</span>
                                <div>
                                  <div
                                    style={{
                                      fontSize: '0.73rem',
                                      fontWeight: 600,
                                      color: '#0f172a',
                                      lineHeight: 1.3,
                                    }}
                                  >
                                    T{r.nbsap_target_id}
                                    {r.nbsap_target?.title
                                      ? `: ${r.nbsap_target.title.length > 32 ? r.nbsap_target.title.slice(0, 32) + '…' : r.nbsap_target.title}`
                                      : ''}
                                  </div>
                                  <div
                                    style={{ fontSize: '0.62rem', color: '#10b981', marginTop: 2 }}
                                  >
                                    {r.nbsap_target?.goal ? `Goal ${r.nbsap_target.goal} · ` : ''}
                                    Linked
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>—</div>
                            )}
                          </td>
                          <td
                            style={{
                              padding: '11px 14px',
                              color: '#94a3b8',
                              fontFamily: "'DM Mono', monospace",
                              fontSize: '0.72rem',
                            }}
                          >
                            {new Date(r.submitted_at).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <span
                              style={{
                                background: statusConf.bg,
                                color: statusConf.color,
                                fontSize: '0.62rem',
                                padding: '2px 8px',
                                borderRadius: 8,
                                fontWeight: 700,
                                fontFamily: "'DM Mono', monospace",
                              }}
                            >
                              {statusConf.label}
                            </span>
                            {ws === 'returned' && r.review_note && (
                              <div
                                title={r.review_note}
                                style={{
                                  fontSize: '0.66rem',
                                  color: '#9a3412',
                                  marginTop: 3,
                                  maxWidth: 180,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {r.review_note}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '11px 14px', maxWidth: 200 }}>
                            {(() => {
                              const fd = r.form_data || {};
                              const shKey = fd.stakeholder as string | undefined;
                              const shName = shKey ? institutionNames.get(shKey) : undefined;
                              const shInfo = shName ? { name: shName } : null;
                              const indInfo = fd.indicator_info as
                                { name?: string } | null | undefined;
                              const indName =
                                indInfo?.name ||
                                (fd.indicator ? `Indicator #${fd.indicator}` : null);
                              const fallbackField = keyField
                                ? `${formatFieldLabel(keyField[0])}: ${formatFieldValue(keyField[1])}`
                                : null;
                              return (
                                <div>
                                  {shInfo ? (
                                    <div
                                      style={{
                                        fontSize: '0.73rem',
                                        fontWeight: 600,
                                        color: '#0f172a',
                                        lineHeight: 1.3,
                                      }}
                                    >
                                      {shInfo.name.length > 30
                                        ? shInfo.name.slice(0, 30) + '…'
                                        : shInfo.name}
                                    </div>
                                  ) : fallbackField ? (
                                    <div style={{ fontSize: '0.73rem', color: '#475569' }}>
                                      {fallbackField}
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>—</div>
                                  )}
                                  {indName && (
                                    <div
                                      style={{
                                        fontSize: '0.62rem',
                                        color: '#10b981',
                                        marginTop: 2,
                                        lineHeight: 1.3,
                                      }}
                                    >
                                      {String(indName).length > 38
                                        ? String(indName).slice(0, 38) + '…'
                                        : String(indName)}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          <td
                            style={{ padding: '11px 14px', color: '#475569', fontSize: '0.75rem' }}
                          >
                            {r.submitted_by_profile?.full_name ||
                              r.submitted_by_profile?.email ||
                              '—'}
                          </td>
                          <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                            {canResubmit && (
                              <button
                                onClick={() => setResubmitTarget(r)}
                                style={{
                                  background: '#1e3a5f',
                                  color: '#fff',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  padding: '4px 9px',
                                  borderRadius: 6,
                                  marginRight: 6,
                                }}
                              >
                                Correct &amp; resubmit
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(r.id, r.tool_name)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#f43f5e',
                                cursor: 'pointer',
                                fontSize: '0.78rem',
                                padding: '3px 6px',
                                borderRadius: 5,
                              }}
                            >
                              🗑
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'analytics' && (
          <div style={{ padding: 16 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
                marginBottom: 16,
              }}
            >
              {[
                { label: 'Total Submissions', val: reports.length, color: '#0ea5e9' },
                {
                  label: 'Approved',
                  val: reports.filter(r => r.status === 'approved').length,
                  color: '#10b981',
                },
                {
                  label: 'Pending Review',
                  val: reports.filter(r => r.status === 'pending').length,
                  color: '#f59e0b',
                },
              ].map(s => (
                <div
                  key={s.label}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: 16,
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: '1.8rem',
                      fontWeight: 700,
                      fontFamily: "'Playfair Display', serif",
                      color: s.color,
                    }}
                  >
                    {s.val}
                  </div>
                  <div
                    style={{
                      fontSize: '0.68rem',
                      color: '#94a3b8',
                      fontFamily: "'DM Mono', monospace",
                      marginTop: 4,
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
            {TOOLKIT_TOOLS.map(t => {
              const cnt = reports.filter(r => r.tool_id === t.id).length;
              const max = Math.max(
                ...TOOLKIT_TOOLS.map(tt => reports.filter(r => r.tool_id === tt.id).length),
                1
              );
              return (
                <div key={t.id} style={{ marginBottom: 10 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.75rem',
                      marginBottom: 3,
                    }}
                  >
                    <span>
                      {t.icon} {t.id} · {t.name.split(' ').slice(0, 2).join(' ')}
                    </span>
                    <span
                      style={{
                        color: t.accent,
                        fontWeight: 700,
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      {cnt}
                    </span>
                  </div>
                  <div style={{ background: '#f1f5f9', borderRadius: 4, height: 7 }}>
                    <div
                      style={{
                        background: t.accent,
                        width: `${(cnt / max) * 100}%`,
                        height: 7,
                        borderRadius: 4,
                        transition: 'width 0.6s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {resubmitTarget && (
        <ResubmitReportModal
          report={resubmitTarget}
          onClose={() => setResubmitTarget(null)}
          onDone={() => {
            setResubmitTarget(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}
