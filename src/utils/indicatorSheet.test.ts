import { describe, expect, it } from 'vitest';
import type { DisaggregationDimension, IndicatorReference } from '../types/index';
import {
  buildIndicatorSheetPdf,
  sheetFileName,
  sheetSections,
  sheetStatusLine,
} from './indicatorSheet';

const dims: DisaggregationDimension[] = [
  { code: 'sex', label: 'Sex', description: null, fields: [], ordinal: 1 },
  { code: 'youth', label: 'Youth', description: null, fields: [], ordinal: 3 },
];

const ref = (over: Partial<IndicatorReference> = {}): IndicatorReference => ({
  id: 34,
  name: 'Women and Youth in Biodiversity Decision-Making (%)',
  definition: 'Proportion of women and youth among participants in biodiversity governance bodies',
  km_gbf_type: 'headline',
  km_gbf: 'GBF Target 22',
  national_tier: 1,
  national_tier_name: 'Headline (mandatory)',
  nbsap_target_id: 22,
  target_title: 'Participation and inclusion',
  unit: '%',
  formula: 'Women and youth among participants / all participants x 100',
  methodology: '1. Collect attendance registers 2. Count women and youth',
  data_source: 'District reports, REMA records',
  periodicity: 'Annual',
  lead_institution_id: 7,
  lead_institution_code: 'REMA',
  lead_institution_name: 'Rwanda Environment Management Authority',
  responsible: ['REMA', 'MINALOC', 'RYBN'],
  rbis_code: null,
  disaggregations: ['sex', 'youth'],
  baseline: '30%',
  midterm: '40%',
  target_2030: '50%',
  requires_statistical_validation: false,
  validation_route: [
    { code: 'district', name: 'District validation', condition: 'reports about a district' },
    { code: 'rema', name: 'REMA verification and publication', condition: 'every report' },
  ],
  in_use: true,
  duplicate_of: null,
  reference_status: 'draft',
  reference_note: 'Drafted for TWG approval.',
  reference_approved_at: null,
  gaps: ['RBIS code'],
  complete: false,
  sheet_methodology: null,
  sheet_disaggregation: '• By stakeholder type (women, youth, persons with disabilities)',
  sheet_data_sources: null,
  sheet_baseline_and_targets: null,
  sheet_frequency: null,
  sheet_lead: 'REMA, MIGEPROF',
  sheet_collaborators: null,
  sheet_source: 'Monitoring Framework (May 2026), 5.10',
  ...over,
});

describe('indicator reference sheet', () => {
  it('shows every field the PDF requires', () => {
    const labels = sheetSections(ref(), dims).map(s => s.label);
    for (const required of [
      'Definition',
      'Formula',
      'Data source',
      'Frequency',
      'Lead institution',
      'Validation route',
      'RBIS code',
      'Disaggregation',
      'Classification',
    ]) {
      expect(labels).toContain(required);
    }
  });

  it('states the breakdowns reports must give, the tiers and the route', () => {
    const byLabel = Object.fromEntries(sheetSections(ref(), dims).map(s => [s.label, s.value]));
    expect(byLabel.Disaggregation).toBe('Reports must give: Sex, Youth');
    expect(byLabel.Classification).toBe(
      'KM-GBF: Headline (GBF Target 22) · National: Tier 1 — Headline (mandatory)'
    );
    expect(byLabel['Validation route']).toBe(
      '1. District validation (reports about a district)\n2. REMA verification and publication (every report)'
    );
    expect(byLabel['Lead institution']).toBe(
      'Rwanda Environment Management Authority (REMA)\nAlso responsible: MINALOC, RYBN'
    );
    expect(byLabel['RBIS code']).toBe('—');
  });

  it('says what is missing and that it is a draft', () => {
    expect(sheetStatusLine(ref())).toBe('Draft — awaiting TWG approval · Missing: RBIS code');
    expect(
      sheetStatusLine(
        ref({
          reference_status: 'approved',
          reference_approved_at: '2027-01-15T10:00:00Z',
          gaps: [],
        })
      )
    ).toBe('Approved 2027-01-15');
  });

  it('Done when: a one-page PDF can be generated', () => {
    const doc = buildIndicatorSheetPdf(ref(), dims, new Date('2026-11-17T09:00:00Z'));
    expect(doc.getNumberOfPages()).toBe(1);
    const bytes = doc.output('arraybuffer');
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
  });

  it('still fits one page when every field is long', () => {
    const long = 'Very long text that goes on. '.repeat(40);
    const doc = buildIndicatorSheetPdf(
      ref({ definition: long, methodology: long, formula: long, data_source: long }),
      dims
    );
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it('names the file after the indicator', () => {
    expect(sheetFileName(ref())).toBe(
      'indicator-34-women-and-youth-in-biodiversity-decision-making.pdf'
    );
  });
});
