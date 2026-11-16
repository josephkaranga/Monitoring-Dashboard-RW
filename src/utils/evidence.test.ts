import { describe, it, expect } from 'vitest';
import {
  EVIDENCE_MAX_BYTES,
  EVIDENCE_MAX_FILES,
  evidenceFileProblem,
  evidenceSubmissionProblem,
  evidenceTypeLabel,
  isEvidenceClassified,
} from './evidence';

describe('evidenceFileProblem', () => {
  it('accepts documents, spreadsheets, CSV and images', () => {
    for (const name of ['a.pdf', 'b.XLSX', 'c.csv', 'd.docx', 'e.jpg', 'f.png']) {
      expect(evidenceFileProblem({ name, size: 100 }, [])).toBeNull();
    }
  });

  it('rejects other types, empty and oversized files', () => {
    expect(evidenceFileProblem({ name: 'x.exe', size: 100 }, [])).toMatch(/not accepted/);
    expect(evidenceFileProblem({ name: 'noext', size: 100 }, [])).toMatch(/not accepted/);
    expect(evidenceFileProblem({ name: 'a.pdf', size: 0 }, [])).toMatch(/empty/);
    expect(evidenceFileProblem({ name: 'a.pdf', size: EVIDENCE_MAX_BYTES + 1 }, [])).toMatch(
      /10 MB/
    );
  });

  it('rejects duplicates and more than the maximum number of files', () => {
    expect(evidenceFileProblem({ name: 'a.pdf', size: 5 }, [{ name: 'a.pdf', size: 5 }])).toMatch(
      /already/
    );
    const full = Array.from({ length: EVIDENCE_MAX_FILES }, (_, i) => ({
      name: `f${i}.pdf`,
      size: 1,
    }));
    expect(evidenceFileProblem({ name: 'new.pdf', size: 1 }, full)).toMatch(/At most/);
  });
});

describe('evidence classification', () => {
  it('requires a known type, and a description for "other"', () => {
    expect(isEvidenceClassified({ name: 'a', size: 1 })).toBe(false);
    expect(isEvidenceClassified({ name: 'a', size: 1, evidence_type: 'made_up' })).toBe(false);
    expect(isEvidenceClassified({ name: 'a', size: 1, evidence_type: 'dataset' })).toBe(true);
    expect(isEvidenceClassified({ name: 'a', size: 1, evidence_type: 'other' })).toBe(false);
    expect(
      isEvidenceClassified({ name: 'a', size: 1, evidence_type: 'other', description: '  ' })
    ).toBe(false);
    expect(
      isEvidenceClassified({
        name: 'a',
        size: 1,
        evidence_type: 'other',
        description: 'Radio script',
      })
    ).toBe(true);
  });

  it('blocks submission without evidence or with unclassified files', () => {
    expect(evidenceSubmissionProblem([])).toMatch(/at least one/);
    expect(
      evidenceSubmissionProblem([
        { name: 'a', size: 1, evidence_type: 'dataset' },
        { name: 'b', size: 1 },
        { name: 'c', size: 1 },
      ])
    ).toMatch(/2 unclassified/);
    expect(
      evidenceSubmissionProblem([{ name: 'a', size: 1, evidence_type: 'official_report' }])
    ).toBeNull();
  });

  it('labels types for validators', () => {
    expect(evidenceTypeLabel('financial_record')).toBe('Financial record');
    expect(evidenceTypeLabel(undefined)).toBeUndefined();
  });
});
