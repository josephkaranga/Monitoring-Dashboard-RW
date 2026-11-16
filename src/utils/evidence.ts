// ============================================================
// Supporting evidence rules (Reporting Toolkit)
// Requested 15 Nov 2026: define evidence further for quality control.
// Every file must be classified so validators can check that the
// evidence matches the claim. First set of types for REMA to refine.
// ============================================================

export const EVIDENCE_TYPES = [
  {
    value: 'official_report',
    label: 'Official report or publication',
    hint: 'Signed or published institutional report',
  },
  {
    value: 'dataset',
    label: 'Dataset or data table',
    hint: 'Raw or processed figures (Excel, CSV)',
  },
  {
    value: 'policy_document',
    label: 'Policy, law or plan',
    hint: 'Gazetted instrument, strategy or approved plan',
  },
  {
    value: 'financial_record',
    label: 'Financial record',
    hint: 'Budget, disbursement or expenditure statement',
  },
  {
    value: 'field_evidence',
    label: 'Field or photo evidence',
    hint: 'Dated, geo-referenced photographs or survey sheets',
  },
  {
    value: 'map_gis',
    label: 'Map or GIS output',
    hint: 'Map export, shapefile summary or remote-sensing result',
  },
  {
    value: 'meeting_record',
    label: 'Minutes or attendance record',
    hint: 'Signed minutes, attendance lists, MoUs',
  },
  { value: 'other', label: 'Other (describe)', hint: 'Explain in the description field' },
] as const;

export type EvidenceType = (typeof EVIDENCE_TYPES)[number]['value'];

export const EVIDENCE_ACCEPTED_EXT = [
  'pdf',
  'xlsx',
  'xls',
  'csv',
  'doc',
  'docx',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
] as const;
export const EVIDENCE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB per file
export const EVIDENCE_MAX_FILES = 10;

export interface EvidenceLike {
  name: string;
  size: number;
  evidence_type?: string;
  description?: string;
}

export function fileExtension(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

/** Why a new file cannot be attached, or null if it can. */
export function evidenceFileProblem(
  file: { name: string; size: number },
  existing: EvidenceLike[]
): string | null {
  const ext = fileExtension(file.name);
  if (!(EVIDENCE_ACCEPTED_EXT as readonly string[]).includes(ext)) {
    return `${file.name}: .${ext || '?'} files are not accepted`;
  }
  if (file.size > EVIDENCE_MAX_BYTES) return `${file.name} is larger than 10 MB`;
  if (file.size === 0) return `${file.name} is empty`;
  if (existing.some(a => a.name === file.name && a.size === file.size))
    return `${file.name} is already attached`;
  if (existing.length >= EVIDENCE_MAX_FILES)
    return `At most ${EVIDENCE_MAX_FILES} files per report`;
  return null;
}

/** True when the file has a type, and a description if the type is "other". */
export function isEvidenceClassified(a: EvidenceLike): boolean {
  if (!a.evidence_type || !EVIDENCE_TYPES.some(t => t.value === a.evidence_type)) return false;
  if (a.evidence_type === 'other' && !a.description?.trim()) return false;
  return true;
}

/** Why the evidence set cannot be submitted, or null if it can. */
export function evidenceSubmissionProblem(attachments: EvidenceLike[]): string | null {
  if (attachments.length === 0) return 'Attach at least one supporting evidence file';
  const n = attachments.filter(a => !isEvidenceClassified(a)).length;
  if (n > 0) {
    return n === 1
      ? 'Choose an evidence type for the attached file (and describe it if you chose "Other")'
      : `Choose an evidence type for each of the ${n} unclassified files (and describe any marked "Other")`;
  }
  return null;
}

export function evidenceTypeLabel(value?: string): string | undefined {
  return EVIDENCE_TYPES.find(t => t.value === value)?.label;
}
