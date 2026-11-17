// M05 — the one-page indicator reference sheet, generated from the
// reference data (v_indicator_reference). Layout follows the Framework's
// Indicator Reference Sheets (May 2026, 5.10) and the UNEP-WCMC
// factsheet idea: what is measured, how, from where, how often, by whom,
// broken down how, and how it is validated.
import { jsPDF } from 'jspdf';
import type { DisaggregationDimension, IndicatorReference } from '../types/index';

export interface SheetSection {
  label: string;
  value: string;
}

const KM_GBF_LABEL: Record<string, string> = {
  headline: 'Headline',
  component: 'Component',
  complementary: 'Complementary',
  binary: 'Binary',
};

const dash = (v: string | null | undefined) => (v && v.trim() ? v.trim() : '—');

export function sheetTitle(ref: IndicatorReference): string {
  return `Indicator ${ref.id}: ${ref.name}`;
}

export function sheetSections(
  ref: IndicatorReference,
  dimensions: DisaggregationDimension[]
): SheetSection[] {
  const dimLabel = (code: string) => dimensions.find(d => d.code === code)?.label ?? code;
  const breakdowns =
    ref.disaggregations == null
      ? '— (not decided)'
      : ref.disaggregations.length === 0
        ? 'None required on reports'
        : `Reports must give: ${ref.disaggregations.map(dimLabel).join(', ')}`;
  const route = ref.validation_route.length
    ? ref.validation_route.map((s, i) => `${i + 1}. ${s.name} (${s.condition})`).join('\n')
    : '—';
  const lead = ref.lead_institution_name
    ? `${ref.lead_institution_name}${ref.lead_institution_code ? ` (${ref.lead_institution_code})` : ''}`
    : null;
  const others = (ref.responsible ?? []).filter(r => r !== ref.lead_institution_code);

  return [
    {
      label: 'NBSAP target',
      value: ref.nbsap_target_id
        ? `Target ${ref.nbsap_target_id}${ref.target_title ? `: ${ref.target_title}` : ''}`
        : '—',
    },
    {
      label: 'Classification',
      value: `KM-GBF: ${KM_GBF_LABEL[ref.km_gbf_type] ?? ref.km_gbf_type}${ref.km_gbf ? ` (${ref.km_gbf})` : ''} · National: ${
        ref.national_tier ? `Tier ${ref.national_tier} — ${dash(ref.national_tier_name)}` : '—'
      }`,
    },
    { label: 'Definition', value: dash(ref.definition) },
    { label: 'Unit', value: dash(ref.unit) },
    { label: 'Formula', value: dash(ref.formula) },
    { label: 'Methodology', value: dash(ref.methodology) },
    { label: 'Data source', value: dash(ref.data_source) },
    { label: 'Frequency', value: dash(ref.periodicity) },
    {
      label: 'Lead institution',
      value: `${dash(lead)}${others.length ? `\nAlso responsible: ${others.join(', ')}` : ''}`,
    },
    { label: 'Disaggregation', value: breakdowns },
    ...(ref.sheet_disaggregation
      ? [{ label: 'Framework disaggregation', value: ref.sheet_disaggregation }]
      : []),
    {
      label: 'Baseline and targets',
      value:
        [
          ref.baseline && `Baseline: ${ref.baseline}`,
          ref.midterm && `Mid-term (2027): ${ref.midterm}`,
          ref.target_2030 && `2030: ${ref.target_2030}`,
        ]
          .filter(Boolean)
          .join('\n') || '—',
    },
    { label: 'Validation route', value: route },
    { label: 'RBIS code', value: dash(ref.rbis_code) },
  ];
}

export function sheetStatusLine(ref: IndicatorReference): string {
  const status =
    ref.reference_status === 'approved'
      ? `Approved${ref.reference_approved_at ? ` ${ref.reference_approved_at.slice(0, 10)}` : ''}`
      : 'Draft — awaiting TWG approval';
  return ref.gaps.length ? `${status} · Missing: ${ref.gaps.join(', ')}` : status;
}

export function sheetFileName(ref: IndicatorReference): string {
  const slug = ref.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
  return `indicator-${ref.id}-${slug}.pdf`;
}

/**
 * Build the one-page PDF. The text shrinks until everything fits on one
 * A4 page (the PDF requirement is a one-page sheet).
 */
export function buildIndicatorSheetPdf(
  ref: IndicatorReference,
  dimensions: DisaggregationDimension[],
  generatedAt = new Date()
): jsPDF {
  const sections = sheetSections(ref, dimensions);
  const PAGE_H = 297;
  const MARGIN = 14;
  const LABEL_W = 42;
  const VALUE_W = 210 - MARGIN * 2 - LABEL_W;

  for (let size = 9.5; size >= 5.5; size -= 0.5) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const line = size * 0.42;
    let y = MARGIN;

    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, 210, 9, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text('Rwanda NBSAP 2025–2030 · Indicator Reference Sheet', MARGIN, 6);
    y = 16;

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(size + 4);
    const title = doc.splitTextToSize(sheetTitle(ref), 210 - MARGIN * 2) as string[];
    doc.text(title, MARGIN, y);
    y += title.length * (size + 4) * 0.42 + 1.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size - 1);
    doc.setTextColor(
      ref.reference_status === 'approved' ? 22 : 146,
      ref.reference_status === 'approved' ? 101 : 64,
      ref.reference_status === 'approved' ? 52 : 14
    );
    doc.text(doc.splitTextToSize(sheetStatusLine(ref), 210 - MARGIN * 2) as string[], MARGIN, y);
    y += line * 2;

    doc.setFontSize(size);
    for (const s of sections) {
      const value = doc.splitTextToSize(s.value, VALUE_W) as string[];
      doc.setDrawColor(226, 232, 240);
      doc.line(MARGIN, y - line * 0.75, 210 - MARGIN, y - line * 0.75);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(s.label, MARGIN, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(value, MARGIN + LABEL_W, y);
      y += Math.max(1, value.length) * line + line * 0.6;
    }

    const footer = [
      ref.sheet_source ? `Framework sheet: ${ref.sheet_source}` : null,
      ref.reference_note,
      `Generated ${generatedAt.toISOString().slice(0, 16).replace('T', ' ')} UTC from the NBSAP monitoring system.`,
    ].filter(Boolean) as string[];
    doc.setFontSize(Math.max(5, size - 2));
    doc.setTextColor(100, 116, 139);
    const foot = doc.splitTextToSize(footer.join(' '), 210 - MARGIN * 2) as string[];
    const footH = foot.length * Math.max(5, size - 2) * 0.42;

    if (y + footH + 4 <= PAGE_H - MARGIN || size <= 5.5) {
      doc.text(foot, MARGIN, PAGE_H - MARGIN - footH + 2);
      return doc;
    }
  }
  throw new Error('unreachable');
}

export function downloadIndicatorSheet(
  ref: IndicatorReference,
  dimensions: DisaggregationDimension[]
): void {
  buildIndicatorSheetPdf(ref, dimensions).save(sheetFileName(ref));
}
